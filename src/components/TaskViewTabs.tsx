"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const VIEWS = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "done", label: "Done" },
] as const;

export default function TaskViewTabs({
  current,
  overdueCount,
}: {
  current: string;
  overdueCount?: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="mb-6 flex gap-1 rounded-lg border border-mist/30 bg-white/60 p-1">
      {VIEWS.map((v) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("view", v.value);
        const isOverdue = v.value === "overdue";
        const isActive = current === v.value;
        return (
          <Link
            key={v.value}
            href={`${pathname}?${params.toString()}`}
            className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-semibold transition ${
              isActive
                ? isOverdue
                  ? "bg-red-600 text-white"
                  : "bg-ink text-paper"
                : isOverdue && overdueCount
                  ? "text-red-600 hover:bg-red-50"
                  : "text-slate hover:bg-mist/15"
            }`}
          >
            {v.label}
            {isOverdue && overdueCount ? ` (${overdueCount})` : ""}
          </Link>
        );
      })}
    </div>
  );
}
