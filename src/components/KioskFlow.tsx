"use client";

import { useEffect, useState, useTransition } from "react";
import { formatMoney, formatDuration, classNames } from "@/lib/utils";
import { REFERRAL_TYPES } from "@/lib/appointmentMeta";
import {
  kioskSearchClients,
  kioskRegisterClient,
  kioskBarberOptions,
  kioskCheckIn,
} from "@/app/kiosk/actions";
import type { KioskClient, BarberOption } from "@/lib/kioskTypes";

type Service = { id: string; name: string; durationMin: number; priceCents: number };
type Step = "welcome" | "identify" | "register" | "service" | "barber" | "done";
type Client = { id: string; name: string };
type CheckInResult = { barberName: string; etaMin: number; position: number; serviceName: string };

const brand = { background: "var(--brand)", color: "var(--brand-fg)" };

function waitLabel(etaMin: number | null): string {
  if (etaMin === null) return "Not available today";
  if (etaMin <= 3) return "Free now";
  if (etaMin < 60) return `~${etaMin} min wait`;
  const h = Math.floor(etaMin / 60);
  const m = etaMin % 60;
  return `~${h}h${m ? ` ${m}m` : ""} wait`;
}

export function KioskFlow({ shopName, services }: { shopName: string; services: Service[] }) {
  const [step, setStep] = useState<Step>("welcome");
  const [client, setClient] = useState<Client | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [newReferral, setNewReferral] = useState<string>(""); // referral for first-time clients
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const service = services.find((s) => s.id === serviceId) ?? null;

  function reset() {
    setStep("welcome");
    setClient(null);
    setServiceId(null);
    setNewReferral("");
    setResult(null);
    setError(null);
  }

  // Auto-return to the welcome screen a little after a successful check-in so the
  // next person starts fresh.
  useEffect(() => {
    if (step !== "done") return;
    const t = setTimeout(reset, 12000);
    return () => clearTimeout(t);
  }, [step]);

  function pickService(id: string) {
    setServiceId(id);
    setStep("barber");
  }

  function doCheckIn(barberId: string | null) {
    if (!client || !serviceId) return;
    setError(null);
    start(async () => {
      const res = await kioskCheckIn({
        clientId: client.id,
        serviceId,
        barberId,
        referral: newReferral || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult({ barberName: res.barberName, etaMin: res.etaMin, position: res.position, serviceName: res.serviceName });
      setStep("done");
    });
  }

  return (
    <div className="w-full">
      {step === "welcome" && <Welcome shopName={shopName} onStart={() => setStep("identify")} />}

      {step === "identify" && (
        <Identify
          onPick={(c) => { setClient({ id: c.id, name: c.name }); setStep("service"); }}
          onNew={() => setStep("register")}
          onBack={reset}
        />
      )}

      {step === "register" && (
        <Register
          referral={newReferral}
          setReferral={setNewReferral}
          onBack={() => setStep("identify")}
          onDone={(c) => { setClient(c); setStep("service"); }}
        />
      )}

      {step === "service" && (
        <ServicePicker
          name={client?.name ?? ""}
          services={services}
          onPick={pickService}
          onBack={() => setStep("identify")}
        />
      )}

      {step === "barber" && service && (
        <BarberPicker
          service={service}
          pending={pending}
          error={error}
          onChoose={doCheckIn}
          onBack={() => { setError(null); setStep("service"); }}
        />
      )}

      {step === "done" && result && (
        <Done result={result} onDone={reset} />
      )}
    </div>
  );
}

/* ── Screens ─────────────────────────────────────────────────────────── */

function Welcome({ shopName, onStart }: { shopName: string; onStart: () => void }) {
  return (
    <div className="text-center">
      <h1 className="font-display text-4xl sm:text-5xl">Welcome to {shopName}</h1>
      <p className="mt-3 text-lg text-cream/60">Tap below to check in for a cut.</p>
      <button
        onClick={onStart}
        className="mt-10 w-full rounded-2xl py-6 text-2xl font-semibold shadow-xl transition active:scale-[0.99]"
        style={brand}
      >
        Check in →
      </button>
      <p className="mt-6 text-sm text-cream/40">Walk-ins welcome · No account needed</p>
    </div>
  );
}

function Identify({
  onPick, onNew, onBack,
}: {
  onPick: (c: KioskClient) => void;
  onNew: () => void;
  onBack: () => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<KioskClient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 3) { setResults([]); setSearched(false); setSearching(false); return; }
    let alive = true;
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await kioskSearchClients(query);
      if (!alive) return; // debounced/unmounted — drop stale results
      setResults(r);
      setSearching(false);
      setSearched(true);
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  return (
    <div>
      <ScreenHead title="Find your account" subtitle="Enter your phone number, email, or name." onBack={onBack} />
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        inputMode="text"
        placeholder="e.g. 555-123-4567"
        className="input mt-6 !py-4 !text-lg"
      />

      <div className="mt-4 space-y-2">
        {searching && <p className="text-sm text-cream/40">Searching…</p>}
        {results.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-left transition hover:border-white/30"
          >
            <span>
              <span className="block text-lg font-medium">{c.name}</span>
              <span className="block text-sm text-cream/40">
                {[c.phoneMasked, c.emailMasked].filter(Boolean).join(" · ") || "No contact on file"}
              </span>
            </span>
            <span className="text-brass">That&apos;s me →</span>
          </button>
        ))}
        {searched && !searching && results.length === 0 && (
          <p className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-cream/50">
            No match found — tap “I&apos;m new here” below to register.
          </p>
        )}
      </div>

      <button
        onClick={onNew}
        className="mt-6 w-full rounded-2xl border border-white/15 py-5 text-lg font-medium transition hover:bg-white/5"
      >
        I&apos;m new here — register
      </button>
    </div>
  );
}

