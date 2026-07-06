"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Counts = { bugs: number; features: number; questions: number; backlog: number };

export function DevSidebar({ counts, admin }: { counts: Counts; admin: { name: string; email: string } }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const type = sp.get("type");
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { setCollapsed(localStorage.getItem("devNavCollapsed") === "1"); }, []);
  const toggle = () => setCollapsed((c) => { localStorage.setItem("devNavCollapsed", c ? "0" : "1"); return !c; });

  const onBoard = pathname === "/dev";
  const active = (o: { board?: boolean; type?: string | null }) =>
    (o.board && onBoard && !type) || (o.type !== undefined && onBoard && type === o.type);

  return (
    <aside className={`flex h-full shrink-0 flex-col border-r border-white/8 bg-[#0a090d] transition-all duration-200 ${collapsed ? "w-16" : "w-60"}`}>
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 px-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-lg text-[#17130a]">✦</span>
        {!collapsed && <><span className="font-display text-lg text-cream">The Chair</span><span className="rounded bg-brass/15 px-1.5 py-0.5 text-[10px] font-semibold text-brass">DEV</span></>}
      </div>

      <nav className="p-scroll flex-1 space-y-4 overflow-y-auto px-2 py-3">
        <Group collapsed={collapsed}>
          <Item icon="home" label="Overview" href="/admin" collapsed={collapsed} />
          <Item icon="inbox" label="Inbox" soon collapsed={collapsed} />
          <Item icon="dashboard" label="Dashboard" soon collapsed={collapsed} />
        </Group>

        <Group title="Development" collapsed={collapsed}>
          <Item icon="board" label="Kanban Board" href="/dev" isActive={active({ board: true })} collapsed={collapsed} />
          <Item icon="list" label="List View" soon collapsed={collapsed} />
          <Item icon="layers" label="Backlog" badge={counts.backlog} soon collapsed={collapsed} />
          <Item icon="sprint" label="Active Sprint" soon collapsed={collapsed} />
          <Item icon="timeline" label="Timeline" soon collapsed={collapsed} />
          <Item icon="calendar" label="Calendar" soon collapsed={collapsed} />
          <Item icon="roadmap" label="Roadmap" soon collapsed={collapsed} />
          <Item icon="releases" label="Releases" soon collapsed={collapsed} />
          <Item icon="changelog" label="Changelog" soon collapsed={collapsed} />
        </Group>

        <Group title="Issues" collapsed={collapsed}>
          <Item icon="bug" label="Bugs" href="/dev?type=BUG" badge={counts.bugs} isActive={active({ type: "BUG" })} collapsed={collapsed} />
          <Item icon="feature" label="Feature Requests" href="/dev?type=FEATURE" badge={counts.features} isActive={active({ type: "FEATURE" })} collapsed={collapsed} />
          <Item icon="question" label="Questions" href="/dev?type=QUESTION" badge={counts.questions} isActive={active({ type: "QUESTION" })} collapsed={collapsed} />
        </Group>

        <Group title="Users & Permissions" collapsed={collapsed}>
          <Item icon="users" label="Users" href="/admin/users" collapsed={collapsed} />
          <Item icon="shield" label="Roles & Permissions" href="/admin/roles" collapsed={collapsed} />
          <Item icon="audit" label="Audit Logs" soon collapsed={collapsed} />
        </Group>

        <Group title="Operations" collapsed={collapsed}>
          <Item icon="health" label="System Health" soon collapsed={collapsed} />
          <Item icon="integrations" label="Integrations" soon collapsed={collapsed} />
          <Item icon="flag" label="Feature Flags" soon collapsed={collapsed} />
          <Item icon="settings" label="Settings" soon collapsed={collapsed} />
        </Group>
      </nav>

      <div className="border-t border-white/8 p-2">
        {!collapsed && (
          <div className="mb-1 flex items-center gap-2 rounded-lg px-2 py-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-xs font-bold text-[#17130a]">{admin.name.slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0"><span className="block truncate text-xs font-medium text-cream">{admin.name}</span><span className="block truncate text-[10px] text-cream/40">Super Admin</span></span>
          </div>
        )}
        <button onClick={toggle} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-cream/50 transition hover:bg-white/5 hover:text-cream">
          <Glyph name="collapse" />{!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function Group({ title, collapsed, children }: { title?: string; collapsed: boolean; children: React.ReactNode }) {
  return (
    <div>
      {title && !collapsed && <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-cream/30">{title}</div>}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Item({ icon, label, href, badge, soon, isActive, collapsed }: { icon: string; label: string; href?: string; badge?: number; soon?: boolean; isActive?: boolean; collapsed: boolean }) {
  const cls = `group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${isActive ? "bg-brass/12 text-brass" : "text-cream/65 hover:bg-white/5 hover:text-cream"} ${soon ? "cursor-default opacity-45 hover:bg-transparent hover:text-cream/45" : ""}`;
  const body = (
    <>
      <span className={isActive ? "text-brass" : "text-cream/50 group-hover:text-cream/80"}><Glyph name={icon} /></span>
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && badge != null && badge > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? "bg-brass/25 text-brass" : "bg-white/8 text-cream/50"}`}>{badge}</span>}
    </>
  );
  if (soon || !href) return <div className={cls} title={collapsed ? label : soon ? "Coming soon" : label}>{body}</div>;
  return <Link href={href} className={cls} title={collapsed ? label : undefined}>{body}</Link>;
}

/* Minimalist 16px line icons. */
function Glyph({ name }: { name: string }) {
  const p: Record<string, string> = {
    home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5",
    inbox: "M4 13h4l1 2h6l1-2h4M4 13V5h16v8M4 13v6h16v-6",
    dashboard: "M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z",
    board: "M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v13h-4z",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    layers: "m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5",
    sprint: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 12h.01",
    timeline: "M3 12h18M6 12V7M12 12v8M18 12V9",
    calendar: "M4 5h16v16H4zM4 9h16M8 3v4M16 3v4",
    roadmap: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14",
    releases: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L4 14V4h10l6.6 6.6a2 2 0 0 1 0 2.8ZM8 8h.01",
    changelog: "M6 3h9l5 5v13H6zM14 3v5h5M9 13h6M9 17h6",
    bug: "M12 20a6 6 0 0 0 6-6v-2a6 6 0 0 0-12 0v2a6 6 0 0 0 6 6ZM12 8V20M4 12h4M16 12h4M5 7l2 1M19 7l-2 1",
    feature: "m12 3 2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3Z",
    question: "M9 9a3 3 0 1 1 4 2.8c-.8.4-1 .8-1 1.7M12 17h.01",
    users: "M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM22 19v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
    shield: "M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z",
    audit: "M6 3h9l5 5v13H6zM14 3v5h5M9 12h6M9 16h4",
    health: "M3 12h4l2 6 4-14 2 8h6",
    integrations: "M6 3v6M6 15v6M18 3v6M18 15v6M6 9a3 3 0 0 0 0 6M18 9a3 3 0 0 1 0 6M9 12h6",
    flag: "M5 21V4M5 4h11l-1.5 4L16 12H5",
    settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 6.6 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 13.4H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 5 6.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10.6 3V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8",
    collapse: "M15 6l-6 6 6 6",
  };
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d={p[name] ?? "M4 4h16v16H4z"} /></svg>;
}
