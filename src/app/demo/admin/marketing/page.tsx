"use client";

import { useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Btn, Field, Modal, KPI, Money, Tag, SectionTitle, SandboxNote, cx } from "@/components/demo/ui";
import { Icon } from "@/components/home/icons";
import { formatMoney } from "@/lib/utils";
import type { Campaign, Coupon, Customer, DemoState, SentMessage } from "@/lib/demo/types";

const CH_TONE: Record<Campaign["channel"], string> = { Email: "#d8b25c", SMS: "#34d399", Social: "#38bdf8" };
const ST_TONE: Record<Campaign["status"], "green" | "blue" | "neutral"> = { Sent: "green", Scheduled: "blue", Draft: "neutral" };
const AUDIENCES = ["All clients", "VIP", "Lapsed (60+ days)", "New clients"] as const;

/** Who a campaign actually reaches, from real sandbox clients. */
function audienceOf(state: DemoState, audience: string): Customer[] {
  const now = Date.now();
  const lapsedMs = 60 * 86_400_000;
  switch (audience) {
    case "VIP": return state.customers.filter((c) => c.tags.includes("VIP"));
    case "New clients": return state.customers.filter((c) => c.tags.includes("New"));
    case "Lapsed (60+ days)":
      return state.customers.filter((c) => !c.lastVisitISO || now - Date.parse(c.lastVisitISO) > lapsedMs);
    default: return state.customers;
  }
}

/** Deterministic open rate per campaign so re-sends don't jitter the stats. */
const openRateOf = (id: string) => 0.35 + ((id.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0) % 30) / 100);

