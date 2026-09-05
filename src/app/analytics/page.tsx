import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import { emailStepLabel } from "@/lib/constants";

export default async function AnalyticsPage() {
  const sentRecords = await prisma.emailStepRecord.findMany({
    where: { sentAt: { not: null } },
    include: { lead: { select: { businessName: true } } },
    orderBy: { sentAt: "desc" },
  });

  const totalSent = sentRecords.length;
  const totalOpened = sentRecords.filter((r) => r.openCount > 0).length;
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const sentLast7d = sentRecords.filter(
    (r) => r.sentAt && r.sentAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
  ).length;

  const byStep = new Map<number, { sent: number; opened: number }>();
  for (const r of sentRecords) {
    const entry = byStep.get(r.order) ?? { sent: 0, opened: 0 };
    entry.sent += 1;
    if (r.openCount > 0) entry.opened += 1;
    byStep.set(r.order, entry);
  }
  const stepRows = [...byStep.entries()].sort((a, b) => a[0] - b[0]);

  const recent = sentRecords.slice(0, 15);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Analytics" description="How outreach emails are performing across all leads." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm">
          <p className="font-display text-2xl font-bold text-ink sm:text-3xl">{totalSent}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate">Emails Sent</p>
        </div>
        <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm">
          <p className="font-display text-2xl font-bold text-ink sm:text-3xl">{totalOpened}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate">Opened</p>
        </div>
        <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm">
          <p className="font-display text-2xl font-bold text-green sm:text-3xl">{openRate}%</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate">Open Rate</p>
        </div>
        <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm">
          <p className="font-display text-2xl font-bold text-ink sm:text-3xl">{sentLast7d}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate">Sent (7d)</p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="font-display mb-4 text-lg font-bold text-ink">By email step</h2>
        {stepRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
            No emails sent yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-mist/30 bg-white/60 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mist/20 text-left text-xs font-semibold uppercase tracking-wide text-slate">
                  <th className="px-4 py-3">Step</th>
                  <th className="px-4 py-3">Sent</th>
                  <th className="px-4 py-3">Opened</th>
                  <th className="px-4 py-3">Open rate</th>
                </tr>
              </thead>
              <tbody>
                {stepRows.map(([order, stats]) => (
                  <tr key={order} className="border-b border-mist/10 last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{emailStepLabel(order)}</td>
                    <td className="px-4 py-3 text-slate">{stats.sent}</td>
                    <td className="px-4 py-3 text-slate">{stats.opened}</td>
                    <td className="px-4 py-3 text-slate">
                      {stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="font-display mb-4 text-lg font-bold text-ink">Recent activity</h2>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
            Nothing sent yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-mist/30 bg-white/60 shadow-sm">
            <ul className="divide-y divide-mist/20">
              {recent.map((r) => (
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
                      {r.openCount > 0 ? `Opened ${r.openCount > 1 ? `${r.openCount}×` : ""}` : "Not opened"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
