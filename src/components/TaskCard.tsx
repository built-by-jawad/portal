"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toggleTaskDone, deleteTask } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";

type Props = {
  id: string;
  title: string;
  description: string | null;
  leadId: string | null;
  leadBusinessName: string | null;
  dueDate: string | null;
  completedAt: Date | null;
  overdue?: boolean;
};

export default function TaskCard({
  id,
  title,
  description,
  leadId,
  leadBusinessName,
  dueDate,
  completedAt,
  overdue,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const notify = useToast();

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition sm:p-6 ${
        overdue
          ? "border-red-300 bg-red-50/60 hover:bg-red-50"
          : "border-mist/30 bg-white/60"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p
            className={`font-display font-bold ${
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
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await toggleTaskDone(id);
                notify(completedAt ? "Reopened" : "Marked done");
              })
            }
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
              completedAt
                ? "border border-mist/40 text-ink hover:bg-mist/10"
                : "bg-green text-paper hover:brightness-95"
            }`}
          >
            {completedAt ? "Done ✓ (undo)" : "Mark done"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm(`Delete "${title}"?`)) {
                startTransition(async () => {
                  await deleteTask(id);
                  notify("Deleted");
                });
              }
            }}
            className="rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
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
  );
}
