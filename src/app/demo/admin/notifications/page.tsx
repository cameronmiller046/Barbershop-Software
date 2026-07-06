"use client";

import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Btn, Tag } from "@/components/demo/ui";
import { Icon, type IconName } from "@/components/home/icons";
import type { DemoNotification } from "@/lib/demo/types";

const ICONS: Record<DemoNotification["kind"], IconName> = {
  appointment: "calendar", inventory: "inventory", review: "star", system: "settings", payroll: "dollar",
};
const TONES: Record<DemoNotification["kind"], string> = {
  appointment: "#38bdf8", inventory: "#ef4444", review: "#d8b25c", system: "#94a3b8", payroll: "#34d399",
};

function ago(iso: string) {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const unread = state.notifications.filter((n) => !n.read).length;

  return (
    <>
      <PageHeader title="Notifications" subtitle={unread ? `${unread} unread` : "You're all caught up."}
        actions={unread > 0 && <Btn onClick={() => { actions.markAllNotifsRead(); toast("All marked read"); }}>Mark all read</Btn>} />

      <div className="space-y-2">
        {state.notifications.map((n) => {
          const I = Icon[ICONS[n.kind]];
          return (
            <Panel key={n.id} className={`flex items-start gap-3 !p-4 ${n.read ? "opacity-60" : ""}`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${TONES[n.kind]}1f`, color: TONES[n.kind] }}><I className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-cream">{n.title}</span>
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-brass" />}
                </div>
                <p className="mt-0.5 text-sm text-cream/55">{n.body}</p>
                <span className="mt-1 block text-xs text-cream/35">{ago(n.createdISO)}</span>
              </div>
              {!n.read ? (
                <button onClick={() => actions.markNotifRead(n.id)} className="shrink-0 rounded-full border border-white/12 px-2.5 py-1 text-xs text-cream/60 hover:border-brass/40">Mark read</button>
              ) : <Tag tone="neutral">Read</Tag>}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
