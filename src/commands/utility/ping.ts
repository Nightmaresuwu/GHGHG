import { CommandCategory, create_command } from "#lib";

export default create_command({
    names: ["ping", "latency"],
    description: "Shows the latency of the bot",
    category: CommandCategory.Utility,
    execute: ctx => ctx.reply_primary(`Pong! **Heartbeat:** *${ctx.mixtape.websocket.ping}ms*`),
});
