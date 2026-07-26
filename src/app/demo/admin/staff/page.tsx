"use client";

import { useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Btn, Field, Modal, Avatar, Tag, Money, SandboxNote } from "@/components/demo/ui";
import { Icon } from "@/components/home/icons";
import { commissionOf, completedCount } from "@/lib/demo/metrics";
import type { Staff, StaffLevel } from "@/lib/demo/types";

export default function StaffPage() {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Staff | "new" | null>(null);

  return (
    <>
      <PageHeader title="Staff" subtitle="Your team, their levels, commission and access."
        actions={<Btn variant="gold" onClick={() => setEditing("new")}><Icon.plus className="h-4 w-4" /> Add staff</Btn>} />

      <SandboxNote>Employee records here are part of the sandbox — edits and new hires vanish on refresh and never touch a real team.</SandboxNote>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {state.staff.map((s) => {
          const comm = commissionOf(state, s.id);
          return (
            <div key={s.id} className={`p-panel p-5 ${!s.active ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-3">
                <Avatar name={s.name} color={s.color} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-cream">{s.name}</div>
                  <div className="flex items-center gap-1.5">
                    <Tag tone={s.level === "Owner" ? "gold" : s.level === "Manager" ? "blue" : "neutral"}>{s.level}</Tag>
                    {!s.active && <Tag tone="red">Inactive</Tag>}
                  </div>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-xs text-cream/50">{s.bio}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {s.specialties.map((sp) => <span key={sp} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-cream/55">{sp}</span>)}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat label="Cuts" value={String(completedCount(state, s.id))} />
                <Stat label="Comm." value={<Money cents={comm.commissionCents} />} />
                <Stat label="Rate" value={`${s.commissionRate}%`} />
              </div>
              <div className="mt-3 flex gap-1.5">
                <button onClick={() => setEditing(s)} className="flex-1 rounded-full border border-white/12 py-1.5 text-xs text-cream/70 hover:border-brass/40">Edit</button>
                <button onClick={() => { actions.updateStaff(s.id, { active: !s.active }); toast(s.active ? "Deactivated" : "Reactivated"); }}
                  className="flex-1 rounded-full border border-white/12 py-1.5 text-xs text-cream/70 hover:border-brass/40">{s.active ? "Deactivate" : "Reactivate"}</button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && <StaffModal staff={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );

  function Stat({ label, value }: { label: string; value: React.ReactNode }) {
    return <div className="rounded-lg border border-white/6 bg-white/[0.02] py-1.5"><div className="text-sm font-semibold text-cream">{value}</div><div className="text-[10px] text-cream/40">{label}</div></div>;
  }

  function StaffModal({ staff, onClose }: { staff: Staff | null; onClose: () => void }) {
    const [name, setName] = useState(staff?.name ?? "");
    const [level, setLevel] = useState<StaffLevel>(staff?.level ?? "Barber");
    const [email, setEmail] = useState(staff?.email ?? "");
    const [rate, setRate] = useState((staff?.commissionRate ?? 50).toString());
    const [specialties, setSpecialties] = useState((staff?.specialties ?? []).join(", "));
    const [bio, setBio] = useState(staff?.bio ?? "");

    const save = () => {
      if (!name.trim()) return;
      const patch = { name: name.trim(), level, email, commissionRate: parseInt(rate || "0", 10), specialties: specialties.split(",").map((s) => s.trim()).filter(Boolean), bio };
      if (staff) { actions.updateStaff(staff.id, patch); toast("Staff updated"); }
      else {
        actions.addStaff({ ...patch, phone: "", color: "#38bdf8", active: true, hireDateISO: new Date().toISOString(), hourlyCents: 1600 });
        toast("Staff member added");
      }
      onClose();
    };
    return (
      <Modal open onClose={onClose} title={staff ? "Edit staff" : "Add staff"}
        footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="gold" onClick={save}>{staff ? "Save" : "Add"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Level">
              <select className="input" value={level} onChange={(e) => setLevel(e.target.value as StaffLevel)}>
                {(["Owner", "Manager", "Barber"] as StaffLevel[]).map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Commission (%)"><input className="input" type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
          </div>
          <Field label="Email"><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Specialties" hint="Comma-separated"><input className="input" value={specialties} onChange={(e) => setSpecialties(e.target.value)} /></Field>
          <Field label="Bio"><textarea className="input min-h-[60px]" value={bio} onChange={(e) => setBio(e.target.value)} /></Field>
        </div>
      </Modal>
    );
  }
}
