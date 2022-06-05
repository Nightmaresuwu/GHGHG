import * as lib from "#lib";
import { requires_developer } from "#lib/restriction/common";
import { inspect } from "node:util";
import { isPromise } from "node:util/types";

export default lib.create_command({
    names: ["eval", "evaluate"],
    description: "Evaluates code on this process.",
    usage: "<...code>",
    category: lib.CommandCategory.Owner,
    restrictions: [requires_developer],
    execute: async (ctx, args) => {
        let code = args.join(" ");
        if (code.includes("await")) {
            code = `(async () => {${code}})()`;
        }

        let res;
        try {
            res = eval(code);
            if (isPromise(res)) {
                res = await res;
            }
        } catch (e) {
            return ctx.reply_secondary(`Ran into an error while evaluating\n\`\`\`js\n${e.stack}\n\`\`\``);
        }

        if (typeof res !== "string") {
            res = inspect(res, {
                depth: 0,
                getters: true,
            });
        }

        if (res.length >= 2048) {
            res = res.slice(0, 2000);
            res += "\n...";
        }

        res = res
            .replace(new RegExp(process.env.REVOLT_BOT_TOKEN, "g"), () => "no token 4 u")
            .replace(/`/g, `\`${String.fromCharCode(8203)}`)
            .replace(/@/g, `@${String.fromCharCode(8203)}`);

        ctx.reply_primary(`\`\`\`js\n${res}\n\`\`\``);
    },
});
