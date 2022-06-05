import { extend, unique } from "#lib/functions";
import type { CommandRestriction } from "#lib/restriction/base";
import type { Context } from "./command_context";
import { create_loader, Loader, Module } from "./loader";

export function create_command(options: Partialize<Omit<Command, "id">, "usage" | "restrictions">): Command {
    return { id: options.names[0], usage: "", restrictions: [], ...options };
}

export function create_command_loader(): CommandLoader {
    const loader = create_loader<Command>("commands", {
        async registered(this: CommandLoader, command) {
            const duplicate_name = command.names.find(name => this.find(name));
            if (duplicate_name) {
                console.warn(`[commands] found duplicate command name`, duplicate_name);
            }

            return !duplicate_name;
        },
    });

    return extend(loader, {
        get categories(): Map<CommandCategory, Map<string, Command>> {
            const mapped = new Map<CommandCategory, Map<string, Command>>();
            for (const category of unique<CommandCategory>(this.all.map(c => c.category))) {
                const entries = this.all
                    .filter(c => c.category === category)
                    .map(c => [c.id, c]);

                mapped.set(category, new Map(entries));
            }

            return mapped;
        },
        find(this: CommandLoader, trigger: string) {
            return this.all.find(c => c.names.some(n => n.toLowerCase() === trigger.toLowerCase()));
        },
    });
}

export interface Command extends Module {
    names: string[];
    description: string;
    restrictions: CommandRestriction[];
    usage: string;
    category: string | CommandCategory;
    execute: (ctx: Context, args: Array<string>) => Promise<any> | any;
}

export enum CommandCategory {
    Music,
    Utility,
    Owner,
}

export type Partialize<O, K extends keyof O> = Omit<O, K> & Partial<Pick<O, K>>;

export interface CommandLoader extends Loader<Command> {
    get categories(): Map<CommandCategory, Map<string, Command>>;

    find(trigger: string): Command | null;
}
