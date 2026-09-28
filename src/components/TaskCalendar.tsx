"use client";

import { useState } from "react";
import CalendarGrid, { type CalendarGridItem } from "@/components/CalendarGrid";
import TaskDetailModal from "@/components/TaskDetailModal";

export default function TaskCalendar({
  view,
  todayStr,
  items,
}: {
  view: "week" | "month";
  todayStr: string;
  items: CalendarGridItem[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      {openId && <TaskDetailModal taskId={openId} onClose={() => setOpenId(null)} />}
      <CalendarGrid view={view} todayStr={todayStr} items={items} onItemClick={setOpenId} />
    </>
  );
}
