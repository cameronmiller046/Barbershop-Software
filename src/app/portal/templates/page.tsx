import { redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { smsReady } from "@/lib/sms";
import { emailReady } from "@/lib/email";
import { ensureSeedTemplates } from "@/app/portal/messageActions";
import { TemplatesWorkspace, type TemplateRow } from "@/components/portal/TemplatesWorkspace";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.clients")) redirect("/portal");
  const tenantId = user.tenantId;

  // Backfill the starter set (idempotent) so the picker is never empty.
  await ensureSeedTemplates(tenantId);

  const [templates, tenant] = await Promise.all([
    prisma.messageTemplate.findMany({
      where: { tenantId },
      orderBy: [{ category: "asc" }, { channel: "asc" }, { name: "asc" }],
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        twilioAccountSid: true, twilioAuthToken: true, twilioFromNumber: true,
        sendgridApiKey: true, emailFromAddress: true,
      },
    }),
  ]);

  const rows: TemplateRow[] = templates.map((t) => ({
    id: t.id, name: t.name, channel: t.channel, category: t.category,
    subject: t.subject, body: t.body, active: t.active, isSeed: !!t.seedKey,
  }));

  return (
    <TemplatesWorkspace
      rows={rows}
      canEdit={can(user, "shop.settings")}
      providers={{
        sms: smsReady({ accountSid: tenant?.twilioAccountSid, authToken: tenant?.twilioAuthToken, from: tenant?.twilioFromNumber }),
        email: emailReady({ sendgridApiKey: tenant?.sendgridApiKey, from: tenant?.emailFromAddress }),
      }}
    />
  );
}
