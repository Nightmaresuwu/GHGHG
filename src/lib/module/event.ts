import type { Mixtape } from "#lib/client";
import type { EventEmitter } from "node:events";
import type { MemberCompositeKey, Role } from "revolt-api";
import type { Channel, Member, Message, Server, User } from "revolt.js";
import type { ClientboundNotification } from "revolt.js/dist/websocket/notifications";
import type { Partialize } from "./command";
import { create_loader, Loader, Module } from "./loader";

export interface Event<E extends keyof Events = any, K extends keyof Events[E] = any> extends Module {
    emitter: E;
    event: K;
    once?: boolean;
    // @ts-expect-error
    execute: (mixtape: Mixtape, ...args: Events[E][K]) => void;
}

export function create_event<E extends keyof Events, K extends keyof Events[E]>(
    options: Partialize<Event<E, K>, "id">,
): Event<E, K> {
    return { id: `${options.event}[${options.emitter}]`, once: false, ...options };
}

export function create_event_loader(mixtape: Mixtape, emitters: Record<keyof Events, EventEmitter>): Loader<Event> {
    return create_loader("events", {
        registered: async module => {
            const emitter = emitters[module.emitter];
            if (!emitter) {
                console.warn(`[events] event '${module.event}' requires unknown emitter:`, module.emitter);
                return false;
            }

            const listener = (...args) => {
                if (module.once) {
                    emitter.off(module.event, listener);
                }

                module.execute(mixtape, ...args);
            };

            emitter.on(module.event, listener);
            return true;
        },
    });
}

export type Events = {
    "client": {
        "connected": [];
        "connecting": [];
        "dropped": [];
        "ready": [];
        "logout": [];
        "packet": [packet: ClientboundNotification];
        "message": [message: Message];
        "message/update": [message: Message];
        "message/delete": [id: string, message?: Message];
        "channel/create": [channel: Channel];
        "channel/update": [channel: Channel];
        "channel/delete": [id: string, channel?: Channel];
        "server/update": [server: Server];
        "server/delete": [id: string, server?: Server];
        "role/update": [roleId: string, role: Role, serverId: string];
        "role/delete": [id: string, serverId: string];
        "member/join": [member: Member];
        "member/update": [member: Member];
        "member/leave": [id: MemberCompositeKey];
        "user/relationship": [user: User];
    };
};
