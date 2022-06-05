import type { CommandRestriction } from "./base";

export const requires_developer: CommandRestriction = ctx => {
    const is_developer = ctx.mixtape.developers.has(ctx.author._id);
    if (!is_developer) {
        ctx.reply_danger("This command can only be invoked by my developers.");
    }

    return is_developer;
};

export const requires_server: CommandRestriction = ctx => {
    if (!ctx.server) {
        ctx.reply_danger("This command can only be invoked within a Server.");
        return false;
    }

    return true;
};