export default function MarketingPage() {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);

  const sent = state.campaigns.filter((c) => c.status === "Sent");
  const revenue = sent.reduce((s, c) => s + c.revenueCents, 0);
  const reach = sent.reduce((s, c) => s + c.recipients, 0);
  const redemptions = state.coupons.reduce((s, c) => s + c.redemptions, 0);
  const shopName = state.settings.name.replace(" — Flagship", "");

  /** The automation: send the promo to every client in the audience over the
   *  campaign's channel, each message recorded in the sandbox outbox. */
  const sendNow = (c: Campaign) => {
    const coupon = c.couponCode ? state.coupons.find((x) => x.code === c.couponCode) : null;
    const offer = coupon ? ` Show code ${coupon.code} at checkout for ${coupon.label}.` : "";

    if (c.channel === "Social") {
      // No direct messages for a social post — simulated reach only.
      actions.sendCampaign(c.id, { messages: [], recipients: 480, openRate: openRateOf(c.id) });
      toast("Posted to your social channels (simulated) — reach ~480", "success");
      return;
    }

    const targets = audienceOf(state, c.audience);
    const messages: Omit<SentMessage, "id" | "sentISO">[] = [];
    let sms = 0, email = 0;
    for (const cust of targets) {
      const first = cust.name.split(" ")[0];
      if (c.channel === "SMS" && cust.phone) {
        sms++;
        messages.push({
          customerId: cust.id, channel: "SMS", toAddress: cust.phone, subject: null,
          body: `${shopName}: ${first}, ${c.name}!${offer} Book: thechair.app/book Reply STOP to opt out.`,
          templateId: null,
        });
      } else if (c.channel === "Email" && cust.email) {
        email++;
        messages.push({
          customerId: cust.id, channel: "EMAIL", toAddress: cust.email, subject: `${c.name} at ${shopName}`,
          body: `Hi ${first},\n\n${c.name} is on at ${shopName}.${offer}\n\nGrab your spot: thechair.app/book\n\n${shopName}`,
          templateId: null,
        });
      }
    }

    if (!messages.length) {
      toast(`No one in “${c.audience}” can receive ${c.channel} — nothing sent`, "info");
      return;
    }
    actions.sendCampaign(c.id, { messages, recipients: messages.length, openRate: openRateOf(c.id) });
    toast(
      c.channel === "SMS"
        ? `Texted ${sms} client${sms === 1 ? "" : "s"}${coupon ? ` with code ${coupon.code}` : ""} (simulated)`
        : `Emailed ${email} client${email === 1 ? "" : "s"}${coupon ? ` with code ${coupon.code}` : ""} (simulated)`,
      "success",
    );
  };

  return (
    <>
      <PageHeader title="Marketing" subtitle="Promotions that text and email your clients — and the coupon codes they redeem at checkout."
        actions={<Btn variant="gold" onClick={() => setCreating(true)}><Icon.plus className="h-4 w-4" /> New campaign</Btn>} />
      <SandboxNote>
        Campaign sends are simulated — each message is rendered and recorded per client, nothing is delivered.
        In the live product they go out over your Twilio and email accounts.
      </SandboxNote>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Campaigns" value={state.campaigns.length} icon="marketing" hint="Total created" />
        <KPI label="Attributed revenue" value={<Money cents={revenue} />} icon="dollar" delta={22} hint="Rung up with promo codes" accent="#34d399" />
        <KPI label="Total reach" value={reach.toLocaleString()} icon="customers" hint="Messages sent" accent="#38bdf8" />
        <KPI label="Coupon redemptions" value={redemptions} icon="loyalty" delta={9} hint="Applied at checkout" accent="#f472b6" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel pad={false} className="min-w-0 overflow-hidden">
          <div className="px-5 pt-4"><SectionTitle>Campaigns</SectionTitle></div>
          <div className="divide-y divide-white/6">
            {state.campaigns.map((c) => {
              const targets = c.channel === "Social" ? null : audienceOf(state, c.audience);
              const reachable = targets
                ? targets.filter((t) => (c.channel === "SMS" ? t.phone : t.email)).length
                : null;
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${CH_TONE[c.channel]}1f`, color: CH_TONE[c.channel] }}><Icon.marketing className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-cream">{c.name}</span>
                      <Tag tone={ST_TONE[c.status]}>{c.status}</Tag>
                      {c.couponCode && <span className="rounded-md border border-brass/40 bg-brass/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-brass">{c.couponCode}</span>}
                    </div>
                    <div className="text-xs text-cream/45">
                      {c.channel} · {c.audience} · {c.status === "Sent"
                        ? `${c.recipients.toLocaleString()} sent`
                        : reachable != null ? `${reachable} reachable now` : "social post"}
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="text-sm text-cream/80">{c.status === "Sent" ? `${Math.round(c.openRate * 100)}% open` : "—"}</div>
                    <div className="text-xs text-cream/45">{c.revenueCents ? <Money cents={c.revenueCents} /> : "no revenue yet"}</div>
                  </div>
                  {c.status !== "Sent" && (
                    <Btn variant="gold" onClick={() => sendNow(c)}><Icon.marketing className="h-4 w-4" /> Send now</Btn>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel className="min-w-0">
          <SectionTitle right={<span className="text-xs text-cream/40">Applied at checkout</span>}>Coupon Codes</SectionTitle>
          <ul className="space-y-2.5">
            {state.coupons.map((cpn) => {
              const expired = cpn.expiresISO ? Date.parse(cpn.expiresISO) < Date.now() : false;
              const usable = cpn.active && !expired;
              const campaign = cpn.campaignId ? state.campaigns.find((c) => c.id === cpn.campaignId) : null;
              return (
                <li key={cpn.id} className={cx("rounded-xl border border-white/8 bg-white/[0.02] p-3", !usable && "opacity-55")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold tracking-wide text-brass">{cpn.code}</span>
                    <button onClick={() => {
                      actions.updateCoupon(cpn.id, { active: !cpn.active });
                      toast(cpn.active ? `${cpn.code} deactivated` : `${cpn.code} is live again`, "success");
                    }}
                      className="text-[11px] font-semibold text-cream/45 transition hover:text-brass">
                      {cpn.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                  <div className="mt-0.5 text-xs text-cream/60">{cpn.label}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-cream/40">
                    <span>{cpn.redemptions} redeemed · {formatMoney(cpn.revenueCents)} rung up</span>
                    {campaign && <span>via “{campaign.name}”</span>}
                    {expired ? <span className="text-red-300/80">Expired</span>
                      : cpn.expiresISO ? <span>Ends {new Date(cpn.expiresISO).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      : <span>No expiry</span>}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-cream/40">
            Barbers apply these on the Checkout screen — redemptions and the revenue they ring up land back here automatically.
          </p>
        </Panel>
      </div>

      {creating && <NewCampaign onClose={() => setCreating(false)} />}
    </>
  );

  function NewCampaign({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState("");
    const [channel, setChannel] = useState<Campaign["channel"]>("SMS");
    const [audience, setAudience] = useState<string>("All clients");
    const [withCoupon, setWithCoupon] = useState(true);
    const [code, setCode] = useState("");
    const [kind, setKind] = useState<Coupon["kind"]>("percent");
    const [value, setValue] = useState("15");
    const [expiresDays, setExpiresDays] = useState("14");

    const parsedValue = parseFloat(value);
    const valueOk = Number.isFinite(parsedValue) && parsedValue > 0 && (kind !== "percent" || parsedValue <= 100);
    const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const codeTaken = withCoupon && state.coupons.some((c) => c.code === cleanCode);
    const canSave = !!name.trim() && (!withCoupon || (cleanCode.length >= 3 && valueOk && !codeTaken));

    const reachable = audienceOf(state, audience)
      .filter((t) => (channel === "SMS" ? t.phone : channel === "Email" ? t.email : true)).length;

    const save = () => {
      if (!canSave) return;
      const campaignId = actions.addCampaign({
        name: name.trim(), channel, status: "Draft", audience,
        recipients: 0, openRate: 0, revenueCents: 0, sentISO: null,
        couponCode: withCoupon ? cleanCode : null,
      });
      if (withCoupon) {
        const days = parseInt(expiresDays, 10);
        actions.addCoupon({
          code: cleanCode,
          label: kind === "percent" ? `${parsedValue}% off any service` : `${formatMoney(Math.round(parsedValue * 100))} off any service`,
          kind, value: kind === "percent" ? parsedValue : Math.round(parsedValue * 100),
          active: true,
          expiresISO: Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
          campaignId, redemptions: 0, revenueCents: 0,
        });
      }
      toast(withCoupon ? `Campaign drafted with code ${cleanCode}` : "Campaign drafted", "success");
      onClose();
    };

    return (
      <Modal open onClose={onClose} title="New campaign"
        footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="gold" onClick={save} disabled={!canSave}>Create draft</Btn></>}>
        <div className="space-y-4">
          <Field label="Campaign name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring refresh — 15% off" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Channel">
              <select className="input" value={channel} onChange={(e) => setChannel(e.target.value as Campaign["channel"])}>
                {(["SMS", "Email", "Social"] as const).map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Audience" hint={channel === "Social" ? "Public post — no direct messages" : `${reachable} client${reachable === 1 ? "" : "s"} reachable by ${channel}`}>
              <select className="input" value={audience} onChange={(e) => setAudience(e.target.value)}>
                {AUDIENCES.map((a) => <option key={a}>{a}</option>)}
              </select>
            </Field>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3">
            <div className="min-w-0">
              <div className="text-sm text-cream">Include a coupon code</div>
              <div className="text-xs text-cream/45">Clients show it at checkout; redemptions are tracked here</div>
            </div>
            <button type="button" role="switch" aria-checked={withCoupon} onClick={() => setWithCoupon((v) => !v)}
              className={cx("relative h-6 w-11 shrink-0 rounded-full transition", withCoupon ? "bg-brass" : "bg-white/12")}>
              <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-[#17130a] transition-all", withCoupon ? "left-[22px]" : "left-0.5")} />
            </button>
          </div>

          {withCoupon && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Code" hint={codeTaken ? "That code already exists" : "Letters and numbers only"}>
                  <input className={cx("input font-mono uppercase", codeTaken && "!border-red-400/50")} value={code}
                    onChange={(e) => setCode(e.target.value)} placeholder="SPRING15" maxLength={16} />
                </Field>
                <Field label="Discount">
                  <div className="flex gap-2">
                    <select className="input !w-24 shrink-0" value={kind} onChange={(e) => setKind(e.target.value as Coupon["kind"])}>
                      <option value="percent">%</option>
                      <option value="amount">$</option>
                    </select>
                    <input className="input" inputMode="decimal" value={value}
                      onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d{0,2}$/.test(v)) setValue(v); }}
                      placeholder={kind === "percent" ? "15" : "10.00"} />
                  </div>
                </Field>
              </div>
              <Field label="Expires in (days)" hint="Blank or 0 = no expiry">
                <input className="input" inputMode="numeric" value={expiresDays}
                  onChange={(e) => { if (/^\d{0,3}$/.test(e.target.value)) setExpiresDays(e.target.value); }} />
              </Field>
            </>
          )}
        </div>
      </Modal>
    );
  }
}
