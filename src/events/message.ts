import { create_context, create_event, ErrorType, SERVER_INVITE } from "#lib";
import { ErrorReturnedException } from "#lib/error/error_type_returned";
import Sentry from "@sentry/node";

export default create_event({
    emitter: "client",
    event: "message",
    execute: async (mixtape, message) => {
        const prefix = process.env.COMMAND_PREFIX;
        if (message.author.bot != null || typeof message.content !== "string" || !message.content.startsWith(prefix)) {
            return;
        }

        const [trigger, ...args] = message.content.slice(prefix.length).split(/\s+/g);

        const command = mixtape.commands.find(trigger);
        if (!command) {
            return;
        }

        const ctx = create_context(mixtape, message, prefix);
        if (!command.restrictions.every(r => r(ctx))) {
            return;
        }

        const transaction = Sentry.startTransaction({
            op: "command",
            name: command.names[0],
            data: {
                args,
                trigger,
                channel: `${message.channel?.name ?? "unknown"} ${message.channel_id}`,
                server: message.channel?.server
                    ? `${message.channel.server.name} ${message.channel.server._id}`
                    : "none",
                author: `${message.author?.username ?? "unknown"} ${message.author_id}`,
            },
        });

        try {
            await command.execute(ctx, args);
        } catch (ex) {
            Sentry.captureException(ex);
            if (ex instanceof ErrorReturnedException) {
                const { error_type } = ex;
                if (ctx.message.channel.server_id && error_type === ErrorType.PlayerNotFound) {
                    ctx.mixtape.players.delete(ctx.message.channel.server_id);
                }

                return ctx.reply_danger(
                    `Received error code: \`${error_type}\`, report this in our [server](${SERVER_INVITE})`,
                );
            }

            if (ex.message?.includes("524") != true) {
                console.error("[commands] error while handling command", ex);
                ctx.reply_danger(
                    `Oopsie daisies! This command has encountered an error, please report to this in [Server](${SERVER_INVITE})`,
                );
            }
        } finally {
            transaction.finish();
        }
    },
});
