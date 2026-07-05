"use client";

import { useState } from "react";
import { updateWebsiteContent, setTenantImage } from "@/app/portal/actions";
import { ImageUpload } from "@/components/ImageUpload";
import { Icon, type IconName } from "@/components/home/icons";
import { QMARK } from "@/lib/placeholder";

export type CmsTenant = {
  name: string; slug: string; tagline: string | null; description: string | null; website: string | null;
  phone: string | null; email: string | null; address: string | null;
  heroHeadline: string | null; heroSubheading: string | null; heroCtaText: string | null; announcement: string | null;
  instagramUrl: string | null; facebookUrl: string | null; tiktokUrl: string | null; xUrl: string | null; youtubeUrl: string | null;
  metaTitle: string | null; metaDescription: string | null; accentColor: string | null;
  logoUrl: string | null; faviconUrl: string | null; heroImageUrl: string | null; coverImageUrl: string | null;
  showBarbers: boolean; showGallery: boolean; showReviews: boolean; showFaq: boolean;
};

const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: "business", label: "Business Info", icon: "store" },
  { id: "homepage", label: "Homepage", icon: "home" },
  { id: "media", label: "Media", icon: "spark" },
  { id: "seo", label: "Social & SEO", icon: "gauge" },
  { id: "sections", label: "Sections", icon: "settings" },
];

