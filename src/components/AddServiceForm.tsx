"use client";

import { useRef, useState } from "react";
import { compressToDataUrl } from "@/lib/clientImage";

type BarberLite = { id: string; name: string };

export function AddServiceForm({
  action,
  barbers,
}: {
  action: (formData: FormData) => void | Promise<void>;
  barbers: BarberLite[];
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const hiddenRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setWorking(true);
    try {
      const url = await compressToDataUrl(file);
      if (hiddenRef.current) hiddenRef.current.value = url;
      setPreview(url);
    } finally {
      setWorking(false);
    }
  }

  return (
    <form action={action} className="mt-4 space-y-3">
      <div><label className="label">Name</label><input name="name" required className="input" /></div>
      <div><label className="label">Description</label><input name="description" className="input" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Price ($)</label><input name="price" type="number" step="0.01" min="0" defaultValue="35" className="input" /></div>
        <div><label className="label">Minutes</label><input name="durationMin" type="number" min="5" step="5" defaultValue="30" className="input" /></div>
      </div>
      <div>
        <label className="label">Barber (optional)</label>
        <select name="barberId" className="input">
          <option value="">Any barber</option>
          {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Photo</label>
        <input type="hidden" name="imageUrl" ref={hiddenRef} />
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="mb-2 h-28 w-full rounded-lg object-cover" />
        )}
        <input type="file" accept="image/*" onChange={onFile} className="block w-full text-xs text-cream/60 file:mr-3 file:rounded-full file:border-0 file:bg-brass/20 file:px-3 file:py-1.5 file:text-brass" />
        {working && <p className="mt-1 text-xs text-cream/40">Processing image…</p>}
      </div>
      <button className="btn-primary w-full">Add service</button>
    </form>
  );
}
