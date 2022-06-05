import { CommandCategory, create_command } from "#lib";
import { requires_server } from "#lib/restriction/common";
import { requires_participant, requires_player } from "#lib/restriction/player";

export default create_command({
    names: ["bitrate"],
    description: "Changes the bitrate of the player.",
    category: CommandCategory.Music,
    restrictions: [requires_server, requires_player, requires_participant],
    execute: async (ctx, args) => {
        ctx.player.text_channel_id ??= ctx.message.channel_id;
        switch (args[0]?.toLowerCase()) {
            case "max": {
                ctx.player.send("bitrate", { bitrate: -1000 });
                ctx.player.bitrate = -1000;
                return ctx.reply_primary("Set bitrate to the max, or **512kbps**.");
            }

            case "reset": {
                ctx.player.send("bitrate", { bitrate: -1 });
                ctx.player.bitrate = -1;
                return ctx.reply_primary("Reset the bitrate of the player.");
            }

            default:
                if (!args[0]) {
                    return ctx.reply_primary(
                        ctx.player.bitrate === -1
                            ? "The bitrate is unknown... try setting a custom bitrate!"
                            : ctx.player.bitrate === -1000
                            ? "Currently at the max bitrate, or **512kbps**"
                            : `The bitrate is currently at **${Math.floor(ctx.player.bitrate / 1000)}kbps**`,
                    );
                }

                let bitrate = Number.parseInt(
                    args[0].endsWith("kbps")
                        ? args[0].replace("kbps", "").trim()
                        : args[0],
                );

                if (Number.isNaN(bitrate)) {
                    return ctx.reply_secondary("Please provide a valid number for the bitrate.");
                }
                if (bitrate < 1000 || bitrate > 512000) {
                    bitrate *= 1000;
                }

                if (bitrate < 1000 || bitrate > 512000) {
                    return ctx.reply_secondary("Please provide a bitrate between **1kbps** and **512kbps**.");
                }

                ctx.player.bitrate = bitrate;
                ctx.player.send("bitrate", { bitrate });
                ctx.reply_primary(`Set the player bitrate to **${Math.floor(ctx.player.bitrate / 1000)}kbps**`);
        }
    },
});
