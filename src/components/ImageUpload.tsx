"use client";

import { useRef, useState } from "react";
import { compressToDataUrl } from "@/lib/clientImage";

// Generic image uploader: compresses on the client to a data URL, then submits
// a one-field server action. Renders its own <form>, so keep it OUTSIDE any
// other <form> (nested forms are invalid HTML).
export function ImageUpload({
  action, label = "image", hasImage = false, maxW = 900,
}: {
  action: (formData: FormData) => void | Promise<void>;
  label?: string;
  hasImage?: boolean;
  maxW?: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setWorking(true);
    try {
      const url = await compressToDataUrl(file, maxW);
      if (hiddenRef.current) hiddenRef.current.value = url;
      formRef.current?.requestSubmit();
    } finally {
      setWorking(false);
    }
  }

  return (
    <form action={action} ref={formRef}>
      <input type="hidden" name="imageUrl" ref={hiddenRef} />
      <label className="inline-flex cursor-pointer items-center rounded-full border border-white/10 px-3 py-1.5 text-xs text-cream/70 hover:bg-white/5">
        {working ? "Uploading…" : hasImage ? `Change ${label}` : `Add ${label}`}
        <input type="file" accept="image/*" className="hidden" onChange={onFile} />
      </label>
    </form>
  );
}
