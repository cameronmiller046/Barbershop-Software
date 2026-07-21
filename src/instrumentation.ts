// Runs once when the server starts (Next.js instrumentation). We only want the
// Node.js runtime (not edge, not build), and we import the scheduler lazily so
// no server-only code is pulled into other runtimes.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startReminderScheduler } = await import("@/lib/reminderScheduler");
  startReminderScheduler();
}
