export const ROUTING_KEYS = {
    COMMANDS: process.env.AMQP_COMMANDS_ROUTING_KEY ?? "kairi:commands",
    PLAYER: (bid: string, cid: string) =>
        process.env.AMQP_PLAYER_ROUTING_KEY
            ?.replace("%bid%", bid)
            ?.replace("%cid%", cid)
            ?? `kairi:[${bid}]player.${cid}`,
};

export type EnvironmentType = "";

export const ENVIRONMENT = {
    undefined: "PRIMARY_1",
    null: "PRIMARY_1",
    "": "PRIMARY_1",
    "secondary": "PRIMARY_2",
    "third": "PRIMARY_3",
};

export const COLORS: Record<string, string> = {
    PRIMARY_1: "#B963A5",
    PRIMARY_2: "#8FCFA4",
    PRIMARY_3: "#F6F283",
    SECONDARY: "#F89A34",
    DANGER: "#F54254",
};

COLORS.PRIMARY = COLORS[ENVIRONMENT[process.env.MIX_ENV]];

export type COLORS = { PRIMARY: string } & typeof COLORS;

export const SERVER_INVITE = "https://app.revolt.chat/invite/w41bYY96";
