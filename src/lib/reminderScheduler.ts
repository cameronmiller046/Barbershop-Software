import { sendDueReminders } from "@/lib/reminders";

// Built-in scheduler so reminders fire automatically on a long-running server
// (Railway) with no external cron. Idempotent claiming in sendDueReminders makes
// it safe even if the process restarts or briefly overlaps. A secret cron
// endpoint (/api/cron/reminders) exists as a manual/external trigger too.
let started = false;

export function startReminderScheduler() {
  if (started) return;
  started = true;

  const tick = async () => {
    try {
      const r = await sendDueReminders();
      if (r.sent || r.failed) console.log(`[reminders] sent ${r.sent} (email ${r.email}, sms ${r.sms}), failed ${r.failed}`);
    } catch (e) {
      console.error("[reminders] tick failed:", (e as Error).message);
    }
  };

  setTimeout(tick, 30_000); // first pass ~30s after boot
  setInterval(tick, 5 * 60_000); // then every 5 minutes
}
