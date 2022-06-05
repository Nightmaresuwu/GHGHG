import { CommandCategory, create_command, parse_channel, Player } from "#lib";
import { requires_server } from "#lib/restriction/common";

export default create_command({
    names: ["join", "create", "summon"],
    description: "Joins the provided channel",
    usage: "<channel id/mention>",
    category: CommandCategory.Music,
    restrictions: [requires_server],
    execute: async (ctx, [channel_arg]) => {
        if (ctx.player) {
            return ctx.reply_secondary("A player for this server already exists!");
        }

        if (!channel_arg) {
            return ctx.reply_secondary("You didn't provide a **voice channel** for me to join!");
        }

        const channel = parse_channel(ctx.mixtape, channel_arg);
        if (!channel || channel.channel_type !== "VoiceChannel") {
            return ctx.reply_secondary("You didn't provide a valid **voice channel** for me to join!");
        }

        const { token } = await channel.joinCall();

        const player = new Player(ctx.mixtape, ctx.message.channel.server_id, ctx.message.channel_id);
        await player.join(channel._id, token);

        ctx.mixtape.players.set(ctx.message.channel.server_id, player);
        return ctx.reply_primary(`Okay! I joined **${channel.name}**.`);
    },
});
