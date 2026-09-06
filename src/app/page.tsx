import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { emailStepLabel } from "@/lib/constants";

// Without this, Next prerenders the page once at build time (no dynamic APIs are used here)
// and serves that stale snapshot to every visitor instead of querying the database per request.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [totalLeads, activeLeads, booked, dead, sentThisWeek, candidateSteps, sentRecords] =
    await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({
        where: { status: { notIn: ["BOOKED", "DEAD"] } },
      }),
      prisma.lead.count({ where: { status: "BOOKED" } }),
      prisma.lead.count({ where: { status: "DEAD" } }),
      prisma.emailStepRecord.count({
        where: { sentAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.emailStepRecord.findMany({
        where: {
          sentAt: null,
          lead: { status: { notIn: ["BOOKED", "DEAD"] } },
        },
        include: { lead: true },
        orderBy: [{ lead: { createdAt: "asc" } }, { order: "asc" }],
      }),
      prisma.emailStepRecord.findMany({
        where: { sentAt: { not: null } },
        include: { lead: { select: { businessName: true } } },
        orderBy: { sentAt: "desc" },
      }),
    ]);

  // A follow-up with an IF_REPLIED/IF_NOT_REPLIED condition only counts as "next up" once its
  // condition is actually satisfied by the previous step in the same lead's sequence.
  const previousByLeadOrder = new Map(
    (
      await prisma.emailStepRecord.findMany({
        where: { leadId: { in: [...new Set(candidateSteps.map((s) => s.leadId))] } },
        select: { leadId: true, order: true, repliedAt: true },
      })
    ).map((r) => [`${r.leadId}:${r.order}`, r.repliedAt])
  );

  const unsentSteps = candidateSteps
    .filter((step) => {
      if (step.condition === "ALWAYS") return true;
      const prevReplied = previousByLeadOrder.get(`${step.leadId}:${step.order - 1}`);
      if (step.condition === "IF_REPLIED") return !!prevReplied;
      if (step.condition === "IF_NOT_REPLIED") return prevReplied === null || prevReplied === undefined ? false : !prevReplied;
      return true;
    })
    .slice(0, 8);

  const stats = [
    { label: "Total Leads", value: totalLeads },
    { label: "Active", value: activeLeads },
    { label: "Emails Sent (7d)", value: sentThisWeek },
    { label: "Booked", value: booked },
    { label: "Dead", value: dead },
  ];

  const totalSent = sentRecords.length;
  const totalOpened = sentRecords.filter((r) => r.openCount > 0).length;
  const totalClicked = sentRecords.filter((r) => r.clickCount > 0).length;
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const clickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0;

  const byStep = new Map<number, { sent: number; opened: number; clicked: number }>();
  for (const r of sentRecords) {
    const entry = byStep.get(r.order) ?? { sent: 0, opened: 0, clicked: 0 };
    entry.sent += 1;
    if (r.openCount > 0) entry.opened += 1;
    if (r.clickCount > 0) entry.clicked += 1;
    byStep.set(r.order, entry);
  }
  const stepRows = [...byStep.entries()].sort((a, b) => a[0] - b[0]);
  const recentActivity = sentRecords.slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Dashboard"
        description="Outreach at a glance — leads, follow-ups due, and how sent emails are performing."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm"
          >
            <p className="font-display text-2xl font-bold text-ink sm:text-3xl">{s.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">Next up to send</h2>
          <Link href="/leads" className="text-sm font-semibold text-green hover:underline">
            View all leads →
          </Link>
        </div>

        {unsentSteps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
            Nothing queued. Use the + button to add a lead.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-mist/30 bg-white/60 shadow-sm">
            <ul className="divide-y divide-mist/20">
              {unsentSteps.map((step) => (
                <li key={step.id}>
                  <Link
                    href={`/leads/${step.leadId}`}
                    className="flex flex-col gap-2 px-4 py-3.5 transition hover:bg-paper sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">
                        {step.lead.businessName}
                      </p>
                      <p className="truncate text-xs text-slate">
                        {emailStepLabel(step.order)}
                        {step.lead.address ? ` · ${step.lead.address}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={step.lead.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="font-display mb-4 text-lg font-bold text-ink">Email performance</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm">
            <p className="font-display text-2xl font-bold text-ink sm:text-3xl">{totalSent}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate">Emails Sent</p>
          </div>
          <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm">
            <p className="font-display text-2xl font-bold text-green sm:text-3xl">{openRate}%</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate">Open Rate</p>
          </div>
          <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm">
            <p className="font-display text-2xl font-bold text-green sm:text-3xl">{clickRate}%</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate">Click Rate</p>
          </div>
          <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm">
            <p className="font-display text-2xl font-bold text-ink sm:text-3xl">{sentThisWeek}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate">Sent (7d)</p>
          </div>
        </div>

        {stepRows.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-xl border border-mist/30 bg-white/60 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mist/20 text-left text-xs font-semibold uppercase tracking-wide text-slate">
                  <th className="px-4 py-3">Step</th>
                  <th className="px-4 py-3">Sent</th>
                  <th className="px-4 py-3">Opened</th>
                  <th className="px-4 py-3">Clicked</th>
                </tr>
              </thead>
              <tbody>
                {stepRows.map(([order, s]) => (
                  <tr key={order} className="border-b border-mist/10 last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{emailStepLabel(order)}</td>
                    <td className="px-4 py-3 text-slate">{s.sent}</td>
                    <td className="px-4 py-3 text-slate">{s.opened}</td>
                    <td className="px-4 py-3 text-slate">{s.clicked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {recentActivity.length > 0 && (
          <div className="mt-8">
            <h3 className="font-display mb-3 text-sm font-bold uppercase tracking-wide text-slate">
              Recent activity
            </h3>
            <div className="overflow-hidden rounded-xl border border-mist/30 bg-white/60 shadow-sm">
              <ul className="divide-y divide-mist/20">
                {recentActivity.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/leads/${r.leadId}`}
                      className="flex flex-col gap-1 px-4 py-3.5 transition hover:bg-paper sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{r.lead.businessName}</p>
                        <p className="truncate text-xs text-slate">
                          {emailStepLabel(r.order)} · sent {r.sentAt?.toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-semibold ${r.openCount > 0 ? "text-green" : "text-slate"}`}
                      >
                        {r.openCount > 0 ? "Opened" : "Not opened"}
                        {r.clickCount > 0 ? " · Clicked" : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
