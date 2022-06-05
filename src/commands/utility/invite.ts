import { CommandCategory, create_command } from "#lib";

export default create_command({
    names: ["invite", "inv"],
    description: "Sends an invite for Mixtape",
    category: CommandCategory.Utility,
    execute: ctx => ctx.reply_primary(`Here you go!\nhttps://app.revolt.chat/bot/${ctx.mixtape.user._id}`),
});
