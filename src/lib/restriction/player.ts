import type { CommandRestriction } from "./base";

export const requires_player: CommandRestriction = ctx => {
    if (!ctx.player) {
        ctx.reply_secondary(
            `A player for this server doesn't exist yet, try running the **${ctx.prefix}join <channel id>** command.`,
        );

        return false;
    }

    if (!ctx.player.connected) {
        ctx.reply_secondary(
            "Sorry, we're still connecting to this voice channel.\nTry again in a few seconds.",
        );

        return false;
    }

    return true;
};

export const requires_participant: CommandRestriction = ctx => {
    const channel = ctx.player.channel;
    if (!ctx.player.participants.has(ctx.message.author_id)) {
        ctx.reply_secondary(
            `You're not a participant! You must join **${channel.name}** before running commands.`,
        );

        return false;
    }

    return true;
};

export const requires_playing_track: CommandRestriction = ctx => {
    if (!ctx.player.current) {
        ctx.reply_secondary("Nothing is playing right now. Did you mean to play something first?");
        return false;
    }

    return true;
};
