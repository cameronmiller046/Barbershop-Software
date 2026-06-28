import { prisma } from "@/lib/prisma";

/** Append-only audit log for sensitive actions (PRD: Security → Audit logs). */
export async function audit(params: {
  action: string;
  tenantId?: string | null;
  userId?: string | null;
  target?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        tenantId: params.tenantId ?? null,
        userId: params.userId ?? null,
        target: params.target ?? null,
        meta: params.meta ? (params.meta as object) : undefined,
      },
    });
  } catch (err) {
    // Never let audit failures break the request.
    console.error("[audit] failed", err);
  }
}
