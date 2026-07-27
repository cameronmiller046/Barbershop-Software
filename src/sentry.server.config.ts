import * as Sentry from "@sentry/nextjs";

// Server-side error tracking. No-op unless SENTRY_DSN is set, so local dev and
// any deployment without the env var behave exactly as before.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
