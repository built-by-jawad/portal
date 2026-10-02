import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import EngagementDayCard from "@/components/EngagementDayCard";
import DeleteEngagementProfileButton from "@/components/DeleteEngagementProfileButton";
import { prisma } from "@/lib/prisma";
import { todayInTimeZone, isInView, type CalendarView } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

const PAKISTAN_TZ = "Asia/Karachi";

export default async function EngagementPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: rawView } = await searchParams;
  const view: CalendarView | "all" =
    rawView === "week" || rawView === "month" || rawView === "all" ? rawView : "today";

  const today = todayInTimeZone(PAKISTAN_TZ);

  const profiles = await prisma.engagementProfile.findMany({
    relationLoadStrategy: "join",
    include: { days: true },
    orderBy: { createdAt: "desc" },
  });

  const allDays = profiles.flatMap((p) =>
    p.days.map((d) => ({
      ...d,
      businessName: p.businessName,
      platform: p.platform,
      profileUrl: p.profileUrl,
      time: p.time,
    }))
  );

  const filtered =
    view === "all" ? allDays : allDays.filter((d) => isInView(d.date, today, view));

  filtered.sort((a, b) => a.date.localeCompare(b.date) || a.businessName.localeCompare(b.businessName));

  function viewHref(v: string) {
    return `/engagement?view=${v}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Engagement"
        description="7-day social warm-up, one card per profile per day."
        action={
          <div className="flex gap-2">
            <Link
              href="/engagement/import"
              className="inline-flex items-center justify-center rounded-lg border border-mist/40 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-mist/10"
            >
              Import from outreach
            </Link>
            <Link
              href="/engagement/new"
              className="inline-flex items-center justify-center rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
            >
              + Add business
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex gap-1 rounded-lg border border-mist/30 bg-white/60 p-1 sm:inline-flex">
        {(["today", "week", "month", "all"] as const).map((v) => (
          <Link
            key={v}
            href={viewHref(v)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
              view === v ? "bg-green text-paper" : "text-ink hover:bg-mist/10"
            }`}
          >
            {v === "today" ? "Today" : v === "week" ? "This week" : v === "month" ? "This month" : "All"}
          </Link>
        ))}
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-10 text-center text-sm text-slate">
          No businesses added yet. Add one by hand, or import active channels from outreach.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-10 text-center text-sm text-slate">
          Nothing due {view === "today" ? "today" : view === "week" ? "this week" : "this month"}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {filtered.map((d) => (
            <EngagementDayCard
              key={d.id}
              dayId={d.id}
              businessName={d.businessName}
              platform={d.platform}
              profileUrl={d.profileUrl}
              time={d.time}
              dayNumber={d.dayNumber}
              date={d.date}
              completedAt={d.completedAt}
            />
          ))}
        </div>
      )}

      {profiles.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display mb-3 text-sm font-bold text-ink">Profiles being warmed up</h2>
          <div className="space-y-2">
            {profiles.map((p) => {
              const done = p.days.filter((d) => d.completedAt).length;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-mist/30 bg-white/60 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-ink">{p.businessName}</span>
                    <span className="ml-2 text-xs text-slate">
                      {p.platform} · {done}/{p.days.length} days
                    </span>
                  </div>
                  <DeleteEngagementProfileButton profileId={p.id} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
