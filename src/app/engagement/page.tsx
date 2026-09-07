import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import CalendarViewTabs from "@/components/CalendarViewTabs";
import CalendarGrid, { type CalendarGridItem } from "@/components/CalendarGrid";
import EngagementTodayCard from "@/components/EngagementTodayCard";
import { prisma } from "@/lib/prisma";
import { SOCIAL_PLATFORM_LABELS, ENGAGEMENT_DAYS, type SocialPlatform } from "@/lib/constants";
import { todayInTimeZone, isInView, type CalendarView } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

const PAKISTAN_TZ = "Asia/Karachi";

export default async function EngagementPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: rawView } = await searchParams;
  const view: CalendarView | "cards" =
    rawView === "week" || rawView === "month" || rawView === "today" ? rawView : "cards";

  const leads = await prisma.lead.findMany({
    where: { socialPlatforms: { isEmpty: false } },
    include: { engagementDays: true },
    orderBy: { createdAt: "desc" },
  });

  if (view === "cards") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
        <PageHeader
          title="Engagement"
          description="Leads you're warming up on social before outreach — 7-day check-in per platform."
        />
        <p className="mb-6 text-sm">
          <Link href="/engagement?view=today" className="font-semibold text-green hover:underline">
            View as calendar (today / week / month) →
          </Link>
        </p>

        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mist/50 p-10 text-center text-sm text-slate">
            No leads marked active on a platform yet. Check a platform on a lead&apos;s Business
            details to start a 7-day engagement checklist.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {leads.map((lead) => {
              const total = lead.socialPlatforms.length * ENGAGEMENT_DAYS;
              const done = lead.engagementDays.filter((d) => d.completedAt).length;
              return (
                <Link
                  key={lead.id}
                  href={`/engagement/${lead.id}`}
                  className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm transition hover:border-green/50 hover:shadow-md"
                >
                  <p className="font-display font-bold text-ink">{lead.businessName}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {lead.socialPlatforms.map((p) => (
                      <span
                        key={p}
                        className="rounded-full bg-mist/20 px-2 py-0.5 text-xs font-semibold text-ink"
                      >
                        {SOCIAL_PLATFORM_LABELS[p as SocialPlatform] ?? p}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-mist/20">
                      <div
                        className="h-full bg-green"
                        style={{ width: `${total > 0 ? Math.round((done / total) * 100) : 0}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate">
                      {done}/{total} days engaged
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const pakistanToday = todayInTimeZone(PAKISTAN_TZ);
  const allDays = leads.flatMap((lead) => lead.engagementDays.map((d) => ({ ...d, lead })));

  if (view !== "today") {
    const gridItems: CalendarGridItem[] = allDays.map((d) => ({
      id: d.id,
      date: d.date,
      sortKey: d.dayNumber,
      title: `${d.lead.businessName} · ${SOCIAL_PLATFORM_LABELS[d.platform as SocialPlatform] ?? d.platform}`,
      subtitle: `Day ${d.dayNumber}`,
      href: `/engagement/${d.leadId}`,
      accent: d.completedAt ? "slate" : "green",
    }));
    const viewCount = allDays.filter((d) => isInView(d.date, pakistanToday, view)).length;

    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-10">
        <PageHeader
          title="Engagement Calendar"
          description={`${viewCount} check-in${viewCount === 1 ? "" : "s"} ${view === "week" ? "this week" : "this month"}.`}
        />
        <CalendarViewTabs current={view} />
        <p className="mb-4 text-sm">
          <Link href="/engagement" className="font-semibold text-green hover:underline">
            ← Card view
          </Link>
        </p>
        <CalendarGrid view={view} todayStr={pakistanToday} items={gridItems} />
      </div>
    );
  }

  const todaysDays = allDays.filter((d) => d.date === pakistanToday).sort((a, b) => a.dayNumber - b.dayNumber);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Engagement Calendar"
        description={`${todaysDays.length} check-in${todaysDays.length === 1 ? "" : "s"} due today.`}
      />
      <CalendarViewTabs current={view} />
      <p className="mb-4 text-sm">
        <Link href="/engagement" className="font-semibold text-green hover:underline">
          ← Card view
        </Link>
      </p>

      {todaysDays.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
          Nothing due today.
        </div>
      ) : (
        <div className="space-y-4">
          {todaysDays.map((d) => (
            <EngagementTodayCard
              key={d.id}
              dayId={d.id}
              leadId={d.leadId}
              businessName={d.lead.businessName}
              platform={d.platform}
              dayNumber={d.dayNumber}
              note={d.note}
              completedAt={d.completedAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