export function WebsiteCMS({ t, siteUrl, saved }: { t: CmsTenant; siteUrl: string; saved: boolean }) {
  const [tab, setTab] = useState("business");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-cream sm:text-3xl">Website Content</h1>
          <p className="mt-1 text-cream/55">Edit your public storefront — changes go live instantly.</p>
        </div>
        <a href={siteUrl} target="_blank" rel="noreferrer" className="p-btn-ghost"><Icon.arrow className="h-4 w-4" /> View live site ↗</a>
      </div>

      {saved && <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">✓ Saved — your storefront is updated.</div>}

      {/* Tabs */}
      <div className="p-scroll mt-6 flex gap-1 overflow-x-auto border-b border-white/10 pb-px">
        {TABS.map((x) => {
          const I = Icon[x.icon];
          return (
            <button key={x.id} onClick={() => setTab(x.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm transition ${tab === x.id ? "border-b-2 border-brass text-brass" : "text-cream/55 hover:text-cream"}`}>
              <I className="h-4 w-4" /> {x.label}
            </button>
          );
        })}
      </div>

      {/* One content form — all tabs stay mounted so nothing is nulled on save. */}
      <form action={updateWebsiteContent} className="mt-6">
        <Group show={tab === "business"}>
          <Field label="Shop name"><input name="name" defaultValue={t.name} required className="input" /></Field>
          <Field label="Tagline"><input name="tagline" defaultValue={t.tagline ?? ""} placeholder="Sharp cuts in the heart of the city" className="input" /></Field>
          <Field label="About / business description" full>
            <textarea name="description" defaultValue={t.description ?? ""} rows={4} placeholder="Tell customers what makes your shop special…" className="input min-h-[110px]" />
          </Field>
          <Field label="Website"><input name="website" defaultValue={t.website ?? ""} placeholder="https://…" className="input" /></Field>
          <Field label="Phone"><input name="phone" defaultValue={t.phone ?? ""} className="input" /></Field>
          <Field label="Email"><input name="email" type="email" defaultValue={t.email ?? ""} className="input" /></Field>
          <Field label="Address" full><input name="address" defaultValue={t.address ?? ""} placeholder="123 Main St, City, ST 00000" className="input" /></Field>
        </Group>

        <Group show={tab === "homepage"}>
          <Field label="Announcement banner" full>
            <input name="announcement" defaultValue={t.announcement ?? ""} placeholder="e.g. Walk-ins welcome this weekend — 20% off fades!" className="input" />
            <p className="mt-1 text-xs text-cream/40">Shown across the top of your storefront. Leave blank to hide.</p>
          </Field>
          <Field label="Hero headline" full><input name="heroHeadline" defaultValue={t.heroHeadline ?? ""} placeholder="Look Sharp. Feel the Part." className="input" /></Field>
          <Field label="Hero subheading" full><textarea name="heroSubheading" defaultValue={t.heroSubheading ?? ""} rows={2} placeholder="Precision fades, classic cuts, and beard work…" className="input" /></Field>
          <Field label="Book button text"><input name="heroCtaText" defaultValue={t.heroCtaText ?? ""} placeholder="Book Appointment" className="input" /></Field>
        </Group>

        <Group show={tab === "seo"}>
          <Field label="Instagram URL"><input name="instagramUrl" defaultValue={t.instagramUrl ?? ""} placeholder="https://instagram.com/yourshop" className="input" /></Field>
          <Field label="Facebook URL"><input name="facebookUrl" defaultValue={t.facebookUrl ?? ""} placeholder="https://facebook.com/yourshop" className="input" /></Field>
          <Field label="TikTok URL"><input name="tiktokUrl" defaultValue={t.tiktokUrl ?? ""} placeholder="https://tiktok.com/@yourshop" className="input" /></Field>
          <Field label="X (Twitter) URL"><input name="xUrl" defaultValue={t.xUrl ?? ""} placeholder="https://x.com/yourshop" className="input" /></Field>
          <Field label="YouTube URL"><input name="youtubeUrl" defaultValue={t.youtubeUrl ?? ""} placeholder="https://youtube.com/@yourshop" className="input" /></Field>
          <Field label="Accent color">
            <div className="flex items-center gap-2">
              <input name="accentColor" defaultValue={t.accentColor ?? ""} placeholder="#c9a24b" className="input" />
              <span className="h-9 w-9 shrink-0 rounded-lg border border-white/15" style={{ background: t.accentColor || "transparent" }} />
            </div>
          </Field>
          <Field label="SEO meta title" full><input name="metaTitle" defaultValue={t.metaTitle ?? ""} placeholder="Auto-generated if blank" className="input" /></Field>
          <Field label="SEO meta description" full><textarea name="metaDescription" defaultValue={t.metaDescription ?? ""} rows={3} placeholder="Auto-generated if blank" className="input" /></Field>
        </Group>

        <Group show={tab === "sections"}>
          <p className="sm:col-span-2 text-sm text-cream/55">Show or hide sections on your storefront. Booking, Services, and Contact are always shown.</p>
          {([["showBarbers", "Meet the Barbers"], ["showGallery", "Gallery"], ["showReviews", "Reviews"], ["showFaq", "FAQ"]] as const).map(([k, label]) => (
            <label key={k} className="col-span-1 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <span className="text-sm text-cream">{label}</span>
              <input type="checkbox" name={k} defaultChecked={t[k]} className="h-5 w-5 accent-[var(--brand)]" />
            </label>
          ))}
        </Group>

        {tab !== "media" && (
          <div className="mt-6 flex items-center gap-3">
            <button className="p-btn-gold">Save changes</button>
            <span className="text-xs text-cream/40">Applies to your live storefront immediately.</span>
          </div>
        )}
      </form>

      {/* Media lives outside the content form (image uploads are their own forms). */}
      {tab === "media" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <MediaCard title="Logo" hint="Square, shown in the nav & footer." img={t.logoUrl} field="logoUrl" maxW={400} round />
          <MediaCard title="Favicon" hint="Browser-tab icon (square)." img={t.faviconUrl} field="faviconUrl" maxW={96} round />
          <MediaCard title="Hero background" hint="Large photo behind the hero headline." img={t.heroImageUrl} field="heroImageUrl" maxW={1600} wide />
          <MediaCard title="Cover / share image" hint="Used when your site is shared on social." img={t.coverImageUrl} field="coverImageUrl" maxW={1600} wide />
        </div>
      )}
    </div>
  );
}

function MediaCard({ title, hint, img, field, maxW, round, wide }: { title: string; hint: string; img: string | null; field: "logoUrl" | "faviconUrl" | "heroImageUrl" | "coverImageUrl"; maxW: number; round?: boolean; wide?: boolean }) {
  return (
    <div className="p-panel p-5">
      <div className="text-sm font-semibold text-cream">{title}</div>
      <p className="mt-0.5 text-xs text-cream/45">{hint}</p>
      <div className="mt-4 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img || QMARK} alt={title} className={`shrink-0 border border-white/10 object-cover ${round ? "h-16 w-16 rounded-full" : ""} ${wide ? "h-16 w-28 rounded-lg" : ""} ${!round && !wide ? "h-16 w-16 rounded-lg" : ""}`} />
        <ImageUpload action={setTenantImage.bind(null, field)} label={title.toLowerCase()} hasImage={!!img} maxW={maxW} />
      </div>
    </div>
  );
}

function Group({ show, children }: { show: boolean; children: React.ReactNode }) {
  return <div className={`grid gap-4 sm:grid-cols-2 ${show ? "" : "hidden"}`}>{children}</div>;
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-cream/50">{label}</span>
      {children}
    </label>
  );
}
