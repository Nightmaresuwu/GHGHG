import { CommandCategory, create_command } from "#lib";
import { requires_server } from "#lib/restriction/common";
import { requires_participant, requires_player } from "#lib/restriction/player";

export default create_command({
    names: ["volume", "vol", "v"],
    description: "Changes the volume of the player.",
    usage: "<number 1-100>",
    category: CommandCategory.Music,
    restrictions: [requires_server, requires_player, requires_participant],
    execute: async (ctx, [volume_str]) => {
        ctx.player.text_channel_id ??= ctx.message.channel_id;

        const volume = +volume_str;
        if (Number.isNaN(volume) || !Number.isInteger(volume) || volume > 100 || volume < 1) {
            return ctx.reply_secondary("Please give me a number between **1** and **100**!");
        }

        await ctx.player.set_volume(volume);
        ctx.reply_primary(`The volume is now at **${volume}%**!`);
    },
});
