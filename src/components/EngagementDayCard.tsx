"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleEngagementDay } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";
import { ENGAGEMENT_DAY_ACTIONS, SOCIAL_PLATFORM_LABELS, type SocialPlatform } from "@/lib/constants";

type Props = {
  dayId: string;
  businessName: string;
  platform: string;
  profileUrl: string;
  time: string | null;
  dayNumber: number;
  date: string;
  completedAt: Date | null;
};

// One card per profile per day — the unit the Engagement page is built around. Checking it off just
// toggles this one EngagementDay; nothing cascades to the other 6 days for the same profile.
export default function EngagementDayCard({
  dayId,
  businessName,
  platform,
  profileUrl,
  time,
  dayNumber,
  date,
  completedAt,
}: Props) {
  const [pending, startTransition] = useTransition();
  const notify = useToast();
  const router = useRouter();

  const action = ENGAGEMENT_DAY_ACTIONS[dayNumber] ?? `Day ${dayNumber}`;
  const platformLabel = SOCIAL_PLATFORM_LABELS[platform as SocialPlatform] ?? platform;

  function toggle() {
    startTransition(async () => {
      try {
        await toggleEngagementDay(dayId);
        notify(completedAt ? "Reopened" : "Marked done");
        router.refresh();
      } catch {
        notify("Something went wrong");
      }
    });
  }

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition sm:p-5 ${
        completedAt ? "border-mist/20 bg-mist/5" : "border-mist/30 bg-white/60"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className={`font-display font-bold ${completedAt ? "text-slate line-through" : "text-ink"}`}>
            {businessName}
          </p>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-green hover:underline"
          >
            {platformLabel} profile ↗
          </a>
        </div>
        <span className="shrink-0 rounded-full bg-mist/20 px-2 py-0.5 text-xs font-semibold text-ink">
          Day {dayNumber}
        </span>
      </div>

      <p className={`text-sm font-semibold ${completedAt ? "text-slate" : "text-ink"}`}>{action}</p>
      <p className="mt-1 text-xs text-slate">
        {date}
        {time ? ` · ${time}` : ""}
      </p>

      <button
        type="button"
        disabled={pending}
        onClick={toggle}
        className={`mt-3 w-full rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          completedAt
            ? "border border-mist/40 text-ink hover:bg-mist/10"
            : "bg-green text-paper hover:brightness-95"
        }`}
      >
        {completedAt ? "Reopen" : "Mark done"}
      </button>
    </div>
  );
}
