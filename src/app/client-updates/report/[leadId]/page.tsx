import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PrintReportButton from "@/components/PrintReportButton";
import { addDays, getWeekDates, todayInTimeZone } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

const PAKISTAN_TZ = "Asia/Karachi";

function shiftMonth(anchor: string, months: number): string {
  const [y, m] = anchor.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function ClientUpdateReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ leadId: string }>;
  searchParams: Promise<{ period?: string; anchor?: string }>;
}) {
  const { leadId } = await params;
  const { period: rawPeriod, anchor: rawAnchor } = await searchParams;
  const period = rawPeriod === "month" ? "month" : "week";
  const anchor = rawAnchor || todayInTimeZone(PAKISTAN_TZ);

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, businessName: true } });
  if (!lead) notFound();

  let dateFrom: string;
  let dateTo: string;
  let title: string;
  let prevHref: string;
  let nextHref: string;

  if (period === "week") {
    const week = getWeekDates(anchor);
    dateFrom = week[0];
    dateTo = week[6];
    title = `Week of ${dateFrom} – ${dateTo}`;
    prevHref = `?period=week&anchor=${addDays(anchor, -7)}`;
    nextHref = `?period=week&anchor=${addDays(anchor, 7)}`;
  } else {
    const monthStr = anchor.slice(0, 7);
    dateFrom = `${monthStr}-01`;
    dateTo = `${monthStr}-31`;
    const [y, m] = monthStr.split("-").map(Number);
    title = `${MONTH_NAMES[m - 1]} ${y}`;
    prevHref = `?period=month&anchor=${shiftMonth(dateFrom, -1)}`;
    nextHref = `?period=month&anchor=${shiftMonth(dateFrom, 1)}`;
  }

  const updates = await prisma.clientUpdate.findMany({
    where: { leadId, date: { gte: dateFrom, lte: dateTo } },
    include: { screenshots: true },
    orderBy: { date: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/client-updates" className="text-sm font-semibold text-green hover:underline">
          ← All client updates
        </Link>
        <div className="flex items-center gap-2">
          <Link href={prevHref} className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-mist/10">
            ← Previous
          </Link>
          <Link href={nextHref} className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-mist/10">
            Next →
          </Link>
          <PrintReportButton />
        </div>
      </div>

      <div className="rounded-xl border border-mist/30 bg-white p-6 shadow-sm print:rounded-none print:border-none print:shadow-none sm:p-10">
        <div className="mb-8 flex items-center justify-between border-b border-mist/30 pb-6">
          <div>
            <img src="/brand/builtbyjawad-wordmark-dark.svg" alt="builtbyjawad" width={160} height={28} />
            <p className="mt-2 text-xs text-slate">Found. Chosen. Booked.</p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-bold text-ink">{period === "week" ? "Weekly" : "Monthly"} Progress Report</p>
            <p className="text-sm text-slate">{title}</p>
          </div>
        </div>

        <p className="mb-6 text-sm text-slate">
          Prepared for <span className="font-semibold text-ink">{lead.businessName}</span>
        </p>

        {updates.length === 0 ? (
          <p className="text-sm text-slate">No work logged for this period.</p>
        ) : (
          <div className="space-y-8">
            {updates.map((u) => (
              <div key={u.id} className="break-inside-avoid border-b border-mist/20 pb-6 last:border-b-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-green">{u.date}</p>
                <p className="font-display text-base font-bold text-ink">{u.taskName}</p>
                {u.description && <p className="mt-1 text-sm text-slate">{u.description}</p>}
                {u.proofLink && (
                  <a href={u.proofLink} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-semibold text-green hover:underline">
                    View proof ↗
                  </a>
                )}
                {u.screenshots.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {u.screenshots.map((s) => (
                      <img
                        key={s.id}
                        src={s.url}
                        alt={s.filename}
                        className="h-32 w-full rounded-lg border border-mist/20 object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 border-t border-mist/30 pt-4 text-xs text-slate">
          builtbyjawad — jawad@builtbyjawad.com
        </div>
      </div>
    </div>
  );
}
