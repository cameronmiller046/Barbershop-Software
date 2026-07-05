"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { submitTicket, type SubmitTicketInput } from "@/app/portal/feedback/actions";
import { installErrorCapture, getRecentLogs } from "@/lib/clientLogs";
import {
  APP_VERSION, TYPE_META, SEVERITY_ORDER, SEVERITY_META, PRIORITY_ORDER, PRIORITY_META,
  QUESTION_CATEGORIES, estimatedResponse, type TicketType, type TicketSeverity, type TicketPriority,
} from "@/lib/tickets";

type Att = { name: string; mime: string; dataUrl: string };
type Ctx = { route: string; browser: string; os: string; screen: string; appVersion: string; when: string };

export function FeedbackFab({ user }: { user: { name: string; email: string } }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TicketType | null>(null);

  useEffect(() => { setMounted(true); installErrorCapture(); }, []);
  useEffect(() => { setOpen(false); }, [pathname]);

  const ctx: Ctx = useMemo(() => ({
    route: pathname,
    browser: mounted ? detectBrowser() : "",
    os: mounted ? detectOS() : "",
    screen: mounted ? `${window.screen.width}×${window.screen.height} @${window.devicePixelRatio}x` : "",
    appVersion: APP_VERSION,
    when: mounted ? new Date().toLocaleString() : "",
  }), [mounted, pathname]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Menu + FAB */}
      <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3 print:hidden">
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} className="flex flex-col items-end gap-2">
              {(["BUG", "QUESTION", "FEATURE"] as TicketType[]).map((t) => (
                <button key={t} onClick={() => { setType(t); setOpen(false); }}
                  className="group flex items-center gap-2.5 rounded-full border border-white/10 bg-[#151318]/95 py-2 pl-3 pr-4 text-sm text-cream shadow-xl backdrop-blur transition hover:border-brass/50">
                  <span className="text-base">{TYPE_META[t].emoji}</span>
                  <span className="font-medium">{t === "BUG" ? "Report a Bug" : t === "QUESTION" ? "Ask a Question" : "Feature Request"}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="group relative">
          {!open && (
            <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#151318] px-2.5 py-1 text-xs text-cream opacity-0 shadow-lg transition group-hover:opacity-100">Need Help?</span>
          )}
          <button onClick={() => setOpen((o) => !o)} aria-label="Feedback"
            className="grid h-14 w-14 place-items-center rounded-full text-[#17130a] shadow-[0_10px_30px_-6px_rgba(216,178,92,0.6)] transition hover:scale-105 active:scale-95"
            style={{ background: "radial-gradient(circle at 30% 25%, #f7e2a6, #d8b25c 60%, #b98a3c)" }}>
            <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
              {open ? <PlusIcon /> : <BugIcon />}
            </motion.span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {type && <FeedbackModal type={type} ctx={ctx} user={user} onClose={() => setType(null)} />}
      </AnimatePresence>
    </>,
    document.body,
  );
}

/* ─────────────────────────── Modal ─────────────────────────── */
function FeedbackModal({ type, ctx, user, onClose }: { type: TicketType; ctx: Ctx; user: { name: string; email: string }; onClose: () => void }) {
  const meta = TYPE_META[type];
  const [f, setF] = useState<Record<string, string>>({});
  const [severity, setSeverity] = useState<TicketSeverity>("MEDIUM");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [attachments, setAttachments] = useState<Att[]>([]);
  const [includeLogs, setIncludeLogs] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { ref: string; id: string }>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  async function onSubmit() {
    setError(null);
    const title = (type === "QUESTION" ? f.subject : f.title)?.trim();
    const description = (type === "QUESTION" ? f.question : f.description)?.trim();
    if (!title) return setError("Please add a title.");
    if (!description) return setError("Please add a description.");

    const details: Record<string, string> = {};
    if (type === "BUG") { for (const k of ["steps", "expected", "actual"]) if (f[k]?.trim()) details[k] = f[k].trim(); }
    if (type === "QUESTION") { if (f.category) details.category = f.category; }
    if (type === "FEATURE") { for (const k of ["problem", "solution", "benefit", "useCase"]) if (f[k]?.trim()) details[k] = f[k].trim(); }

    const payload: SubmitTicketInput = {
      type, title, description,
      severity: type === "BUG" ? severity : undefined,
      priority: type !== "BUG" ? priority : undefined,
      details,
      context: {
        route: ctx.route, browser: ctx.browser, os: ctx.os, screen: ctx.screen, appVersion: ctx.appVersion,
        consoleLogs: type === "BUG" && includeLogs ? getRecentLogs() : undefined,
      },
      attachments,
    };
    setBusy(true);
    const res = await submitTicket(payload);
    setBusy(false);
    if (res.ok) setDone({ ref: res.ref, id: res.id });
    else setError(res.error);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="portal fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
        className="p-scroll max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#131217] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <Confirmation type={type} refNo={done.ref} severity={severity} priority={priority} onClose={onClose} />
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl text-lg" style={{ background: `${meta.color}22` }}>{meta.emoji}</span>
                <div>
                  <h3 className="font-display text-xl text-cream">{meta.label}</h3>
                  <p className="text-xs text-cream/45">Submitting as {user.name}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-cream/40 hover:text-cream">✕</button>
            </div>

            <div className="mt-5 space-y-3.5">
              {type === "BUG" && (
                <>
                  <TextField label="Bug title" required value={f.title ?? ""} onChange={set("title")} placeholder="Booking calendar shows wrong times" autoFocus />
                  <Area label="Description" required value={f.description ?? ""} onChange={set("description")} placeholder="What went wrong?" />
                  <Area label="Steps to reproduce" value={f.steps ?? ""} onChange={set("steps")} placeholder={"1. Go to…\n2. Click…\n3. See…"} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Area label="Expected behavior" value={f.expected ?? ""} onChange={set("expected")} rows={2} />
                    <Area label="Actual behavior" value={f.actual ?? ""} onChange={set("actual")} rows={2} />
                  </div>
                  <Pills label="Severity" value={severity} options={SEVERITY_ORDER.map((s) => ({ value: s, label: SEVERITY_META[s].label, color: SEVERITY_META[s].color }))} onChange={(v) => setSeverity(v as TicketSeverity)} />
                </>
              )}
              {type === "QUESTION" && (
                <>
                  <TextField label="Subject" required value={f.subject ?? ""} onChange={set("subject")} placeholder="How do I export my client list?" autoFocus />
                  <SelectField label="Category" value={f.category ?? ""} onChange={(v) => setF((p) => ({ ...p, category: v }))} options={QUESTION_CATEGORIES} />
                  <Area label="Your question" required value={f.question ?? ""} onChange={set("question")} placeholder="Tell us what you need help with…" />
                  <Pills label="Priority" value={priority} options={PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_META[p].label, color: PRIORITY_META[p].color }))} onChange={(v) => setPriority(v as TicketPriority)} />
                </>
              )}
              {type === "FEATURE" && (
                <>
                  <TextField label="Title" required value={f.title ?? ""} onChange={set("title")} placeholder="Add SMS appointment reminders" autoFocus />
                  <Area label="Description" required value={f.description ?? ""} onChange={set("description")} placeholder="Describe the feature…" rows={2} />
                  <Area label="Problem being solved" value={f.problem ?? ""} onChange={set("problem")} rows={2} />
                  <Area label="Suggested solution" value={f.solution ?? ""} onChange={set("solution")} rows={2} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Area label="Expected benefit" value={f.benefit ?? ""} onChange={set("benefit")} rows={2} />
                    <Area label="Use case" value={f.useCase ?? ""} onChange={set("useCase")} rows={2} />
                  </div>
                  <Pills label="Priority" value={priority} options={PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_META[p].label, color: PRIORITY_META[p].color }))} onChange={(v) => setPriority(v as TicketPriority)} />
                </>
              )}

              <AttachmentPicker attachments={attachments} setAttachments={setAttachments} onError={setError} />

              {type === "BUG" && (
                <label className="flex items-center gap-2 text-xs text-cream/60">
                  <input type="checkbox" checked={includeLogs} onChange={(e) => setIncludeLogs(e.target.checked)} className="accent-[#d8b25c]" />
                  Attach recent console logs &amp; diagnostics
                </label>
              )}

              {/* Auto-captured context */}
              <details className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-xs text-cream/55">
                <summary className="cursor-pointer text-cream/70">Automatically included: page, browser, OS, screen, version</summary>
                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                  <Ctxline k="Page" v={ctx.route} /><Ctxline k="Browser" v={ctx.browser} />
                  <Ctxline k="OS" v={ctx.os} /><Ctxline k="Screen" v={ctx.screen} />
                  <Ctxline k="Version" v={ctx.appVersion} /><Ctxline k="Captured" v={ctx.when} />
                  <Ctxline k="User" v={`${user.name} · ${user.email}`} />
                </div>
              </details>

              {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={onClose} className="p-btn-ghost">Cancel</button>
              <button onClick={onSubmit} disabled={busy} className="p-btn-gold disabled:opacity-50">{busy ? "Submitting…" : "Submit"}</button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function Confirmation({ type, refNo, severity, priority, onClose }: { type: TicketType; refNo: string; severity: TicketSeverity; priority: TicketPriority; onClose: () => void }) {
  return (
    <div className="py-4 text-center">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 250, damping: 18 }}
        className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-2xl text-[#17130a]">✓</motion.div>
      <h3 className="mt-4 font-display text-2xl text-cream">Thank you!</h3>
      <p className="mt-1 text-cream/60">Your request has been submitted.</p>
      <div className="mx-auto mt-5 max-w-xs space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left text-sm">
        <Row k="Reference" v={<span className="font-mono text-brass">{refNo}</span>} />
        <Row k="Status" v={<span className="badge st-checkedin">New</span>} />
        <Row k="Est. response" v={estimatedResponse(type, severity, priority)} />
      </div>
      <div className="mt-5 flex justify-center gap-2">
        <Link href="/portal/feedback" onClick={onClose} className="p-btn-gold">Track request</Link>
        <button onClick={onClose} className="p-btn-ghost">Done</button>
      </div>
    </div>
  );
}

