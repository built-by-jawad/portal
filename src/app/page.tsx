import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { emailStepLabel } from "@/lib/constants";

export default async function DashboardPage() {
  const [totalLeads, activeLeads, booked, dead, sentThisWeek, unsentSteps] =
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
        take: 8,
      }),
    ]);

  const stats = [
    { label: "Total Leads", value: totalLeads },
    { label: "Active", value: activeLeads },
    { label: "Emails Sent (7d)", value: sentThisWeek },
    { label: "Booked", value: booked },
    { label: "Dead", value: dead },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Dashboard"
        description="Outreach at a glance — leads, follow-ups due, and where things stand."
        action={
          <Link
            href="/leads/new"
            className="inline-flex items-center justify-center rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
          >
            + Add Lead
          </Link>
        }
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
            Nothing queued. Add a lead to get started.
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
                        {step.lead.city ? ` · ${step.lead.city}` : ""}
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
    </div>
  );
}
