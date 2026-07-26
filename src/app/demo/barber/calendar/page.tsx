"use client";

import { PageHeader } from "@/components/demo/ui";
import { DayCalendar } from "@/components/demo/DayCalendar";
import { useDemo } from "@/lib/demo/store";

export default function BarberCalendarPage() {
  const { state } = useDemo();
  return (
    <>
      <PageHeader title="My Calendar" subtitle="Your chair for the day. Drag to reschedule or tap a slot to add a booking." />
      <DayCalendar singleStaffId={state.currentStaffId} />
    </>
  );
}
