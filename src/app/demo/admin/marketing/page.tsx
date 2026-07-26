"use client";

import { useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Btn, Field, Modal, KPI, Money, Tag, SectionTitle } from "@/components/demo/ui";
import { Icon } from "@/components/home/icons";
import type { Campaign } from "@/lib/demo/types";

const CH_TONE: Record<Campaign["channel"], string> = { Email: "#d8b25c", SMS: "#34d399", Social: "#38bdf8" };
const ST_TONE: Record<Campaign["status"], "green" | "blue" | "neutral"> = { Sent: "green", Scheduled: "blue", Draft: "neutral" };

export default function MarketingPage() {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);

  const sent = state.campaigns.filter((c) => c.status === "Sent");
  const revenue = sent.reduce((s, c) => s + c.revenueCents, 0);
  const reach = sent.reduce((s, c) => s + c.recipients, 0);
  const avgOpen = sent.length ? sent.reduce((s, c) => s + c.openRate, 0) / sent.length : 0;

  return (
    <>
      <PageHeader title="Marketing" subtitle="Campaigns, reach and the revenue they drive."
        actions={<Btn variant="gold" onClick={() => setCreating(true)}><Icon.plus className="h-4 w-4" /> New campaign</Btn>} />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Campaigns" value={state.campaigns.length} icon="marketing" hint="Total created" />
        <KPI label="Attributed revenue" value={<Money cents={revenue} />} icon="dollar" delta={22} hint="From campaigns" accent="#34d399" />
        <KPI label="Total reach" value={reach.toLocaleString()} icon="customers" hint="Recipients" accent="#38bdf8" />
        <KPI label="Avg open rate" value={`${Math.round(avgOpen * 100)}%`} icon="growth" delta={5} hint="Across sends" accent="#f472b6" />
      </div>

      <Panel pad={false} className="overflow-hidden">
        <div className="px-5 pt-4"><SectionTitle>Campaigns</SectionTitle></div>
        <div className="divide-y divide-white/6">
          {state.campaigns.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${CH_TONE[c.channel]}1f`, color: CH_TONE[c.channel] }}><Icon.marketing className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="font-medium text-cream">{c.name}</span><Tag tone={ST_TONE[c.status]}>{c.status}</Tag></div>
                <div className="text-xs text-cream/45">{c.channel} · {c.audience} · {c.recipients.toLocaleString()} recipients</div>
              </div>
              <div className="hidden text-right sm:block">
                <div className="text-sm text-cream/80">{c.status === "Sent" ? `${Math.round(c.openRate * 100)}% open` : "—"}</div>
                <div className="text-xs text-cream/45">{c.revenueCents ? <Money cents={c.revenueCents} /> : "no revenue yet"}</div>
              </div>
              {c.status !== "Sent" && (
                <Btn onClick={() => { actions.updateCampaign(c.id, { status: "Sent", recipients: c.recipients || 420, openRate: 0.4, revenueCents: 82000, sentISO: new Date().toISOString() }); toast("Campaign sent (simulated)"); }}>
                  Send now
                </Btn>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {creating && <NewCampaign onClose={() => setCreating(false)} />}
    </>
  );

  function NewCampaign({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState("");
    const [channel, setChannel] = useState<Campaign["channel"]>("Email");
    const [audience, setAudience] = useState("All clients");
    const save = () => {
      if (!name.trim()) return;
      actions.addCampaign({ name: name.trim(), channel, status: "Draft", audience, recipients: 0, openRate: 0, revenueCents: 0, sentISO: null });
      toast("Campaign drafted");
      onClose();
    };
    return (
      <Modal open onClose={onClose} title="New campaign"
        footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="gold" onClick={save}>Create draft</Btn></>}>
        <div className="space-y-4">
          <Field label="Campaign name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring refresh — 15% off" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Channel"><select className="input" value={channel} onChange={(e) => setChannel(e.target.value as Campaign["channel"])}>{(["Email", "SMS", "Social"] as const).map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Audience"><select className="input" value={audience} onChange={(e) => setAudience(e.target.value)}>{["All clients", "VIP", "Lapsed (60+ days)", "New clients"].map((a) => <option key={a}>{a}</option>)}</select></Field>
          </div>
        </div>
      </Modal>
    );
  }
}
