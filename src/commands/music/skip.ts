import { COLORS, CommandCategory, create_command, format_track } from "#lib";
import { requires_server } from "#lib/restriction/common";
import { requires_participant, requires_player, requires_playing_track } from "#lib/restriction/player";

export default create_command({
    names: ["skip", "next", "sk"],
    description: "Skips to the next song in the queue.",
    category: CommandCategory.Music,
    restrictions: [requires_server, requires_player, requires_participant, requires_playing_track],
    execute: async ctx => {
        ctx.player.text_channel_id ??= ctx.message.channel_id;
        if (ctx.player.current.requester && ctx.player.current.requester === ctx.author._id) {
            return ctx.player.start_next();
        }

        if (ctx.player.votes.has(ctx.message.author_id)) {
            ctx.player.votes.delete(ctx.message.author_id);
            return ctx.reply_secondary(`Removed your vote to skip ${format_track(ctx.player.current.info)}`);
        }

        if (ctx.player.votes.size + 1 >= ctx.player.votes_needed) {
            await ctx.player.text_channel?.sendMessage({
                content: " ",
                embeds: [
                    {
                        description: `${
                            format_track(ctx.player.current.info)
                        } has been skipped because of <@${ctx.author._id}>'s final vote.`,
                        colour: COLORS.PRIMARY,
                    },
                ],
            });

            return ctx.player.start_next();
        }

        ctx.player.votes.add(ctx.message.author_id);
        ctx.reply_primary(
            `You have voted to skip ${
                format_track(ctx.player.current.info)
            }.\nCurrent votes: ${ctx.player.votes.size}/${ctx.player.votes_needed} (${ctx.player.voter_percentage})`,
        );
    },
});
