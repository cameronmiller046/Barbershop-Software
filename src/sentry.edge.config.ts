import * as Sentry from "@sentry/nextjs";

// Edge-runtime error tracking (middleware, edge routes). No-op without SENTRY_DSN.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
