"use client";

import { DemoProvider } from "@/lib/demo/store";
import { ToastProvider } from "@/components/demo/toast";
import { DemoShell } from "@/components/demo/DemoShell";

export default function DemoBarberLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider role="demo_barber">
      <ToastProvider>
        <DemoShell role="demo_barber">{children}</DemoShell>
      </ToastProvider>
    </DemoProvider>
  );
}
