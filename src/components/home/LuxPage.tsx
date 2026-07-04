import { LuxNav } from "@/components/home/LuxNav";
import { Footer } from "@/components/home/Footer";

const EMBERS = [
  { l: "8%", s: 3, d: 14, delay: 0 }, { l: "18%", s: 2, d: 18, delay: 3 },
  { l: "28%", s: 4, d: 12, delay: 6 }, { l: "40%", s: 2, d: 20, delay: 1 },
  { l: "52%", s: 3, d: 15, delay: 4 }, { l: "63%", s: 2, d: 19, delay: 8 },
  { l: "72%", s: 4, d: 13, delay: 2 }, { l: "83%", s: 3, d: 17, delay: 5 },
  { l: "92%", s: 2, d: 21, delay: 7 }, { l: "35%", s: 3, d: 16, delay: 9 },
];

/** Shared luxury marketing shell — cinematic atmosphere + nav + footer, so every
 *  marketing page matches the homepage and pricing page exactly. */
export function LuxPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="lux relative min-h-screen">
      <div className="lux-atmosphere" aria-hidden />
      <div className="lux-grain" aria-hidden />
      <div className="lux-embers absolute inset-x-0 top-0 h-[110vh]" aria-hidden>
        {EMBERS.map((e, i) => (
          <span key={i} className="lux-ember" style={{ left: e.l, width: e.s, height: e.s, animationDuration: `${e.d}s`, animationDelay: `${e.delay}s` }} />
        ))}
      </div>
      <LuxNav />
      <main className="relative">{children}</main>
      <Footer />
    </div>
  );
}
