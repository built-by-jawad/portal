"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEngagementDayAction, deleteEngagementDay } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";

type Day = { id: string; dayNumber: number; action: string | null; completedAt: Date | null };

// Per-day edit controls for one platform's checklist: rename a day's action (e.g. "Follow" ->
// something else), or drop a day entirely if this profile doesn't need it. Each row saves/deletes
// immediately on its own — not part of the parent business-edit form's submit.
export default function EngagementChecklistEditor({ days }: { days: Day[] }) {
  const [rows, setRows] = useState(days);
  const [pending, startTransition] = useTransition();
  const notify = useToast();
  const router = useRouter();

  function saveAction(dayId: string, action: string, previous: string | null) {
    if (action === (previous ?? "")) return;
    startTransition(async () => {
      try {
        await updateEngagementDayAction(dayId, action);
        notify("Saved");
      } catch {
        notify("Something went wrong");
      }
    });
  }

  function removeDay(dayId: string) {
    if (!confirm("Remove this day from the checklist? This can't be undone.")) return;
    setRows((prev) => prev.filter((d) => d.id !== dayId));
    startTransition(async () => {
      try {
        await deleteEngagementDay(dayId);
        notify("Removed");
        router.refresh();
      } catch {
        notify("Something went wrong");
      }
    });
  }

  if (rows.length === 0) {
    return <p className="mt-2 pl-2 text-xs text-slate">No checklist days left for this profile.</p>;
  }

  return (
    <div className="mt-2 space-y-1.5 border-l-2 border-mist/20 pl-3">
      {rows.map((d) => (
        <div key={d.id} className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-xs font-semibold text-slate">Day {d.dayNumber}</span>
          <input
            type="text"
            defaultValue={d.action ?? ""}
            disabled={pending}
            placeholder="What to do on this day"
            onBlur={(e) => saveAction(d.id, e.target.value.trim(), d.action)}
            className={`flex-1 rounded-md border border-mist/30 bg-white px-2 py-1 text-xs text-ink focus:border-green focus:outline-none disabled:opacity-60 ${
              d.completedAt ? "text-slate line-through" : ""
            }`}
          />
          {d.completedAt && <span className="shrink-0 text-xs font-semibold text-green">done</span>}
          <button
            type="button"
            onClick={() => removeDay(d.id)}
            disabled={pending}
            title="Remove this day"
            className="shrink-0 text-xs text-slate hover:text-red-500 disabled:opacity-60"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
