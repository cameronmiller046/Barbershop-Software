// Lightweight client-side error buffer. Captures recent JS errors, unhandled
// rejections, and console.error calls so a bug report can attach them.
// No PII: we only keep error messages + stack traces, capped.

type Entry = { t: string; kind: string; msg: string };
const BUF: Entry[] = [];
const MAX = 40;
let installed = false;

function push(kind: string, msg: string) {
  BUF.push({ t: new Date().toISOString(), kind, msg: String(msg).slice(0, 1000) });
  while (BUF.length > MAX) BUF.shift();
}

export function installErrorCapture() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e) => {
    push("error", `${e.message}${e.filename ? ` @ ${e.filename}:${e.lineno}:${e.colno}` : ""}${e.error?.stack ? `\n${e.error.stack}` : ""}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    push("unhandledrejection", r?.stack || r?.message || String(r));
  });

  const origErr = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try { push("console.error", args.map((a) => (a instanceof Error ? a.stack || a.message : typeof a === "object" ? safeJson(a) : String(a))).join(" ")); } catch { /* ignore */ }
    origErr(...args);
  };
}

function safeJson(o: unknown) { try { return JSON.stringify(o); } catch { return "[unserializable]"; } }

export function getRecentLogs(): string {
  if (BUF.length === 0) return "";
  return BUF.map((e) => `[${e.t}] ${e.kind}: ${e.msg}`).join("\n");
}
