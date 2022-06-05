import type { Context } from "#lib/module/command_context";

export type CommandRestriction = (ctx: Context) => boolean;
