"use client";

import { useRef, useState } from "react";
import { compressToDataUrl } from "@/lib/clientImage";

// Per-service photo upload: compresses on the client, then submits the server action.
export function ServicePhotoForm({
  action,
  hasImage,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hasImage: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setWorking(true);
    try {
      const url = await compressToDataUrl(file);
      if (hiddenRef.current) hiddenRef.current.value = url;
      formRef.current?.requestSubmit();
    } finally {
      setWorking(false);
    }
  }

  return (
    <form action={action} ref={formRef}>
      <input type="hidden" name="imageUrl" ref={hiddenRef} />
      <label className="cursor-pointer rounded-full border border-white/10 px-3 py-1.5 text-xs text-cream/70 hover:bg-white/5">
        {working ? "Uploading…" : hasImage ? "Change photo" : "Add photo"}
        <input type="file" accept="image/*" className="hidden" onChange={onFile} />
      </label>
    </form>
  );
}
