import Link from "next/link";
import { Icon, type IconName } from "@/components/home/icons";

export const dynamic = "force-dynamic";

const INFO: Record<string, { icon: IconName; desc: string; bullets: string[] }> = {
  Inventory: { icon: "inventory", desc: "Track product levels, low-stock alerts, suppliers, and purchase orders.", bullets: ["Live stock levels & usage", "Low-stock alerts", "Suppliers & purchase orders"] },
  Marketing: { icon: "marketing", desc: "Fill your chairs with campaigns, promotions, and referral tracking.", bullets: ["Email & SMS campaigns", "Promotions & referrals", "Rebooking reminders"] },
  Financials: { icon: "dollar", desc: "Deep financial reporting, payouts, commissions, and tax-ready exports.", bullets: ["Revenue & payouts", "Commission tracking", "Exports for accounting"] },
  Messages: { icon: "messages", desc: "Two-way messaging with clients — confirmations, reminders, and replies.", bullets: ["Client conversations", "Automated reminders", "Templates"] },
};

export default async function SoonPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const sp = await searchParams;
  const name = sp.s && INFO[sp.s] ? sp.s : "This feature";
  const info = INFO[name] ?? { icon: "spark" as IconName, desc: "This premium module is on the way.", bullets: [] };
  const I = Icon[info.icon];

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center text-center">
      <div className="p-panel w-full p-10">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-brass/25 bg-gradient-to-br from-brass/15 to-transparent text-brass">
          <I className="h-8 w-8" />
        </span>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-brass/25 bg-brass/[0.06] px-3 py-1 text-xs text-brass/90">
          <span className="p-live-dot h-1.5 w-1.5 rounded-full bg-brass" /> In development
        </div>
        <h1 className="mt-4 font-display text-3xl text-cream">{name}</h1>
        <p className="mx-auto mt-2 max-w-md text-cream/55">{info.desc}</p>

        {info.bullets.length > 0 && (
          <ul className="mx-auto mt-6 max-w-xs space-y-2 text-left">
            {info.bullets.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm text-cream/70"><Icon.check className="h-4 w-4 shrink-0 text-brass" />{b}</li>
            ))}
          </ul>
        )}

        <Link href="/portal" className="p-btn-gold mx-auto mt-8"><Icon.home className="h-4 w-4" /> Back to Dashboard</Link>
      </div>
    </div>
  );
}
