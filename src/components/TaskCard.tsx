"use client";

import Link from "next/link";
import { useState } from "react";
import TaskDetailModal from "@/components/TaskDetailModal";

type Props = {
  id: string;
  title: string;
  description: string | null;
  leadId: string | null;
  leadBusinessName: string | null;
  dueDate: string | null;
  completedAt: Date | null;
  overdue?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
};

// No mark-done/delete buttons here on purpose — those are bulk actions now (select tasks, then
// use the action bar; select just one to act on it alone). Clicking the title (or Open) opens the
// full detail popup, where editing, done/reopen, and delete for that single task still live.
export default function TaskCard({
  id,
  title,
  description,
  leadId,
  leadBusinessName,
  dueDate,
  completedAt,
  overdue,
  selected,
  onToggleSelect,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition sm:p-6 ${
        overdue ? "border-red-300 bg-red-50/60 hover:bg-red-50" : "border-mist/30 bg-white/60"
      } ${selected ? "ring-2 ring-green" : ""}`}
    >
      {open && <TaskDetailModal taskId={id} onClose={() => setOpen(false)} />}
      <div className="flex items-start gap-3">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={onToggleSelect}
            className="mt-1.5 h-4 w-4 shrink-0 rounded border-mist/40 accent-green"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-2">
            <button type="button" onClick={() => setOpen(true)} className="text-left">
              <p
                className={`font-display font-bold hover:underline ${
                  completedAt ? "text-slate line-through" : overdue ? "text-red-700" : "text-ink"
                }`}
              >
                {title}
              </p>
              {dueDate && (
                <p className={`text-xs ${overdue ? "font-semibold text-red-600" : "text-slate"}`}>
                  Due {dueDate}
                  {overdue ? " · Overdue" : ""}
                </p>
              )}
            </button>
          </div>

          {description && <p className="mb-2 text-sm text-slate">{description}</p>}

          {leadId && leadBusinessName && (
            <Link
              href={`/leads/${leadId}`}
              className="inline-flex items-center rounded-full bg-mist/20 px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-mist/30"
            >
              {leadBusinessName}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
