import { CommandCategory, create_command } from "#lib";
import { requires_server } from "#lib/restriction/common";
import { requires_participant, requires_player, requires_playing_track } from "#lib/restriction/player";

export default create_command({
    names: ["pause"],
    description: "Pauses the current track.",
    restrictions: [requires_server, requires_player, requires_participant, requires_playing_track],
    category: CommandCategory.Music,
    execute: async ctx => {
        if (ctx.player.paused) {
            return ctx.reply_secondary(
                `Hmmm, it looks like the player has already been paused. Try using **${process.env.COMMAND_PREFIX}resume**?`,
            );
        }

        ctx.player.pause(true);
        return ctx.reply_secondary("Okay, the player has been paused!");
    },
});
