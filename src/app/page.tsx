import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { emailStepLabel } from "@/lib/constants";
import { todayInTimeZone, addDays } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

const PAKISTAN_TZ = "Asia/Karachi";
const DAYS_AHEAD = 14;

export default async function DashboardPage() {
  const today = todayInTimeZone(PAKISTAN_TZ);
  const horizon = addDays(today, DAYS_AHEAD);

  const steps = await prisma.emailStepRecord.findMany({
    where: {
      status: { in: ["PENDING", "QUEUED"] },
      scheduledDate: { not: null, gte: today, lte: horizon },
      lead: { status: { notIn: ["BOOKED", "DEAD"] } },
    },
    relationLoadStrategy: "join",
    include: { lead: { select: { id: true, businessName: true, email: true } } },
    orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
  });

  const byDate = new Map<string, typeof steps>();
  for (const step of steps) {
    const key = step.scheduledDate!;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(step);
  }
  const days = [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Dashboard" description="Follow-ups coming up over the next two weeks." />

      {days.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
          Nothing scheduled in the next {DAYS_AHEAD} days.
        </div>
      ) : (
        <div className="space-y-6">
          {days.map(([date, items]) => (
            <div key={date}>
              <h2 className="font-display mb-2 text-sm font-bold uppercase tracking-wide text-slate">
                {date === today ? "Today" : date} <span className="font-sans font-normal text-slate">({date})</span>
              </h2>
              <div className="overflow-hidden rounded-xl border border-mist/30 bg-white/60 shadow-sm">
                <ul className="divide-y divide-mist/20">
                  {items.map((step) => (
                    <li key={step.id}>
                      <Link
                        href={`/leads/${step.leadId}`}
                        className="flex flex-col gap-1 px-4 py-3 transition hover:bg-paper sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{step.lead.businessName}</p>
                          <p className="truncate text-xs text-slate">
                            {emailStepLabel(step.order)}
                            {step.lead.email ? ` · to ${step.lead.email}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-mist/20 px-2.5 py-1 text-xs font-semibold text-ink">
                          {step.scheduledTime || "—"}
                          {step.scheduledTimezone ? ` (${step.scheduledTimezone})` : ""}
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
