import type { SendableEmbed } from "revolt-api";
import type { Channel, Message, Server, User } from "revolt.js";
import type { Mixtape } from "../client";
import { COLORS } from "../constants";
import type { Player } from "../player";

export function create_context(mixtape: Mixtape, message: Message, prefix: string): Context {
    return {
        prefix,
        message,
        mixtape,
        get player() {
            return mixtape.players.get(this.server._id) ?? null;
        },
        get server() {
            return message.channel.server ?? null;
        },
        get author() {
            return message.author ?? null;
        },
        get channel() {
            return message.channel ?? null;
        },
        reply(content, options = {}) {
            if (typeof content === "string") {
                options["description"] = content;
            } else {
                options = { ...content, ...options };
            }

            return message.reply({
                content: " ",
                embeds: [options],
            }, false);
        },
        reply_primary(content, options = {}) {
            return this.reply(content, { colour: COLORS.PRIMARY, ...options });
        },
        reply_secondary(content, options = {}) {
            return this.reply(content, { colour: COLORS.SECONDARY, ...options });
        },
        reply_danger(content, options = {}) {
            return this.reply(content, { colour: COLORS.DANGER, ...options });
        },
    };
}

export interface Context {
    prefix: string;

    message: Message;
    mixtape: Mixtape;

    get player(): Player | null;
    get server(): Server | null;
    get author(): User | null;
    get channel(): Channel | null;

    reply(content: string, options?: Omit<SendableEmbed, "description">): Promise<Message>;
    reply(embed?: SendableEmbed): Promise<Message>;

    /* replies with embed colors already set because im a lazy fuck. */
    reply_primary(content: string, options?: Omit<SendableEmbed, "description">): Promise<Message>;
    reply_secondary(embed?: SendableEmbed): Promise<Message>;

    reply_secondary(content: string, options?: Omit<SendableEmbed, "description">): Promise<Message>;
    reply_secondary(embed?: SendableEmbed): Promise<Message>;

    reply_danger(content: string, options?: Omit<SendableEmbed, "description">): Promise<Message>;
    reply_danger(embed?: SendableEmbed): Promise<Message>;
}
