import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import CalendarViewTabs from "@/components/CalendarViewTabs";
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
        <CalendarLink />

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

  // Calendar views: every EngagementDay across all leads, grouped by date, filtered to the range.
  const pakistanToday = todayInTimeZone(PAKISTAN_TZ);
  const days = leads
    .flatMap((lead) => lead.engagementDays.map((d) => ({ ...d, lead })))
    .filter((d) => isInView(d.date, pakistanToday, view));

  const groups = new Map<string, typeof days>();
  for (const d of days) {
    const list = groups.get(d.date) ?? [];
    list.push(d);
    groups.set(d.date, list);
  }
  const sortedDates = [...groups.keys()].sort();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Engagement Calendar"
        description="Engagement check-ins due, by date."
      />
      <CalendarViewTabs current={view} />
      <p className="mb-4 text-sm">
        <Link href="/engagement" className="font-semibold text-green hover:underline">
          ← Card view
        </Link>
      </p>

      {sortedDates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
          Nothing due in this range.
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h2 className="font-display mb-2 text-sm font-bold text-ink">
                {date}
                {date === pakistanToday ? " · Today" : ""}
              </h2>
              <div className="overflow-hidden rounded-xl border border-mist/30 bg-white/60 shadow-sm">
                <ul className="divide-y divide-mist/20">
                  {groups.get(date)!.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/engagement/${d.leadId}`}
                        className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-paper"
                      >
                        <span>
                          <span className="font-semibold text-ink">{d.lead.businessName}</span>{" "}
                          <span className="text-slate">
                            · {SOCIAL_PLATFORM_LABELS[d.platform as SocialPlatform] ?? d.platform} · Day{" "}
                            {d.dayNumber}
                          </span>
                        </span>
                        <span
                          className={`text-xs font-semibold ${d.completedAt ? "text-green" : "text-slate"}`}
                        >
                          {d.completedAt ? "Done" : "Not yet"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarLink() {
  return (
    <p className="mb-6 text-sm">
      <Link href="/engagement?view=today" className="font-semibold text-green hover:underline">
        View as calendar (today / week / month) →
      </Link>
    </p>
  );
}
