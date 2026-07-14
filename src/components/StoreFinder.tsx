"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Pick a store from the list and jump to its public site.
export function StoreFinder({ stores }: { stores: { slug: string; label: string }[] }) {
  const [slug, setSlug] = useState(stores[0]?.slug ?? "");
  const router = useRouter();
  if (stores.length === 0) return null;
  return (
    <div className="flex gap-2">
      <select value={slug} onChange={(e) => setSlug(e.target.value)} className="c-input">
        {stores.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
      </select>
      <button type="button" onClick={() => slug && router.push(`/t/${slug}`)}
        className="p-btn-ghost whitespace-nowrap px-4">Visit</button>
    </div>
  );
}
