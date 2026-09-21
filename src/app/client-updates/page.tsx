import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import DeleteClientUpdateButton from "@/components/DeleteClientUpdateButton";
import ClientFilterSelect from "@/components/ClientFilterSelect";
import { prisma } from "@/lib/prisma";
import { getWeekDatesMondayStart, todayInTimeZone } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

const PAKISTAN_TZ = "Asia/Karachi";

export default async function ClientUpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; view?: string; anchor?: string; from?: string; to?: string }>;
}) {
  const { leadId, view: rawView, anchor: rawAnchor, from: rawFrom, to: rawTo } = await searchParams;
  const view = rawView === "month" || rawView === "all" || rawView === "custom" ? rawView : "week";
  const today = todayInTimeZone(PAKISTAN_TZ);
  const anchor = rawAnchor || today;

  const clients = await prisma.lead.findMany({
    where: { status: "BOOKED" },
    select: { id: true, businessName: true },
    orderBy: { businessName: "asc" },
  });

  let dateFrom: string | null = null;
  let dateTo: string | null = null;
  if (view === "week") {
    const week = getWeekDatesMondayStart(anchor);
    dateFrom = week[0];
    dateTo = week[6];
  } else if (view === "month") {
    dateFrom = `${anchor.slice(0, 7)}-01`;
    dateTo = `${anchor.slice(0, 7)}-31`;
  } else if (view === "custom") {
    dateFrom = rawFrom || null;
    dateTo = rawTo || null;
  }

  const updates = await prisma.clientUpdate.findMany({
    where: {
      leadId: leadId || undefined,
      date: dateFrom && dateTo ? { gte: dateFrom, lte: dateTo } : undefined,
    },
    include: { lead: { select: { businessName: true } }, screenshots: { select: { id: true } } },
    orderBy: { date: "desc" },
  });

  function viewHref(v: string) {
    const params = new URLSearchParams();
    if (leadId) params.set("leadId", leadId);
    params.set("view", v);
    return `/client-updates?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Client Updates"
        description="Log completed work per client — reviewed every Sunday, sent as a full report at month end."
        action={
          <Link
            href="/client-updates/new"
            className="inline-flex items-center justify-center rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
          >
            + Log update
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <ClientFilterSelect clients={clients} value={leadId || ""} view={view} anchor={rawAnchor} />

        <div className="flex gap-1 rounded-lg border border-mist/30 bg-white/60 p-1">
          {(["week", "month", "all", "custom"] as const).map((v) => (
            <Link
              key={v}
              href={v === "custom" ? `${viewHref(v)}${dateFrom && dateTo ? `&from=${dateFrom}&to=${dateTo}` : ""}` : viewHref(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                view === v ? "bg-green text-paper" : "text-ink hover:bg-mist/10"
              }`}
            >
              {v === "week" ? "This week" : v === "month" ? "This month" : v === "all" ? "All time" : "Custom"}
            </Link>
          ))}
        </div>

        {view === "custom" && (
          <form action="/client-updates" method="get" className="flex items-center gap-2">
            <input type="hidden" name="view" value="custom" />
            {leadId && <input type="hidden" name="leadId" value={leadId} />}
            <input
              type="date"
              name="from"
              defaultValue={rawFrom || ""}
              required
              className="rounded-lg border border-mist/40 bg-white px-2.5 py-1.5 text-xs text-ink focus:border-green focus:outline-none"
            />
            <span className="text-xs text-slate">to</span>
            <input
              type="date"
              name="to"
              defaultValue={rawTo || ""}
              required
              className="rounded-lg border border-mist/40 bg-white px-2.5 py-1.5 text-xs text-ink focus:border-green focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10"
            >
              Apply
            </button>
          </form>
        )}

        <div className="ml-auto" />

        {leadId && view === "week" && (
          <Link
            href={`/client-updates/report/${leadId}?period=week&anchor=${anchor}`}
            className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10"
          >
            Weekly report ↗
          </Link>
        )}
        {leadId && view === "month" && (
          <Link
            href={`/client-updates/report/${leadId}?period=month&anchor=${anchor}`}
            className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10"
          >
            Monthly report ↗
          </Link>
        )}
      </div>

      {updates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-10 text-center text-sm text-slate">
          No updates logged for this filter yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {updates.map((u) => (
            <li key={u.id} className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green">
                    {u.date} · {u.lead.businessName}
                  </p>
                  <Link href={`/client-updates/${u.id}`} className="font-display font-bold text-ink hover:underline">
                    {u.taskName}
                  </Link>
                  {u.description && <p className="mt-1 text-sm text-slate">{u.description}</p>}
                  {(u.screenshots.length > 0 || u.proofLink) && (
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate">
                      {u.screenshots.length > 0 && (
                        <span>
                          {u.screenshots.length} screenshot{u.screenshots.length === 1 ? "" : "s"}
                        </span>
                      )}
                      {u.proofLink && (
                        <a href={u.proofLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-green hover:underline">
                          Proof link ↗
                        </a>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Link href={`/client-updates/${u.id}`} className="text-xs font-semibold text-ink hover:underline">
                    Open
                  </Link>
                  <DeleteClientUpdateButton id={u.id} taskName={u.taskName} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
