import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import CopyBox from "@/components/CopyBox";
import CalendarViewTabs from "@/components/CalendarViewTabs";
import { prisma } from "@/lib/prisma";
import { emailStepLabel } from "@/lib/constants";
import { scheduledToUtc, todayInTimeZone, isInView, type CalendarView } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

const PAKISTAN_TZ = "Asia/Karachi";

function formatInPakistanTime(instant: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PAKISTAN_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(instant));
}

function formatDateHeading(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PAKISTAN_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${dateStr}T12:00:00Z`));
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: rawView } = await searchParams;
  const view: CalendarView =
    rawView === "week" || rawView === "month" ? rawView : "today";

  const candidates = await prisma.emailStepRecord.findMany({
    where: {
      sentAt: null,
      scheduledDate: { not: null },
      lead: { status: { notIn: ["BOOKED", "DEAD"] } },
    },
    include: { lead: { select: { id: true, businessName: true, email: true } } },
  });

  const pakistanToday = todayInTimeZone(PAKISTAN_TZ);

  const items = candidates
    .map((r) => {
      const instant =
        scheduledToUtc(r.scheduledDate!, r.scheduledTime || "09:00", r.scheduledTimezone || "UTC")?.getTime() ?? 0;
      return { ...r, sortInstant: instant, pakistanDate: todayInTimeZone(PAKISTAN_TZ, new Date(instant)) };
    })
    .filter((r) => isInView(r.pakistanDate, pakistanToday, view))
    .sort((a, b) => a.sortInstant - b.sortInstant);

  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const list = groups.get(item.pakistanDate) ?? [];
    list.push(item);
    groups.set(item.pakistanDate, list);
  }
  const sortedDates = [...groups.keys()].sort();

  const descriptions: Record<CalendarView, string> = {
    today: "scheduled for today",
    week: "scheduled over the next 7 days",
    month: "scheduled this month",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Outreach Calendar"
        description={`${items.length} email${items.length === 1 ? "" : "s"} ${descriptions[view]}, in send order — times shown in Pakistan time (PKT).`}
      />

      <CalendarViewTabs current={view} />

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
          Nothing scheduled {view === "today" ? "for today" : view === "week" ? "this week" : "this month"}. Set a
          Send date/time on an email step to have it show up here.
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((date) => (
            <div key={date}>
              {view !== "today" && (
                <h2 className="font-display mb-3 text-sm font-bold text-ink">
                  {formatDateHeading(date)}
                  {date === pakistanToday ? " · Today" : ""}
                </h2>
              )}
              <div className="space-y-6">
                {groups.get(date)!.map((step) => (
                  <div key={step.id} className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <Link
                          href={`/leads/${step.leadId}`}
                          className="font-display font-bold text-ink hover:text-green"
                        >
                          {step.lead.businessName}
                        </Link>
                        <p className="text-xs text-slate">
                          {emailStepLabel(step.order)} · to {step.lead.email ?? "no email on file"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-paper">
                          {formatInPakistanTime(step.sortInstant)} PKT
                        </span>
                        {step.scheduledTimezone && step.scheduledTimezone !== PAKISTAN_TZ && (
                          <p className="mt-1 text-xs text-slate">
                            {step.scheduledTime || "—"} their time ({step.scheduledTimezone})
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {step.lead.email && <CopyBox label="To" text={step.lead.email} />}
                      {step.hasSubject && <CopyBox label="Subject" text={step.subject} />}
                      <CopyBox label="Body" text={step.body} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
