import { CommandCategory, create_command } from "#lib";

export default create_command({
    names: [],
    description: "",
    category: CommandCategory.Utility,
    execute: async (ctx, args) => void [ctx, args],
});
