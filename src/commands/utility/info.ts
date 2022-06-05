import { CommandCategory, create_command, pluralize } from "#lib";

export default create_command({
    names: ["info", "stats"],
    description: "Shows information about Mixtape.",
    category: CommandCategory.Utility,
    execute: ctx => {
        const description = [
            "Hello, I'm Mixtape! The perfect way to play your favorite tunes.",
            "[Discord Server](https://mixtape.systems/discord) • [Revolt Server](https://app.revolt.chat/invite/GHfygSVa)\n",
            "### Stats",
            `**• Player Count:** ${pluralize("player", ctx.mixtape.players.size)}`,
            `**• Server Count:** ${pluralize("server", ctx.mixtape.servers.size)}\n`,
            "### Resource Usage",
            `**• Memory Usage:** ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MiB`,
        ].join("\n");

        ctx.reply_primary(description);
    },
});
