"use client";

import { useState } from "react";
import { useDemo, staffById } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Btn, Field, Avatar, SectionTitle, Tag, SandboxNote } from "@/components/demo/ui";
import { Icon } from "@/components/home/icons";
import { completedCount, commissionOf } from "@/lib/demo/metrics";

export default function ProfilePage() {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const me = staffById(state, state.currentStaffId)!;

  const [name, setName] = useState(me.name);
  const [bio, setBio] = useState(me.bio);
  const [specialties, setSpecialties] = useState(me.specialties.join(", "));
  const [phone, setPhone] = useState(me.phone);
  const [instagram, setInstagram] = useState("andre.thefade");

  const save = () => {
    actions.updateStaff(me.id, { name, bio, phone, specialties: specialties.split(",").map((s) => s.trim()).filter(Boolean) });
    toast("Profile updated");
  };

  return (
    <>
      <PageHeader title="My Profile" subtitle="How you show up on the shop's website and booking page." />

      <SandboxNote>Your public profile edits stay in the sandbox and won&apos;t change any live storefront.</SandboxNote>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <Panel className="text-center">
          <div className="grid place-items-center py-2">
            <Avatar name={me.name} color={me.color} size={96} />
            <button onClick={() => toast("Photo picker opened")} className="mt-3 inline-flex items-center gap-1.5 text-sm text-brass hover:underline"><Icon.plus className="h-4 w-4" /> Change photo</button>
            <h2 className="mt-3 font-display text-xl text-cream">{name}</h2>
            <div className="mt-1 flex items-center gap-1.5"><Tag tone="neutral">{me.level}</Tag><Tag tone="gold">★ 4.9</Tag></div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/8 pt-4">
            <Stat label="Cuts" value={String(completedCount(state, me.id))} />
            <Stat label="Tips" value={`${Math.round((commissionOf(state, me.id).tipsCents) / 100)}`} />
            <Stat label="Since" value={new Date(me.hireDateISO).getFullYear().toString()} />
          </div>
        </Panel>

        <Panel>
          <SectionTitle>Public details</SectionTitle>
          <div className="space-y-4">
            <Field label="Display name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Bio" hint="Shown on your booking profile"><textarea className="input min-h-[80px]" value={bio} onChange={(e) => setBio(e.target.value)} /></Field>
            <Field label="Specialties" hint="Comma-separated"><input className="input" value={specialties} onChange={(e) => setSpecialties(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
              <Field label="Instagram"><input className="input" value={instagram} onChange={(e) => setInstagram(e.target.value)} /></Field>
            </div>
            <div className="flex justify-end"><Btn variant="gold" onClick={save}>Save profile</Btn></div>
          </div>
        </Panel>
      </div>
    </>
  );

  function Stat({ label, value }: { label: string; value: string }) {
    return <div><div className="font-display text-lg text-cream">{value}</div><div className="text-[11px] text-cream/45">{label}</div></div>;
  }
}
