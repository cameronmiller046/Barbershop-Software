"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setStatus } from "@/app/admin/dev/actions";
import { STATUS_ORDER, STATUS_META, TYPE_META, PRIORITY_META, type TicketStatus } from "@/lib/tickets";

export type BoardTicket = {
  id: string; ref: string; type: string; title: string; status: TicketStatus;
  priority: string; assigneeName: string | null; tenantName: string | null; comments: number;
};

export function DevBoard({ tickets: initial }: { tickets: BoardTicket[] }) {
  const router = useRouter();
  const [tickets, setTickets] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TicketStatus | null>(null);

  const drop = async (status: TicketStatus) => {
    setOver(null);
    const id = dragId; setDragId(null);
    if (!id) return;
    const cur = tickets.find((t) => t.id === id);
    if (!cur || cur.status === status) return;
    setTickets((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t))); // optimistic
    await setStatus(id, status);
    router.refresh();
  };

  return (
    <div className="overflow-x-auto p-scroll -mx-1 pb-3">
      <div className="flex gap-3 px-1" style={{ minWidth: "max-content" }}>
        {STATUS_ORDER.map((status) => {
          const col = tickets.filter((t) => t.status === status);
          const m = STATUS_META[status];
          return (
            <div key={status} onDragOver={(e) => { e.preventDefault(); setOver(status); }} onDragLeave={() => setOver((o) => (o === status ? null : o))} onDrop={() => drop(status)}
              className={`w-[248px] shrink-0 rounded-2xl border p-2 transition ${over === status ? "border-brass/50 bg-brass/[0.05]" : "border-white/8 bg-white/[0.015]"}`}>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: m.color }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />{m.label}
                </span>
                <span className="text-xs text-cream/35">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.map((t) => (
                  <Link key={t.id} href={`/admin/dev/${t.id}`} draggable
                    onDragStart={() => setDragId(t.id)} onDragEnd={() => setDragId(null)}
                    className={`block cursor-grab rounded-xl border border-white/10 bg-[#151318] p-3 shadow-sm transition hover:border-brass/40 active:cursor-grabbing ${dragId === t.id ? "opacity-40" : ""}`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] text-cream/40"><span>{TYPE_META[t.type as keyof typeof TYPE_META].emoji}</span><span className="font-mono">{t.ref}</span></span>
                      <span className="h-2 w-2 rounded-full" title={PRIORITY_META[t.priority as keyof typeof PRIORITY_META].label} style={{ background: PRIORITY_META[t.priority as keyof typeof PRIORITY_META].color }} />
                    </div>
                    <div className="mt-1.5 line-clamp-2 text-sm text-cream">{t.title}</div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-cream/40">
                      <span className="truncate">{t.tenantName ?? "—"}</span>
                      <span>{t.assigneeName ? t.assigneeName.split(" ")[0] : "Unassigned"}</span>
                    </div>
                  </Link>
                ))}
                {col.length === 0 && <div className="rounded-lg border border-dashed border-white/8 py-4 text-center text-[11px] text-cream/25">Drop here</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
