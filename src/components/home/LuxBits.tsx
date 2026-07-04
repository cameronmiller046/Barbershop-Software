import Link from "next/link";
import { Reveal } from "@/components/home/motion";
import { Icon } from "@/components/home/icons";

export function LuxHeading({ eyebrow, title, sub, center = true }: { eyebrow?: string; title: React.ReactNode; sub?: string; center?: boolean }) {
  return (
    <Reveal className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.24em] text-brass/80">{eyebrow}</div>}
      <h2 className="mt-3 font-display text-4xl font-medium tracking-tight text-cream sm:text-[2.7rem]">{title}</h2>
      {sub && <p className="mt-4 text-lg text-cream/60">{sub}</p>}
    </Reveal>
  );
}

type Action = { label: string; href: string; primary?: boolean };

export function LuxCTA({ title, sub, actions }: { title: React.ReactNode; sub: string; actions: Action[] }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] border border-brass/20 px-6 py-20 text-center sm:px-16">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(216,178,92,0.22),transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#100e0a] to-[#0a0908]" />
          <h2 className="mx-auto max-w-2xl font-display text-4xl font-medium leading-tight tracking-tight text-cream sm:text-5xl">{title}</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-cream/60">{sub}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            {actions.map((a) => (
              <Link key={a.label} href={a.href} className={`${a.primary ? "btn-gold" : "btn-outline-gold"} text-base`}>
                {a.label}{a.primary && <Icon.arrow className="h-4 w-4" />}
              </Link>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
