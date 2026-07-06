import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { OPEN_STATUSES, type TicketStatus } from "@/lib/tickets";
import { DevSidebar } from "@/components/dev/DevSidebar";

export const dynamic = "force-dynamic";

export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();
  const OPEN = OPEN_STATUSES as TicketStatus[];
  const [bugs, features, questions, backlog] = await Promise.all([
    prisma.ticket.count({ where: { type: "BUG", status: { in: OPEN } } }),
    prisma.ticket.count({ where: { type: "FEATURE", status: { in: OPEN } } }),
    prisma.ticket.count({ where: { type: "QUESTION", status: { in: OPEN } } }),
    prisma.ticket.count({ where: { status: { in: ["NEW", "NEEDS_REVIEW", "APPROVED", "BACKLOG"] } } }),
  ]);

  return (
    <div className="portal flex h-screen overflow-hidden bg-[#0c0b0f] text-cream">
      <DevSidebar counts={{ bugs, features, questions, backlog }} admin={{ name: admin.name ?? "Super Admin", email: admin.email ?? "" }} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
