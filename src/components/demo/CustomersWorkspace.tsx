"use client";

import { useMemo, useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Btn, Field, Modal, Avatar, Tag, EmptyState } from "@/components/demo/ui";
import { ClientProfileBody } from "@/components/demo/ClientProfile";
import { MessageComposer } from "@/components/demo/MessageComposer";
import { Icon } from "@/components/home/icons";
import { formatMoney } from "@/lib/utils";

export function CustomersWorkspace({ mode }: { mode: "admin" | "barber" }) {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState<string | null>(state.customers[0]?.id ?? null);
  const [adding, setAdding] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const list = useMemo(
    () => state.customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.email.toLowerCase().includes(q.toLowerCase())),
    [state.customers, q],
  );
  const sel = state.customers.find((c) => c.id === selId) ?? list[0] ?? null;

  return (
    <>
      <PageHeader
        title={mode === "admin" ? "Customers" : "My Clients"}
        subtitle={mode === "admin" ? "Your client book — history, notes and tags." : "Everyone in your chair. Keep notes so every visit feels personal."}
        actions={<Btn variant="gold" onClick={() => setAdding(true)}><Icon.plus className="h-4 w-4" /> Add customer</Btn>}
      />

      {/* On phones the selected client (with notes up top) leads; the list drops
          to the bottom. On desktop it's the classic list-left / detail-right. */}
      <div className="flex flex-col-reverse gap-4 lg:grid lg:grid-cols-[320px_1fr]">
        <Panel pad={false} className="overflow-hidden">
          <div className="border-b border-white/8 p-3">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-smoke px-3 py-2">
              <Icon.customers className="h-4 w-4 text-cream/40" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients" className="w-full bg-transparent text-sm text-cream outline-none placeholder:text-cream/30" />
            </div>
          </div>
          <ul className="p-scroll max-h-[62vh] divide-y divide-white/5 overflow-y-auto">
            {list.map((c) => (
              <li key={c.id}>
                <button onClick={() => setSelId(c.id)} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/[0.03] ${sel?.id === c.id ? "bg-brass/[0.07]" : ""}`}>
                  <Avatar name={c.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-cream">{c.name}</div>
                    <div className="truncate text-xs text-cream/45">{c.visits} visits · {formatMoney(c.totalSpentCents)}</div>
                  </div>
                  {c.tags[0] && <Tag tone={c.tags.includes("VIP") ? "gold" : "neutral"}>{c.tags[0]}</Tag>}
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        {sel ? (
          <Panel key={sel.id}>
            <div className="mb-4 flex justify-end">
              <Btn onClick={() => setMessaging(true)}><Icon.messages className="h-4 w-4" /> Message</Btn>
            </div>
            <ClientProfileBody customer={sel} notesHint={mode === "barber" ? "only you and the team see these" : undefined} />
          </Panel>
        ) : <EmptyState title="No clients found" hint="Try a different search." />}
      </div>

      {messaging && sel && <MessageComposer customer={sel} onClose={() => setMessaging(false)} />}
      {adding && <AddCustomer onClose={() => setAdding(false)} onCreated={(id) => { setSelId(id); setAdding(false); }} />}
    </>
  );

  function AddCustomer({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const save = () => {
      if (!name.trim()) return;
      const id = actions.addCustomer({
        name: name.trim(), email, phone, notes: "", tags: ["New"], visits: 0,
        lastVisitISO: null, totalSpentCents: 0, createdAtISO: new Date().toISOString(),
      });
      toast("Customer added");
      onCreated(id);
    };
    return (
      <Modal open onClose={onClose} title="Add customer"
        footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="gold" onClick={save}>Add customer</Btn></>}>
        <div className="space-y-4">
          <Field label="Full name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Smith" /></Field>
          <Field label="Email"><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@example.com" /></Field>
          <Field label="Phone"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" /></Field>
        </div>
      </Modal>
    );
  }

}
