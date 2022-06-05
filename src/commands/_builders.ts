import { Command, CommandCategory, create_command, Effect } from "#lib";
import { requires_server } from "#lib/restriction/common";
import { requires_participant, requires_player } from "#lib/restriction/player";

export const create_effect_command = (effect: Effect, aliases: string[] = []): Command =>
    create_command({
        names: [effect, ...aliases],
        description: `Enables the '${effect}' effect for this player.`,
        category: CommandCategory.Music,
        restrictions: [requires_server, requires_player, requires_participant],
        execute: ctx => {
            const enabled = ctx.player.apply_effect(effect);
            return ctx.reply_primary(`The *${effect}* effect has been **${enabled ? "enabled" : "disabled"}**`);
        },
    });
