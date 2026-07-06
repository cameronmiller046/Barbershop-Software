"use client";

import { useState } from "react";
import { useDemo, serviceById, customerById } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Btn, Field, Modal, Avatar, SandboxNote } from "@/components/demo/ui";
import { Icon } from "@/components/home/icons";

const PALETTE = [
  ["#3f3f46", "#27272a", "#d8b25c", "#a9772f"],
  ["#334155", "#1e293b", "#34d399", "#059669"],
  ["#57534e", "#292524", "#38bdf8", "#0284c7"],
  ["#44403c", "#1c1917", "#f472b6", "#db2777"],
  ["#3b3b52", "#232336", "#a855f7", "#7c3aed"],
];

export default function PhotosPage() {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const mine = state.photos.filter((p) => p.staffId === state.currentStaffId);

  return (
    <>
      <PageHeader title="Before / After" subtitle="Your portfolio — show off your best transformations."
        actions={<Btn variant="gold" onClick={() => setAdding(true)}><Icon.plus className="h-4 w-4" /> Add photos</Btn>} />

      <SandboxNote>Photos here are placeholder gradients — no camera, no uploads, nothing stored.</SandboxNote>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mine.map((p) => {
          const cust = customerById(state, p.customerId);
          const svc = serviceById(state, p.serviceId);
          return (
            <Panel key={p.id} pad={false} className="overflow-hidden">
              <div className="grid grid-cols-2">
                <div className="relative aspect-square" style={{ background: p.beforeStyle }}><span className="absolute left-2 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">Before</span></div>
                <div className="relative aspect-square" style={{ background: p.afterStyle }}><span className="absolute right-2 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">After</span></div>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <Avatar name={cust?.name ?? "?"} size={26} />
                  <div className="min-w-0"><div className="truncate text-sm text-cream">{cust?.name}</div><div className="text-xs text-cream/45">{svc?.name}</div></div>
                </div>
                {p.note && <p className="mt-2 text-xs text-cream/55">{p.note}</p>}
                <div className="mt-2 text-[11px] text-cream/35">{new Date(p.createdISO).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
              </div>
            </Panel>
          );
        })}
      </div>

      {adding && <AddPhotos onClose={() => setAdding(false)} count={state.photos.length} />}
    </>
  );

  function AddPhotos({ onClose, count }: { onClose: () => void; count: number }) {
    const [customerId, setCustomerId] = useState(state.customers[0]?.id ?? "");
    const [serviceId, setServiceId] = useState(state.services[0]?.id ?? "");
    const [note, setNote] = useState("");
    const save = () => {
      const pal = PALETTE[count % PALETTE.length];
      actions.addPhoto({
        customerId, serviceId, staffId: state.currentStaffId, createdISO: new Date().toISOString(), note,
        beforeStyle: `linear-gradient(135deg, ${pal[0]}, ${pal[1]})`,
        afterStyle: `linear-gradient(135deg, ${pal[2]}, ${pal[3]})`,
      });
      toast("Photos added to portfolio");
      onClose();
    };
    return (
      <Modal open onClose={onClose} title="Add before / after"
        footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="gold" onClick={save}>Add to portfolio</Btn></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="grid aspect-square place-items-center rounded-xl border border-dashed border-white/15 text-cream/40"><div className="text-center"><Icon.plus className="mx-auto h-6 w-6" /><span className="text-xs">Before</span></div></div>
            <div className="grid aspect-square place-items-center rounded-xl border border-dashed border-white/15 text-cream/40"><div className="text-center"><Icon.plus className="mx-auto h-6 w-6" /><span className="text-xs">After</span></div></div>
          </div>
          <Field label="Client"><select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>{state.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Service"><select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>{state.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Note"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Skin fade with textured top" /></Field>
        </div>
      </Modal>
    );
  }
}
