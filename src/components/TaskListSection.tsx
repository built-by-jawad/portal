"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TaskCard from "@/components/TaskCard";
import { bulkUpdateTasks, bulkDeleteTasks, addTasksToClientUpdates } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";
import { todayInTimeZone } from "@/lib/scheduling";

type Task = {
  id: string;
  title: string;
  description: string | null;
  leadId: string | null;
  leadBusinessName: string | null;
  dueDate: string | null;
  completedAt: Date | null;
};

// One card list with checkboxes + a bulk action bar. Acting on a single task just means
// selecting only that one — there are no more per-card mark-done/delete buttons.
export default function TaskListSection({
  tasks,
  overdue,
  showAddToUpdate,
}: {
  tasks: Task[];
  overdue?: boolean;
  showAddToUpdate?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const notify = useToast();
  const router = useRouter();

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const ids = Array.from(selected);
  const run = (fn: () => Promise<void>, done: string) =>
    startTransition(async () => {
      try {
        await fn();
        notify(done);
        setSelected(new Set());
        router.refresh();
      } catch {
        notify("Something went wrong");
      }
    });

  return (
    <div className="space-y-4">
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          id={t.id}
          title={t.title}
          description={t.description}
          leadId={t.leadId}
          leadBusinessName={t.leadBusinessName}
          dueDate={t.dueDate}
          completedAt={t.completedAt}
          overdue={overdue}
          selected={selected.has(t.id)}
          onToggleSelect={() => toggle(t.id)}
        />
      ))}

      {ids.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-mist/30 bg-white p-3 shadow-lg">
          <span className="text-xs font-semibold text-ink">
            {ids.length} selected
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => bulkUpdateTasks(ids, { markDone: true }), "Marked done")}
            className="rounded-lg bg-green px-3 py-1.5 text-xs font-semibold text-paper disabled:opacity-50"
          >
            Mark done
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => bulkUpdateTasks(ids, { markDone: false }), "Reopened")}
            className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
          >
            Reopen
          </button>
          {showAddToUpdate && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    const { added, skipped } = await addTasksToClientUpdates(ids, todayInTimeZone("Asia/Karachi"));
                    notify(
                      skipped > 0
                        ? `Added ${added} to client updates (${skipped} skipped, no client)`
                        : `Added ${added} to client updates`
                    );
                    setSelected(new Set());
                    router.refresh();
                  } catch {
                    notify("Something went wrong");
                  }
                })
              }
              className="rounded-lg border border-green/50 px-3 py-1.5 text-xs font-semibold text-green disabled:opacity-50"
            >
              Add to client update
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Delete ${ids.length} task${ids.length === 1 ? "" : "s"}?`)) return;
              run(() => bulkDeleteTasks(ids), "Deleted");
            }}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-slate hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}