function Register({
  referral, setReferral, onBack, onDone,
}: {
  referral: string;
  setReferral: (v: string) => void;
  onBack: () => void;
  onDone: (c: Client) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const canSubmit = firstName.trim() && lastName.trim() && phone.replace(/\D/g, "").length >= 7 && !pending;

  function submit() {
    setError(null);
    start(async () => {
      const res = await kioskRegisterClient({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
      });
      if ("error" in res) { setError(res.error); return; }
      onDone({ id: res.id, name: res.name });
    });
  }

  return (
    <div>
      <ScreenHead title="Welcome! Let&apos;s get you set up" subtitle="This takes about 20 seconds." onBack={onBack} />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="First name" required>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus className="input !py-3.5 !text-lg" />
        </Field>
        <Field label="Last name" required>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="input !py-3.5 !text-lg" />
        </Field>
        <Field label="Phone" required>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="(555) 123-4567" className="input !py-3.5 !text-lg" />
        </Field>
        <Field label="Email (optional)">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" className="input !py-3.5 !text-lg" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Address (optional)">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="input !py-3.5 !text-lg" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="How did you hear about us? (optional)">
            <select value={referral} onChange={(e) => setReferral(e.target.value)} className="input !py-3.5 !text-lg">
              <option value="">Prefer not to say</option>
              {REFERRAL_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200">{error}</p>}

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="mt-6 w-full rounded-2xl py-5 text-xl font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        style={brand}
      >
        {pending ? "Saving…" : "Continue →"}
      </button>
    </div>
  );
}

function ServicePicker({
  name, services, onPick, onBack,
}: {
  name: string;
  services: Service[];
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  const first = name.split(" ")[0];
  return (
    <div>
      <ScreenHead title={first ? `Hi ${first}! What are you here for?` : "What are you here for?"} subtitle="Choose a service." onBack={onBack} />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-left transition hover:border-white/30"
          >
            <span>
              <span className="block text-lg font-medium">{s.name}</span>
              <span className="block text-sm text-cream/40">{formatDuration(s.durationMin)}</span>
            </span>
            <span className="text-lg font-semibold text-brass">{formatMoney(s.priceCents)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BarberPicker({
  service, pending, error, onChoose, onBack,
}: {
  service: Service;
  pending: boolean;
  error: string | null;
  onChoose: (barberId: string | null) => void;
  onBack: () => void;
}) {
  const [barbers, setBarbers] = useState<BarberOption[] | null>(null);

  useEffect(() => {
    let alive = true;
    kioskBarberOptions(service.id).then((b) => { if (alive) setBarbers(b); });
    return () => { alive = false; };
  }, [service.id]);

  const soonest = barbers && barbers.filter((b) => b.etaMin !== null).sort((a, b) => a.etaMin! - b.etaMin!)[0];

  return (
    <div>
      <ScreenHead title="Pick your barber" subtitle={`${service.name} · ${formatDuration(service.durationMin)}`} onBack={onBack} />

      <button
        onClick={() => onChoose(null)}
        disabled={pending}
        className="mt-6 flex w-full items-center justify-between rounded-2xl px-6 py-5 text-left shadow-lg transition active:scale-[0.99] disabled:opacity-50"
        style={brand}
      >
        <span>
          <span className="block text-xl font-semibold">Next available barber</span>
          <span className="block text-sm opacity-80">
            {soonest ? `Fastest — ${waitLabel(soonest.etaMin)}` : "Get seen as soon as possible"}
          </span>
        </span>
        <span className="text-2xl">→</span>
      </button>

      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-cream/30">
        <span className="h-px flex-1 bg-white/10" /> or choose a barber <span className="h-px flex-1 bg-white/10" />
      </div>

      {barbers === null ? (
        <p className="text-sm text-cream/40">Checking wait times…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {barbers.map((b) => (
            <button
              key={b.id}
              onClick={() => onChoose(b.id)}
              disabled={pending || b.etaMin === null}
              className={classNames(
                "flex items-center gap-3 rounded-xl border px-5 py-4 text-left transition",
                b.etaMin === null ? "border-white/5 opacity-40" : "border-white/10 bg-white/5 hover:border-white/30",
              )}
            >
              {b.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.avatarUrl} alt={b.name} className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <span className="grid h-11 w-11 place-items-center rounded-full bg-smoke text-cream/60">{b.name.charAt(0)}</span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-lg font-medium">{b.name}</span>
                <span className={classNames("block text-sm", b.etaMin !== null && b.etaMin <= 3 ? "text-emerald-300" : "text-cream/40")}>
                  {waitLabel(b.etaMin)}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200">{error}</p>}
      {pending && <p className="mt-4 text-center text-cream/50">Checking you in…</p>}
    </div>
  );
}

function Done({ result, onDone }: { result: CheckInResult; onDone: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full text-4xl" style={brand}>✓</div>
      <h1 className="mt-6 font-display text-4xl">You&apos;re checked in!</h1>
      <p className="mt-3 text-lg text-cream/70">
        <span className="text-cream">{result.barberName}</span> will take care of your <span className="text-cream">{result.serviceName}</span>.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 py-5">
          <div className="text-3xl font-bold text-brass">{result.etaMin <= 3 ? "Now" : `~${result.etaMin}m`}</div>
          <div className="mt-1 text-sm text-cream/50">Estimated wait</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 py-5">
          <div className="text-3xl font-bold text-brass">#{result.position}</div>
          <div className="mt-1 text-sm text-cream/50">In line</div>
        </div>
      </div>
      <p className="mt-6 text-cream/50">Please have a seat — we&apos;ll call your name.</p>
      <button onClick={onDone} className="mt-8 w-full rounded-2xl border border-white/15 py-4 text-lg font-medium transition hover:bg-white/5">
        Done
      </button>
    </div>
  );
}

/* ── Bits ────────────────────────────────────────────────────────────── */

function ScreenHead({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <div>
      <button onClick={onBack} className="text-sm text-cream/40 transition hover:text-cream">← Back</button>
      <h1 className="mt-3 font-display text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-cream/60">{subtitle}</p>}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label} {required && <span className="text-flame">*</span>}</span>
      {children}
    </label>
  );
}
