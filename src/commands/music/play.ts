import { CommandCategory, create_command, ROUTING_KEYS, SearchResponse, Track } from "#lib";
import { requires_server } from "#lib/restriction/common";
import { requires_participant, requires_player } from "#lib/restriction/player";

export default create_command({
    names: ["play", "p", "add", "search"],
    description: "Plays a song",
    usage: "<query>",
    category: CommandCategory.Music,
    restrictions: [requires_server, requires_player, requires_participant],
    execute: async (ctx, args) => {
        ctx.player.text_channel_id ??= ctx.message.channel_id;

        const query = args.join(" ").trim();
        if (query.length < 1) {
            return ctx.reply_secondary(
                "Hmm, I know it might be amusing but try actually providing something for me to search... Thanks!",
            );
        }

        const { body: results } = await ctx.mixtape.amqp.rpc.call<SearchResponse>(ROUTING_KEYS.COMMANDS, {
            type: "search",
            query: /^https?:\/\//.test(query) ? query : `ytsearch:${query}`,
        });

        let msg, tracks: Track[];
        switch (results.type) {
            case "track":
                msg =
                    `Added **[${results.track.info.title}](${results.track.info.uri}) from ${results.track.info.author}** to the queue.`;
                tracks = [results.track];
                break;
            case "track_collection":
                switch (results.collection.type) {
                    case "playlist":
                    case "basic":
                        msg = `Added **${results.collection.tracks.length} tracks** from ${
                            results.collection["album"] ? "album" : "playlist"
                        } [${results.collection.name}](${query}) to the queue.`;
                        tracks = results.collection.tracks;
                        break;
                    case "artist_top_tracks":
                        msg =
                            `Added the **Top ${results.collection.tracks.length} tracks** from [${results.collection.artist}](${query}) to the queue.`;
                        tracks = results.collection.tracks;
                        break;
                    case "search":
                        const [track] = results.collection.tracks;
                        msg =
                            `Added **[${track.info.title}](${track.info.uri}) from ${track.info.author}** to the queue.`;
                        tracks = [track];
                        break;
                }
                break;
            case "unknown":
            case "load_failed":
                console.dir(results, { depth: null });
                ctx.reply_secondary("something went wrong while trying to search");
                return;
            case "no_matches":
                ctx.reply_secondary(`I couldn't find anything for \`${query}\`, maybe try again?`);
                return;
        }

        if (!ctx.mixtape.developers.has(ctx.author._id) && tracks.some(t => t.source === "http")) {
            return ctx.reply_secondary(`Http tracks are only for my **developers**!`);
        }

        ctx.player.text_channel_id ??= ctx.message.channel_id;
        ctx.player.queue(tracks, ctx.message.author_id);

        if (tracks.length > 1 || ctx.player.running) {
            await ctx.reply_primary(msg);
        }

        if (!ctx.player.running) {
            await ctx.player.start_next();
        }
    },
});
