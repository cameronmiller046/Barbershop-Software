"use client";

import { useState } from "react";

/**
 * Two-step delete: reveals a confirmation form where the Superadmin must type the
 * exact store name. The bound server action re-checks the name before deleting.
 */
export function DeleteStoreButton({
  action,
  storeName,
}: {
  action: (formData: FormData) => void | Promise<void>;
  storeName: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-red-500/30 px-3 py-1 text-red-300 hover:bg-red-500/10"
      >
        Delete store
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <p className="text-[11px] text-cream/50">
        Type <b className="text-cream/80">{storeName}</b> to permanently delete it and all its data.
      </p>
      <div className="flex gap-1">
        <input
          name="confirmName"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Store name"
          className="rounded-md border border-white/10 bg-smoke px-2 py-1 text-xs text-cream outline-none focus:border-red-400"
        />
        <button
          type="submit"
          disabled={typed.trim() !== storeName}
          className="rounded-full bg-red-500/20 px-3 py-1 text-red-200 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirm delete
        </button>
        <button type="button" onClick={() => { setOpen(false); setTyped(""); }} className="rounded-full px-3 py-1 text-cream/50 hover:bg-white/5">
          Cancel
        </button>
      </div>
    </form>
  );
}
