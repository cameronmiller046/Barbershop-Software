"use client";

import { DemoProvider } from "@/lib/demo/store";
import { ToastProvider } from "@/components/demo/toast";
import { DemoShell } from "@/components/demo/DemoShell";
import { ClientProfileProvider } from "@/components/demo/ClientProfile";

export default function DemoAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider role="demo_admin">
      <ToastProvider>
        <ClientProfileProvider>
          <DemoShell role="demo_admin">{children}</DemoShell>
        </ClientProfileProvider>
      </ToastProvider>
    </DemoProvider>
  );
}
