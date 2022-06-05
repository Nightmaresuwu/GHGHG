import { CommandCategory, create_command } from "#lib";
import { requires_server } from "#lib/restriction/common";
import { requires_participant, requires_player } from "#lib/restriction/player";

export default create_command({
    names: ["leave", "destroy"],
    description: "Leaves any active player in this server.",
    category: CommandCategory.Music,
    restrictions: [requires_server, requires_player, requires_participant],
    execute: async ctx => {
        const channel = ctx.player.channel;

        /* destroy the player */
        await ctx.player.destroy();
        ctx.reply_primary(`Okay! I left **${channel.name}**.`);
    },
});
