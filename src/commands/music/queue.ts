import { chunked, CommandCategory, constrain, create_command, format_track } from "#lib";
import { requires_server } from "#lib/restriction/common";
import { requires_player } from "#lib/restriction/player";
import dayjs from "dayjs";

const PAGE_COUNT = 10;

export default create_command({
    names: ["queue", "q", "songs"],
    description: "Shows the track queue for this server's player.",
    usage: "[page: number] / remove [index: number]",
    category: CommandCategory.Music,
    restrictions: [requires_server, requires_player],
    execute: async (ctx, args) => {
        // mix queue remove
        if (["remove", "rm", "del", "-"].includes(args[0])) {
            /* removing a track from the queue. */
            let index = +args[1];
            if (Number.isNaN(index)) {
                return ctx.reply_secondary(
                    `Provide a valid track for me to remove, try running **${process.env.COMMAND_PREFIX}queue** first.`,
                );
            }

            index--;

            const track = ctx.player.next[index];
            if (!track) {
                return ctx.reply_secondary("That track doesn't exist, try again...");
            }

            ctx.player.next.splice(index, 1);
            return ctx.reply_primary(`Okay, I removed ${format_track(track.info)} from the queue.`);
        }

        // mix queue
        if (ctx.player.next.length < 1) {
            return ctx.reply_primary(
                `It doesn't look like there's anything in the queue, try using **${process.env.COMMAND_PREFIX}play**!`,
            );
        }

        /* split the queue into chunks of PAGE_COUNT */
        const pages = chunked(ctx.player.next, PAGE_COUNT);

        /* get the requested page. */
        const page_number = Number.isNaN(+args[0])
            ? 0
            : constrain(+args[0], 1, pages.length) - 1;

        const page = pages[page_number];

        /* render the queue */
        const indexPadding = ctx.player.next.length.toString().length;

        let index = page_number * PAGE_COUNT, rendered = "";
        for (const track of page) {
            rendered += `\`#${`${index++ + 1}`.padStart(indexPadding, "0")}\` \``;
            rendered += dayjs.duration(track.info.length).format("mm:ss");
            rendered += "` ";
            rendered += format_track(track.info);
            if (track.requester) {
                rendered += ` <@${track.requester}>`;
            }

            rendered += "\n";
        }

        rendered += `\n##### Page ${page_number + 1}/${pages.length}`;

        ctx.reply_primary(rendered);
    },
});
