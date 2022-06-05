import type { AMQPConsumer } from "@cloudamqp/amqp-client";
import Emittery from "emittery";
import { randomUUID } from "node:crypto";
import type { Message } from "revolt.js";
import type { Nullable } from "revolt.js/dist/util/null";
import { consume } from "./amqp";
import type { Mixtape } from "./client";
import { COLORS, ROUTING_KEYS } from "./constants";
import { ErrorReturnedException } from "./error/error_type_returned";
import { create_functional_timeout, format_track, FunctionalTimeout } from "./functions";
import type {
    Filter,
    FilterType,
    ParticipantJoinedEvent,
    ParticipantLeftEvent,
    PlayerEvent,
    StandardResponse,
    Track,
    TrackEndEvent,
    TrackEndReason,
    TrackStart,
    UpdateEvent,
} from "./types";

enum LoopMode {
    Off,
    Queue,
    Track,
}

const mayStartNext: Record<TrackEndReason, boolean> = {
    CLEANUP: false,
    FINISHED: true,
    LOAD_FAILED: true,
    REPLACED: false,
    STOPPED: false,
};

/* TODO: replace this with guild settings */
const VOTER_PERCENTAGE = 75;

export type Effect = "nightcore" | "slowed";

export const EFFECT_TO_FILTER: Record<Effect, Filter[]> = {
    nightcore: [{
        type: "timescale",
        pitch: 1.125,
        speed: 1.125,
    }],
    slowed: [{
        type: "timescale",
        speed: 0.83,
    }],
};

export const EFFECT_TO_FILTER_TYPE: Record<Effect, FilterType> = {
    nightcore: "timescale",
    slowed: "timescale",
};

