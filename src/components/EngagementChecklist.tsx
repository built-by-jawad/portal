"use client";

import { useTransition } from "react";
import { toggleEngagementDay, updateEngagementNote } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";

type Day = {
  id: string;
  dayNumber: number;
  date: string;
  note: string | null;
  completedAt: Date | null;
};

export default function EngagementChecklist({ leadId, days }: { leadId: string; days: Day[] }) {
  const [isPending, startTransition] = useTransition();
  const notify = useToast();

  return (
    <ul className="divide-y divide-mist/20">
      {days.map((day) => (
        <li key={day.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
          <label className="flex flex-1 items-center gap-3">
            <input
              type="checkbox"
              checked={!!day.completedAt}
              disabled={isPending}
              onChange={() =>
                startTransition(async () => {
                  await toggleEngagementDay(day.id, leadId);
                  notify(day.completedAt ? "Unmarked" : "Marked done");
                })
              }
              className="h-4 w-4 rounded border-mist/40 accent-green"
            />
            <span className="text-sm font-medium text-ink">
              Day {day.dayNumber} <span className="text-xs text-slate">· {day.date}</span>
            </span>
          </label>
          <form
            action={(formData) =>
              startTransition(async () => {
                await updateEngagementNote(day.id, leadId, formData);
                notify("Saved");
              })
            }
            className="flex-1"
          >
            <input
              type="text"
              name="note"
              defaultValue={day.note ?? ""}
              placeholder="Note (optional) — what you did today"
              onBlur={(e) => e.currentTarget.form?.requestSubmit()}
              className="w-full rounded-lg border border-mist/40 bg-white px-2.5 py-1.5 text-xs text-ink focus:border-green focus:outline-none"
            />
          </form>
        </li>
      ))}
    </ul>
  );
}
