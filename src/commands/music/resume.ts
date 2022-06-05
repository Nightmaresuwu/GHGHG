import { CommandCategory, create_command } from "#lib";
import { requires_server } from "#lib/restriction/common";
import { requires_participant, requires_player, requires_playing_track } from "#lib/restriction/player";

export default create_command({
    names: ["resume"],
    description: "Resumes the current track.",
    restrictions: [requires_server, requires_player, requires_participant, requires_playing_track],
    category: CommandCategory.Music,
    execute: async ctx => {
        if (!ctx.player.paused) {
            return ctx.reply_secondary(
                `Hmmm, it looks like the player isn't paused. Try using **${process.env.COMMAND_PREFIX}pause**?`,
            );
        }

        ctx.player.pause(false);
        return ctx.reply_secondary("Okay, the player has been resumed!");
    },
});
