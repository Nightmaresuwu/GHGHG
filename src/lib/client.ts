import type { AMQPChannel, AMQPClient } from "@cloudamqp/amqp-client";
import { Player } from "./player";

import { randomUUID } from "node:crypto";
import type EventEmitter from "node:events";
import { Client } from "revolt.js";
import { create_amqp_connection, create_rpc_client, RpcClient } from "./amqp";
import { ROUTING_KEYS } from "./constants";
import { ErrorReturnedException } from "./error/error_type_returned";
import { pluralize } from "./functions";
import { CommandLoader, create_command_loader } from "./module/command";
import { create_event_loader, Event } from "./module/event";
import type { Loader } from "./module/loader";
import type { Track } from "./types";

export class Mixtape extends Client {
    readonly players: Map<string, Player>;

    readonly commands: CommandLoader;
    readonly events: Loader<Event>;
    readonly developers: Set<string> = new Set(["01FE7TC0QTB49YR73CAGQVAH6S", "01FZ5P08W36B05M18FP3HF4PT1"]);

    amqp: { client: AMQPClient; channel: AMQPChannel; rpc: RpcClient };

    constructor() {
        super();

        this.players = new Map();

        this.commands = create_command_loader();
        this.events = create_event_loader(this, {
            /* fuck revolt.js lol */
            client: this as unknown as EventEmitter,
        });
    }

    async setup() {
        /* load all modules */
        await this.events.load_folder("events");
        await this.commands.load_folder("commands");

        /* setup amqp. */
        const { channel, client } = await create_amqp_connection(process.env.AMQP_URI);
        this.amqp = {
            client,
            channel,
            rpc: await create_rpc_client(channel, process.env.AMQP_EXCHANGE),
        };

        /* login as a bot */
        this.loginBot(process.env.REVOLT_BOT_TOKEN);
    }

    async cleanup_players(fetch_participants = true) {
        const player_count = this.players.size;
        if (!player_count) {
            return;
        }

        for (const [, player] of this.players) {
            if (!await player.is_alone(fetch_participants)) {
                continue;
            }

            try {
                await player.destroy();
            } catch (ex) {
                if (ex instanceof ErrorReturnedException) {
                    const { error_type } = ex;
                    console.warn(
                        `[${player.log_scope}] received error type '${error_type}' while attempting to destroy it.`,
                    );
                }
            }
        }

        console.info(`[revolt] cleaned up ${pluralize("player", player_count - this.players.size)}`);
    }

    async sync_players() {
        const { body } = await this.amqp.rpc.call<Sync>(ROUTING_KEYS.COMMANDS, {
            type: "sync",
            bot_identifier: this.user._id,
        });

        let synced = 0;
        for (const player_data of body.players) {
            const channel = this.channels.get(player_data.channel_id);
            if (!channel) {
                console.warn(`[revolt] unable to sync player ${player_data.channel_id} due to unknown channel.`);

                /* manually destroy player ig */
                await this.amqp.rpc.call(ROUTING_KEYS.COMMANDS, {
                    type: "destroy_player",
                    channel_id: player_data.channel_id,
                });

                continue;
            }

            const player = new Player(this, channel.server_id);
            player.channel_id = player_data.channel_id;
            player.current = { ...player_data.track, id: randomUUID() };
            player.volume = player_data.volume;
            player.running = !!player_data.track;
            player.connected = true;
            player.participants = new Set(player_data.participants);

            await player.start_event_consumer();
            await player.fetch_participants();

            this.players.set(channel.server_id, player);
            synced++;
        }

        console.info(`[revolt] synced ${pluralize("player", synced)}`);

        /* make sure to cleanup all players. */
        await this.cleanup_players(false);
    }
}

interface Sync {
    players: SyncPlayer[];
}

interface SyncPlayer {
    channel_id: string;
    track: Track | null;
    volume: number;
    participants: string[];
}
