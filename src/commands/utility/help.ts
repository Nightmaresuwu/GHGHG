import { CommandCategory, create_command } from "#lib";

export default create_command({
    names: ["help", "commands"],
    description: "Does exactly what you think it does,..",
    usage: "[command]",
    category: CommandCategory.Utility,
    execute: async (ctx, args) => {
        const command = args[0]
            ? ctx.mixtape.commands.find(args[0])
            : undefined;
        if (command) {
            const aliases = command.names.slice(1);

            return ctx.reply_primary([
                `### Help for \`${command.names[0]}\``,
                `${command.description}\n`,
                `**• Usage:** \`mix ${command.names[0]}${command.usage.length ? " " + command.usage : ""}\``,
                `**• Aliases:** ${aliases.length ? `\`${aliases.join("`, `")}\`` : "None"}\n`,
                `###### <required> [optional]`,
            ].join("\n"));
        }

        let str = "";
        for (const [category, commands] of ctx.mixtape.commands.categories) {
            const names = [...commands.values()].map(c => c.names[0]);

            str += `### ${CommandCategory[category].replace(/^[\w]/, g => g.toUpperCase())} Commands\n\`${
                names.join("\`, \`")
            }\`\n`;
        }

        ctx.reply_primary([
            "Hello, I'm Mixtape, the **First Revolt Music Bot** and the perfect way to play your favorite tunes!",
            "[Discord Server](https://mixtape.systems/discord) • [Revolt Server](https://app.revolt.chat/invite/GHfygSVa)\n",
            str,
        ].join("\n"));
    },
});
