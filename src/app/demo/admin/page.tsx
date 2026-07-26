"use client";

import Link from "next/link";
import { useDemo, serviceById, customerById } from "@/lib/demo/store";
import { KPI, Panel, SectionTitle, Money, StatusBadge, Avatar, Tag } from "@/components/demo/ui";
import { AreaChart, Donut } from "@/components/demo/charts";
import { Icon } from "@/components/home/icons";
import { formatMoney, minutesToLabel } from "@/lib/utils";
import {
  revenueToday, todayAppts, revenueSeries, revenueByService, totalRevenue, lowStock, completedCount,
} from "@/lib/demo/metrics";

const COLORS = ["#d8b25c", "#34d399", "#38bdf8", "#f472b6", "#a855f7", "#f59e0b"];

export default function AdminDashboard() {
  const { state } = useDemo();
  const today = todayAppts(state);
  const series = revenueSeries(state, 30);
  const svcRev = revenueByService(state).slice(0, 5);
  const low = lowStock(state);
  const upcoming = today.filter((a) => ["scheduled", "confirmed", "checked_in", "in_service"].includes(a.status));

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-cream sm:text-3xl">Good morning, Marcus 👋</h1>
        <p className="mt-1 text-sm text-cream/50">Here&apos;s how {state.settings.name.replace(" — Flagship", "")} is doing today.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Revenue today" value={<Money cents={revenueToday(state)} />} icon="dollar" delta={12} hint="Today's collected" />
        <KPI label="Appointments" value={today.length} icon="calendar" delta={8} hint="Booked today" accent="#34d399" />
        <KPI label="Completed (all time)" value={completedCount(state)} icon="check" delta={4} hint="Lifetime cuts" accent="#38bdf8" />
        <KPI label="Total revenue" value={<Money cents={totalRevenue(state)} />} icon="growth" delta={15} hint="All completed" accent="#f472b6" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionTitle right={<Tag tone="green">▲ 15% vs last month</Tag>}>Revenue · last 30 days</SectionTitle>
          <AreaChart data={series} />
        </Panel>
        <Panel>
          <SectionTitle>Revenue by service</SectionTitle>
          <Donut
            segments={svcRev.map((s, i) => ({ label: s.name, value: s.value, color: COLORS[i % COLORS.length] }))}
            center={<div><div className="text-lg font-semibold text-cream">{svcRev.length}</div><div className="text-[10px] text-cream/45">services</div></div>}
          />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionTitle right={<Link href="/demo/admin/calendar" className="text-xs font-semibold text-brass hover:underline">Open calendar →</Link>}>Today&apos;s schedule</SectionTitle>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-cream/40">Nothing left on the board today.</p>
          ) : (
            <ul className="divide-y divide-white/6">
              {upcoming.map((a) => {
                const svc = serviceById(state, a.serviceId);
                const cust = customerById(state, a.customerId);
                const staff = state.staff.find((s) => s.id === a.staffId);
                return (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-16 text-sm font-medium text-cream/80">{minutesToLabel(new Date(a.startISO).getHours() * 60 + new Date(a.startISO).getMinutes())}</span>
                    <Avatar name={cust?.name ?? "?"} color={staff?.color} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-cream">{cust?.name}</div>
                      <div className="truncate text-xs text-cream/45">{svc?.name} · {staff?.name}</div>
                    </div>
                    <span className="text-sm text-cream/70">{formatMoney(svc?.priceCents ?? 0)}</span>
                    <StatusBadge status={a.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionTitle right={<Link href="/demo/admin/inventory" className="text-xs font-semibold text-brass hover:underline">Manage →</Link>}>Low stock</SectionTitle>
            {low.length === 0 ? (
              <p className="text-sm text-cream/40">Everything&apos;s well stocked.</p>
            ) : (
              <ul className="space-y-2">
                {low.map((i) => (
                  <li key={i.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-cream/80"><Icon.inventory className="h-4 w-4 text-red-300" />{i.name}</span>
                    <Tag tone="red">{i.stock} left</Tag>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel>
            <SectionTitle>Team on shift</SectionTitle>
            <ul className="space-y-2.5">
              {state.staff.filter((s) => s.active && s.level !== "Owner").map((s) => (
                <li key={s.id} className="flex items-center gap-2.5">
                  <Avatar name={s.name} color={s.color} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-cream">{s.name}</div>
                    <div className="text-xs text-cream/45">{s.level}</div>
                  </div>
                  <span className="p-live-dot h-2 w-2 rounded-full bg-emerald-400" />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
