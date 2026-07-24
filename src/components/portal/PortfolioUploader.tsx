"use client";

import { useRef, useState } from "react";
import { compressToDataUrl } from "@/lib/clientImage";

// Pick a photo (compressed on the client to a data URL) + optional caption, then
// post it to the shop gallery. Renders its own <form> for the server action.
export function PortfolioUploader({ action }: { action: (fd: FormData) => void | Promise<void> }) {
  const formRef = useRef<HTMLFormElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [working, setWorking] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setWorking(true);
    try {
      const url = await compressToDataUrl(file, 1200);
      setPreview(url);
      if (hiddenRef.current) hiddenRef.current.value = url;
    } finally {
      setWorking(false);
    }
  }

  function reset() {
    setPreview(null);
    setCaption("");
    if (hiddenRef.current) hiddenRef.current.value = "";
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={() => setTimeout(reset, 0)}
      className="lux-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
    >
      <input type="hidden" name="imageUrl" ref={hiddenRef} />

      <label className="grid h-24 w-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-brass/40 bg-white/[0.02] text-center text-xs text-cream/50 transition hover:border-brass/70">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="preview" className="h-full w-full object-cover" />
        ) : (
          <span>{working ? "…" : "+ Photo"}</span>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={onFile} />
      </label>

      <input
        name="caption"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        maxLength={140}
        placeholder="Caption (optional) — e.g. Skin fade + beard line-up"
        className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm text-cream placeholder:text-cream/25 transition focus:border-brass/60 focus:outline-none"
      />

      <button type="submit" disabled={!preview || working} className="btn-gold shrink-0 disabled:opacity-40">
        Add to gallery
      </button>
    </form>
  );
}