export class Player extends Emittery<{
    track_start: TrackStart;
    track_end: TrackEndEvent;
    queue_empty: never;
    participant_joined: ParticipantJoinedEvent;
    participant_left: ParticipantLeftEvent;
    update: UpdateEvent;
}> {
    channel_id: Nullable<string> = null;
    participants: Set<string> = new Set();

    /* stuff for queue */
    next: PlayerTrack[] = [];
    previous: PlayerTrack[] = [];
    current: Nullable<PlayerTrack> = null;

    /* basic properties */
    position: number = 0;
    bitrate: number = -1;
    timestamp: Nullable<number> = null;
    connected: boolean = false;
    paused: boolean = false;
    running: boolean = false;
    volume: number = 100;
    loop: LoopMode = LoopMode.Off;
    effects: Set<"nightcore" | "slowed"> = new Set();
    votes: Set<string> = new Set();

    #alone: Alone | null;
    #player_events: { consumer: AMQPConsumer; queue: string } | null = null;

    constructor(readonly mixtape: Mixtape, readonly server_id: string, public text_channel_id: string | null = null) {
        super();

        this.on("track_start", async () => {
            this.running = true;
            try {
                await this.text_channel?.sendMessage({
                    content: " ",
                    embeds: [
                        {
                            description: `Now playing ${format_track(this.current.info)} <@${this.current.requester}>`,
                            colour: COLORS.PRIMARY,
                        },
                    ],
                });
            } catch (e) {
                console.error(`[${this.log_scope}] failed to send now playing message:`, e);
                console.log("FUCK YOU AXIOS");
            }
        });

        this.on("track_end", async ({ end_reason }) => {
            this.votes.clear();

            if (!mayStartNext[end_reason]) {
                this.current = null;
                this.running = false;
                return;
            }

            if (this.loop === LoopMode.Track) {
                this.next.unshift(this.current);
            } else {
                this.previous.push(this.current);
            }

            this.current = null;
            this.start_next();
        });

        this.on("queue_empty", async () => {
            this.running = false;

            try {
                await this.text_channel?.sendMessage({
                    content: " ",
                    embeds: [
                        {
                            description:
                                `There are no more songs in the queue! Use **mix play** to queue some more music`,
                            colour: COLORS.PRIMARY,
                        },
                    ],
                });
            } catch (e) {
                console.log("FUCK YOU AXIOS");
            }
        });

        this.on("participant_joined", async ({ id }) => {
            this.participants.add(id);
            await this.clear_alone_timeout();
        });

        this.on("participant_left", async ({ id }) => {
            this.votes.delete(id);
            this.participants.delete(id);
            if (await this.is_alone()) {
                await this.do_alone_timeout();
            }
        });

        this.on("update", update => {
            this.position = update.position;
            this.timestamp = update.timestamp;
        });
    }

    get all_effects(): Effect[] {
        return [...this.effects];
    }

    get log_scope() {
        return `player <${this.channel_id ?? "unknown"}>`;
    }

    get listeners() {
        return [...this.participants].slice(1);
    }

    get voter_percentage() {
        return Math.floor(this.votes.size / this.listeners.length * 100);
    }

    get votes_needed() {
        return Math.round(VOTER_PERCENTAGE * this.listeners.length / 100);
    }

    get channel() {
        return this.channel_id
            ? this.mixtape.channels.get(this.channel_id)
            : null;
    }

    get text_channel() {
        return this.text_channel_id
            ? this.mixtape.channels.get(this.text_channel_id)
            : null;
    }

    async pause(state: boolean): Promise<void> {
        await this.send("pause", { state });
        this.paused = state;
    }

    apply_effect(effect: Effect): boolean {
        const enabled = !this.effects.has(effect);
        if (!enabled) {
            this.effects.delete(effect);
        } else {
            if (EFFECT_TO_FILTER_TYPE[effect] === "timescale") {
                /* we don't want conflicting timescale effects on the bot-side */
                const other_timescale = this.all_effects.find(e => EFFECT_TO_FILTER_TYPE[e] === "timescale");
                this.effects.delete(other_timescale);
            }

            this.effects.add(effect);
        }

        this.apply_effects();
        return enabled;
    }

    apply_effects() {
        const filters = this.effects.size >= 1
            /* each effect has their own set of filters */
            ? this.all_effects.flatMap(e => EFFECT_TO_FILTER[e])
            : /* no filters are to be applied */
                [];

        return this.send("apply_filters", { filters });
    }

    shuffle() {
        this.next = this.next
            .map(value => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value);
    }

    async start_next() {
        await this.stop();

        let track = this.next.shift();
        if (!track) {
            if (!this.previous.length || this.loop !== LoopMode.Queue) {
                await this.emit("queue_empty");
                return;
            }

            this.next.push(...this.previous.reverse());
            track = this.next.shift();
        }

        this.current = track;
        await this.play(track.hash);
    }

    queue(tracks: Track[], requester: string) {
        this.next.push(...tracks.map(t => ({ ...t, requester, id: randomUUID() })));
    }

    async join(channelId: string, token: string): Promise<void> {
        const body = await this.send<StandardResponse>("create_player", { channel_id: channelId, token }, false);
        if (body.error_type != null) {
            throw new ErrorReturnedException(body.error_type);
        }

        this.channel_id = channelId;
        this.connected = true;

        await this.start_event_consumer();

        /* fetch all participants from the channel. */
        await this.fetch_participants();
    }

    async leave(): Promise<void> {
        const body = await this.send<StandardResponse>("destroy_player");

        this.channel_id = null;
        await this.stop_event_consumer();

        if (body.error_type != null) {
            throw new ErrorReturnedException(body.error_type);
        }
    }

    async fetch_participants(): Promise<void> {
        const { participants, error_type } = await this.send("fetch_participants");
        if (error_type != null) {
            throw new ErrorReturnedException(error_type);
        }

        for (const participant of participants) {
            this.participants.add(participant);
        }
    }

    async play(hash: string): Promise<void> {
        const body = await this.send<StandardResponse>("play", { hash });
        if (body.error_type != null) {
            throw new ErrorReturnedException(body.error_type);
        }
    }

    async set_volume(volume: number): Promise<void> {
        const body = await this.send<StandardResponse>("volume", { volume });
        if (body.error_type != null) {
            throw new ErrorReturnedException(body.error_type);
        }

        this.volume = volume;
    }

    async stop(): Promise<void> {
        const body = await this.send<StandardResponse>("stop");
        if (body.error_type != null) {
            throw new ErrorReturnedException(body.error_type);
        }
    }

    async start_event_consumer() {
        /* create a queue for consuming player events */
        const queue = ROUTING_KEYS.PLAYER(this.mixtape.user._id, this.channel_id);
        await this.mixtape.amqp.channel.queueDeclare(queue, { autoDelete: true });
        await this.mixtape.amqp.channel.queueBind(
            queue,
            process.env.AMQP_EXCHANGE,
            ROUTING_KEYS.PLAYER(this.mixtape.user._id, this.channel_id),
        );

        /* start consuming player events from amqp broker */
        const consumer = await consume<PlayerEvent>(this.mixtape.amqp.channel, queue, msg => {
            if (msg.body.type !== "update") {
                /* these are spammy asf lol */
                console.info(`[${this.log_scope}] received event '${msg.body.type}'`);
            }

            this.emit(msg.body.type, msg.body);
        });

        this.#player_events = { consumer, queue };
    }

    async stop_event_consumer() {
        if (!this.#player_events) {
            /* nothing to stop */
            return;
        }

        this.mixtape.amqp.channel.queueDelete(this.#player_events.queue);
        await this.#player_events.consumer.cancel();
    }

    async destroy(): Promise<void> {
        try {
            await this.leave();
        } finally {
            this.mixtape.players.delete(this.server_id);
        }
    }

    async is_alone(fetch_participants = true): Promise<boolean> {
        if (fetch_participants) {
            /* update the list of participants. */
            await this.fetch_participants();
        }

        /* check if we're alone */
        if (this.participants.size > 1) {
            /* there are other people in the voice channel. */
            return false;
        }

        return true;
    }

    async do_alone_timeout() {
        /* create super special timeout */
        const timeout = create_functional_timeout();

        /* send the timeout message */
        const message = await this.text_channel?.sendMessage({
            content: " ",
            embeds: [
                {
                    description: "Oh okay, I'll leave in **15 seconds** if no one joins by then.",
                    colour: COLORS.SECONDARY,
                },
            ],
        });

        /* start timeout. */
        timeout.start(15_000, async () => {
            await message.edit({
                embeds: [
                    {
                        colour: COLORS.PRIMARY,
                        description: `Okay, I left **${this.channel?.name ?? this.channel_id}**`,
                    },
                ],
            });

            await this.do_alone_check();
        });

        this.#alone = { timeout, message };
    }

    async clear_alone_timeout(): Promise<boolean> {
        if (!this.#alone) {
            return false;
        }

        this.#alone.timeout.stop();
        await this.#alone.message.delete();

        return true;
    }

    async do_alone_check(): Promise<void> {
        const is_alone_res = await this.is_alone();
        if (typeof is_alone_res === "string") {
            return is_alone_res;
        }

        if (is_alone_res === true) {
            return this.destroy();
        }

        return null;
    }

    async send<T>(type: string, data: any = {}, identify: boolean = true): Promise<T> {
        data.type = type;
        data.bot_identifier = this.mixtape.user._id;
        if (identify) {
            if (!this.channel_id) {
                throw new Error("No channel id is present in player.");
            }

            data.channel_id = this.channel_id;
        }

        const { body } = await this.mixtape.amqp.rpc.call<T>(ROUTING_KEYS.COMMANDS, data);
        console.info(`[${this.log_scope}] got response for '${type}':`, body);

        return body;
    }
}

export interface PlayerTrack extends Track {
    requester?: string;
    id: string;
}

interface Alone {
    timeout: FunctionalTimeout;
    message: Message;
}
