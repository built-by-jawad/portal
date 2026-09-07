"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  updateTask,
  toggleTaskDone,
  deleteTask,
  bulkUpdateTasks,
  bulkDeleteTasks,
} from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";

type Task = {
  id: string;
  title: string;
  description: string | null;
  leadId: string | null;
  dueDate: string | null;
  completedAt: Date | null;
};

type Lead = { id: string; businessName: string };

export default function BulkEditTable({ tasks, leads }: { tasks: Task[]; leads: Lead[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const notify = useToast();

  const [bulkLeadId, setBulkLeadId] = useState("");
  const [bulkDueDate, setBulkDueDate] = useState("");

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === tasks.length ? new Set() : new Set(tasks.map((t) => t.id))));
  }

  function saveField(id: string, field: string, value: string) {
    const formData = new FormData();
    formData.set("title", tasks.find((t) => t.id === id)?.title ?? "");
    formData.set("description", tasks.find((t) => t.id === id)?.description ?? "");
    formData.set("leadId", tasks.find((t) => t.id === id)?.leadId ?? "");
    formData.set("dueDate", tasks.find((t) => t.id === id)?.dueDate ?? "");
    formData.set(field, value);
    startTransition(async () => {
      await updateTask(id, formData);
      notify("Saved");
    });
  }

  const selectedIds = [...selected];

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-green/40 bg-green/10 px-3 py-2">
          <span className="text-xs font-semibold text-ink">{selected.size} selected</span>

          <select
            value={bulkLeadId}
            onChange={(e) => setBulkLeadId(e.target.value)}
            className="rounded-lg border border-mist/40 bg-white px-2 py-1.5 text-xs text-ink focus:border-green focus:outline-none"
          >
            <option value="">Set client…</option>
            <option value="__none__">No client</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.businessName}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!bulkLeadId || isPending}
            onClick={() =>
              startTransition(async () => {
                await bulkUpdateTasks(selectedIds, { leadId: bulkLeadId === "__none__" ? "" : bulkLeadId });
                notify("Updated");
              })
            }
            className="rounded-lg border border-mist/40 bg-white px-2 py-1.5 text-xs font-semibold text-ink hover:bg-mist/10 disabled:opacity-50"
          >
            Apply
          </button>

          <input
            type="date"
            value={bulkDueDate}
            onChange={(e) => setBulkDueDate(e.target.value)}
            className="rounded-lg border border-mist/40 bg-white px-2 py-1.5 text-xs text-ink focus:border-green focus:outline-none"
          />
          <button
            type="button"
            disabled={!bulkDueDate || isPending}
            onClick={() =>
              startTransition(async () => {
                await bulkUpdateTasks(selectedIds, { dueDate: bulkDueDate });
                notify("Updated");
              })
            }
            className="rounded-lg border border-mist/40 bg-white px-2 py-1.5 text-xs font-semibold text-ink hover:bg-mist/10 disabled:opacity-50"
          >
            Apply
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await bulkUpdateTasks(selectedIds, { markDone: true });
                notify("Marked done");
                setSelected(new Set());
              })
            }
            className="rounded-lg bg-green px-3 py-1.5 text-xs font-semibold text-paper hover:brightness-95 disabled:opacity-50"
          >
            Mark done
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm(`Delete ${selected.size} task(s)?`)) {
                startTransition(async () => {
                  await bulkDeleteTasks(selectedIds);
                  notify("Deleted");
                  setSelected(new Set());
                });
              }
            }}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-mist/30 bg-white/60 shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-mist/20 text-left text-xs font-semibold uppercase tracking-wide text-slate">
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={tasks.length > 0 && selected.size === tasks.length}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-mist/40 accent-green"
                />
              </th>
              <th className="px-3 py-3">Title</th>
              <th className="px-3 py-3">Client</th>
              <th className="px-3 py-3">Due date</th>
              <th className="px-3 py-3">Done</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-mist/10 last:border-0">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => toggleSelected(t.id)}
                    className="h-4 w-4 rounded border-mist/40 accent-green"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    defaultValue={t.title}
                    onBlur={(e) => e.target.value !== t.title && saveField(t.id, "title", e.target.value)}
                    className="w-full min-w-[160px] rounded-lg border border-mist/40 bg-white px-2 py-1.5 text-sm text-ink focus:border-green focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    defaultValue={t.leadId ?? ""}
                    onChange={(e) => saveField(t.id, "leadId", e.target.value)}
                    className="rounded-lg border border-mist/40 bg-white px-2 py-1.5 text-xs text-ink focus:border-green focus:outline-none"
                  >
                    <option value="">No client</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.businessName}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="date"
                    defaultValue={t.dueDate ?? ""}
                    onChange={(e) => saveField(t.id, "dueDate", e.target.value)}
                    className="rounded-lg border border-mist/40 bg-white px-2 py-1.5 text-xs text-ink focus:border-green focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={!!t.completedAt}
                    onChange={() =>
                      startTransition(async () => {
                        await toggleTaskDone(t.id);
                        notify(t.completedAt ? "Reopened" : "Marked done");
                      })
                    }
                    className="h-4 w-4 rounded border-mist/40 accent-green"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/tasks/${t.id}/edit`}
                      className="text-xs font-semibold text-green hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (confirm(`Delete "${t.title}"?`)) {
                          startTransition(async () => {
                            await deleteTask(t.id);
                            notify("Deleted");
                          });
                        }
                      }}
                      className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
