import { CommandCategory, create_command } from "#lib";
import { requires_server } from "#lib/restriction/common";
import { requires_participant, requires_player, requires_playing_track } from "#lib/restriction/player";

export default create_command({
    names: ["stop", "s"],
    description: "Stops any playing track in this server",
    category: CommandCategory.Music,
    restrictions: [requires_server, requires_player, requires_participant, requires_playing_track],
    execute: async ctx => {
        ctx.player.text_channel_id ??= ctx.message.channel_id;
        await ctx.player.stop();
    },
});