/* ─────────────────────── Attachments ─────────────────────── */
function AttachmentPicker({ attachments, setAttachments, onError }: { attachments: Att[]; setAttachments: (a: Att[]) => void; onError: (m: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const add = async (files: FileList | File[]) => {
    const imgs = [...files].filter((f) => f.type.startsWith("image/"));
    const next: Att[] = [...attachments];
    for (const file of imgs) {
      if (next.length >= 6) { onError("Up to 6 screenshots."); break; }
      try {
        const dataUrl = await fileToDataUrl(file);
        if (dataUrl.length > 2_000_000) { onError(`"${file.name}" is too large (max ~1.5MB).`); continue; }
        next.push({ name: file.name || "screenshot.png", mime: file.type, dataUrl });
      } catch { onError("Couldn't read that image."); }
    }
    setAttachments(next);
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.items ?? [])].filter((i) => i.type.startsWith("image/")).map((i) => i.getAsFile()).filter(Boolean) as File[];
      if (files.length) { e.preventDefault(); add(files); }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="mb-1 block text-[11px] uppercase tracking-wide text-cream/40">Screenshots</div>
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border border-dashed px-4 py-4 text-center text-xs transition ${drag ? "border-brass/60 bg-brass/[0.06]" : "border-white/15 text-cream/45 hover:border-brass/40"}`}>
        Drag &amp; drop, <span className="text-brass">click to upload</span>, or paste (Ctrl/⌘ V)
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && add(e.target.files)} />
      </div>
      {attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.dataUrl} alt={a.name} className="h-full w-full object-cover" />
              <button onClick={(e) => { e.stopPropagation(); setAttachments(attachments.filter((_, j) => j !== i)); }}
                className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-xs text-white opacity-0 transition group-hover:opacity-100">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── small fields ─────────────────────── */
function TextField({ label, required, ...rest }: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-cream/40">{label}{required && <span className="text-brass"> *</span>}</span>
      <input {...rest} className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-cream placeholder:text-cream/25 focus:border-brass/60 focus:outline-none" />
    </label>
  );
}
function Area({ label, required, rows = 3, ...rest }: { label: string; required?: boolean; rows?: number } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-cream/40">{label}{required && <span className="text-brass"> *</span>}</span>
      <textarea rows={rows} {...rest} className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-cream placeholder:text-cream/25 focus:border-brass/60 focus:outline-none" />
    </label>
  );
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-cream/40">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-cream focus:border-brass/60 focus:outline-none">
        <option value="" className="bg-[#131217]">Select…</option>
        {options.map((o) => <option key={o} value={o} className="bg-[#131217]">{o}</option>)}
      </select>
    </label>
  );
}
function Pills({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string; color: string }[]; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-cream/40">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className="rounded-full border px-3 py-1.5 text-sm transition"
            style={value === o.value ? { borderColor: o.color, background: `${o.color}22`, color: o.color } : { borderColor: "rgba(255,255,255,0.15)", color: "rgba(245,241,232,0.6)" }}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: React.ReactNode }) { return <div className="flex items-center justify-between"><span className="text-cream/50">{k}</span><span className="text-cream/90">{v}</span></div>; }
function Ctxline({ k, v }: { k: string; v: string }) { return <div className="truncate"><span className="text-cream/40">{k}:</span> <span className="text-cream/70">{v}</span></div>; }

/* ─────────────────────── helpers ─────────────────────── */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function detectBrowser() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return `Edge ${ua.match(/Edg\/([\d.]+)/)?.[1] ?? ""}`.trim();
  if (/OPR\//.test(ua)) return `Opera ${ua.match(/OPR\/([\d.]+)/)?.[1] ?? ""}`.trim();
  if (/Firefox\//.test(ua)) return `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1] ?? ""}`.trim();
  if (/Chrome\//.test(ua)) return `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1] ?? ""}`.trim();
  if (/Safari\//.test(ua)) return `Safari ${ua.match(/Version\/([\d.]+)/)?.[1] ?? ""}`.trim();
  return ua.slice(0, 60);
}
function detectOS() {
  const ua = navigator.userAgent;
  if (/Windows NT 10/.test(ua)) return "Windows 10/11";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua)) return `macOS ${(ua.match(/Mac OS X ([\d_]+)/)?.[1] ?? "").replace(/_/g, ".")}`.trim();
  if (/Android/.test(ua)) return `Android ${ua.match(/Android ([\d.]+)/)?.[1] ?? ""}`.trim();
  if (/iPhone|iPad/.test(ua)) return `iOS ${(ua.match(/OS ([\d_]+)/)?.[1] ?? "").replace(/_/g, ".")}`.trim();
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown";
}

function BugIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 2 1.5 1.5M16 2l-1.5 1.5" /><path d="M12 20a6 6 0 0 0 6-6v-2a6 6 0 0 0-12 0v2a6 6 0 0 0 6 6Z" />
      <path d="M12 8v12M4 10h4M16 10h4M3 15h5M16 15h5M4 20l3-2M20 20l-3-2M4 6l3 2M20 6l-3 2" />
    </svg>
  );
}
function PlusIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
}
