"use client";

import { useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Btn, Field, Modal, Money, Tag } from "@/components/demo/ui";
import { Icon } from "@/components/home/icons";
import { formatDuration } from "@/lib/utils";
import type { Service } from "@/lib/demo/types";

export default function ServicesPage() {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Service | "new" | null>(null);

  const cats = [...new Set(state.services.map((s) => s.category))];

  return (
    <>
      <PageHeader title="Services" subtitle="Your menu of cuts, shaves and add-ons."
        actions={<Btn variant="gold" onClick={() => setEditing("new")}><Icon.plus className="h-4 w-4" /> Add service</Btn>} />

      <div className="space-y-6">
        {cats.map((cat) => (
          <div key={cat}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-cream/60">{cat}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {state.services.filter((s) => s.category === cat).map((s) => (
                <div key={s.id} className={`p-panel p-4 ${!s.active ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brass/12 text-brass"><Icon.scissors className="h-5 w-5" /></span>
                      <div>
                        <div className="font-medium text-cream">{s.name}</div>
                        <div className="text-xs text-cream/45">{formatDuration(s.durationMin)}</div>
                      </div>
                    </div>
                    {!s.active && <Tag tone="red">Hidden</Tag>}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-cream/50">{s.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-semibold text-brass"><Money cents={s.priceCents} /></span>
                    <div className="flex gap-1.5">
                      <button onClick={() => { actions.updateService(s.id, { active: !s.active }); toast(s.active ? "Service hidden" : "Service published"); }}
                        className="rounded-full border border-white/12 px-2.5 py-1 text-xs text-cream/70 hover:border-brass/40">
                        {s.active ? "Hide" : "Show"}
                      </button>
                      <button onClick={() => setEditing(s)} className="rounded-full border border-white/12 px-2.5 py-1 text-xs text-cream/70 hover:border-brass/40">Edit</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editing && <ServiceModal svc={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );

  function ServiceModal({ svc, onClose }: { svc: Service | null; onClose: () => void }) {
    const [name, setName] = useState(svc?.name ?? "");
    const [category, setCategory] = useState(svc?.category ?? "Hair");
    const [price, setPrice] = useState(((svc?.priceCents ?? 3500) / 100).toString());
    const [dur, setDur] = useState((svc?.durationMin ?? 30).toString());
    const [desc, setDesc] = useState(svc?.description ?? "");

    const save = () => {
      if (!name.trim()) return;
      const patch = { name: name.trim(), category, priceCents: Math.round(parseFloat(price || "0") * 100), durationMin: parseInt(dur || "30", 10), description: desc };
      if (svc) { actions.updateService(svc.id, patch); toast("Service updated"); }
      else { actions.addService({ ...patch, active: true }); toast("Service added"); }
      onClose();
    };
    return (
      <Modal open onClose={onClose} title={svc ? "Edit service" : "Add service"}
        footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="gold" onClick={save}>{svc ? "Save changes" : "Add service"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {["Hair", "Beard", "Shave", "Combo", "Color"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Duration (min)"><input className="input" type="number" value={dur} onChange={(e) => setDur(e.target.value)} /></Field>
          </div>
          <Field label="Price ($)"><input className="input" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
          <Field label="Description"><textarea className="input min-h-[70px]" value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        </div>
      </Modal>
    );
  }
}
