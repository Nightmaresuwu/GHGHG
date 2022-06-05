import { Mixtape } from "#lib";
import "#lib/logger";
import * as Sentry from "@sentry/node";
import "@sentry/tracing";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import "dotenv/config";

dayjs.extend(duration);

if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 1.0,
    });

    console.info("[sentry] initialized");
} else {
    console.warn(`No Sentry DSN was setup, errors will go unreported...`);
}

void new Mixtape().setup();
