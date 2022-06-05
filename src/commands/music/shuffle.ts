import { CommandCategory, create_command, pluralize } from "#lib";
import { requires_server } from "#lib/restriction/common";
import { requires_participant, requires_player } from "#lib/restriction/player";

export default create_command({
    names: ["shuffle", "randomize"],
    description: "Shuffles the queue for this player.",
    category: CommandCategory.Music,
    restrictions: [requires_server, requires_player, requires_participant],
    execute: ctx => {
        ctx.player.text_channel_id ??= ctx.message.channel_id;
        if (!ctx.player.next.length) {
            return ctx.reply_secondary("There's nothing to shuffle!");
        }

        ctx.player.shuffle();
        return ctx.reply_primary(`Okay, I shuffled **${pluralize("song", ctx.player.next.length)}**`);
    },
});
