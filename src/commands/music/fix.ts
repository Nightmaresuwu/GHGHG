import { CommandCategory, create_command } from "#lib";
import { requires_server } from "#lib/restriction/common";
import { requires_participant, requires_player } from "#lib/restriction/player";

export default create_command({
    names: ["fix"],
    description: "Hopefully fixes the bot",
    category: CommandCategory.Utility,
    restrictions: [requires_server, requires_player, requires_participant],
    execute: ctx => {
        ctx.player.text_channel_id ??= ctx.message.channel_id;
        ctx.player.send("restart_producer");
        ctx.reply_primary(`The player should be fixed now, if it is not try rejoining :/`);
    },
});
