"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toggleEngagementDay, updateEngagementNote } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";
import { SOCIAL_PLATFORM_LABELS, type SocialPlatform } from "@/lib/constants";

type Props = {
  dayId: string;
  leadId: string;
  businessName: string;
  platform: string;
  dayNumber: number;
  note: string | null;
  completedAt: Date | null;
};

export default function EngagementTodayCard({
  dayId,
  leadId,
  businessName,
  platform,
  dayNumber,
  note,
  completedAt,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const notify = useToast();

  return (
    <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href={`/engagement/${leadId}`} className="font-display font-bold text-ink hover:text-green">
            {businessName}
          </Link>
          <p className="text-xs text-slate">
            {SOCIAL_PLATFORM_LABELS[platform as SocialPlatform] ?? platform} · Day {dayNumber}
          </p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await toggleEngagementDay(dayId, leadId);
              notify(completedAt ? "Unmarked" : "Marked done");
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
      </div>
      <form
        action={(formData) =>
          startTransition(async () => {
            await updateEngagementNote(dayId, leadId, formData);
            notify("Saved");
          })
        }
      >
        <input
          type="text"
          name="note"
          defaultValue={note ?? ""}
          placeholder="Note — what you did today"
          onBlur={(e) => e.currentTarget.form?.requestSubmit()}
          className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
        />
      </form>
    </div>
  );
}
