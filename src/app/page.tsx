import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { emailStepLabel } from "@/lib/constants";
import { todayInTimeZone } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

const PAKISTAN_TZ = "Asia/Karachi";

export default async function DashboardPage() {
  const today = todayInTimeZone(PAKISTAN_TZ);

  const steps = await prisma.emailStepRecord.findMany({
    where: {
      status: { in: ["PENDING", "QUEUED"] },
      scheduledDate: { not: null, lte: today },
      lead: { status: { notIn: ["BOOKED", "DEAD"] } },
    },
    relationLoadStrategy: "join",
    include: { lead: { select: { id: true, businessName: true, email: true } } },
    orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Dashboard" description="Emails due to go out today." />

      {steps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
          Nothing due today.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-mist/30 bg-white/60 shadow-sm">
          <ul className="divide-y divide-mist/20">
            {steps.map((step) => (
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
                      {step.scheduledDate! < today ? " · overdue" : ""}
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
      )}
    </div>
  );
}
