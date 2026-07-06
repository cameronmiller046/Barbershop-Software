"use client";

import { DemoProvider } from "@/lib/demo/store";
import { ToastProvider } from "@/components/demo/toast";
import { DemoShell } from "@/components/demo/DemoShell";

export default function DemoAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider role="demo_admin">
      <ToastProvider>
        <DemoShell role="demo_admin">{children}</DemoShell>
      </ToastProvider>
    </DemoProvider>
  );
}
