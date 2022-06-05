import { create_event } from "#lib/module/event";

export default create_event({
    emitter: "client",
    event: "ready",
    once: true,
    execute: mixtape => {
        console.info(`[revolt] ready, logged in as ${mixtape.user.username}...`);
        console.info(`[revolt] in ${mixtape.servers.size} servers`);

        mixtape.sync_players();

        const activities = ["mix help • mixtape.systems", "oss? gitlab.com/mixtape/revolt :trol:"];
        function set_activity() {
            const activity = activities[Math.floor(Math.random() * activities.length)];
            mixtape.api.patch("/users/@me", {
                status: {
                    presence: "Busy",
                    text: activity,
                },
            });
        }

        set_activity();
        setInterval(set_activity, 5000);
    },
});
