// Runs once when the server starts (Next.js instrumentation). We only want the
// Node.js runtime for the scheduler; Sentry is initialised per-runtime from its
// own config files (each a no-op unless SENTRY_DSN is set).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    const { startReminderScheduler } = await import("@/lib/reminderScheduler");
    startReminderScheduler();
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Next.js 15 hook — reports errors thrown in RSCs / route handlers to Sentry.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
