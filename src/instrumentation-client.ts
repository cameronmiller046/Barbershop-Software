import * as Sentry from "@sentry/nextjs";

// Browser error tracking. Uses NEXT_PUBLIC_SENTRY_DSN (must be public to reach
// the client bundle). No-op when unset.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

// Instruments client-side navigations for Sentry (safe to export unconditionally).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
