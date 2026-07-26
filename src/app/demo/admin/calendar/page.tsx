"use client";

import { PageHeader } from "@/components/demo/ui";
import { DayCalendar } from "@/components/demo/DayCalendar";

export default function AdminCalendarPage() {
  return (
    <>
      <PageHeader title="Calendar" subtitle="The whole shop's day. Drag an appointment to reschedule, or click any empty slot to book." />
      <DayCalendar />
    </>
  );
}
