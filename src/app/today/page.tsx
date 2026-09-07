import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import CopyBox from "@/components/CopyBox";
import { prisma } from "@/lib/prisma";
import { emailStepLabel } from "@/lib/constants";
import { scheduledToUtc, todayInTimeZone } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const candidates = await prisma.emailStepRecord.findMany({
    where: {
      sentAt: null,
      scheduledDate: { not: null },
      lead: { status: { notIn: ["BOOKED", "DEAD"] } },
    },
    include: { lead: { select: { id: true, businessName: true, email: true } } },
  });

  const todays = candidates
    .filter((r) => {
      const tz = r.scheduledTimezone || "UTC";
      return r.scheduledDate === todayInTimeZone(tz);
    })
    .map((r) => ({
      ...r,
      sortInstant:
        scheduledToUtc(r.scheduledDate!, r.scheduledTime || "09:00", r.scheduledTimezone || "UTC")?.getTime() ?? 0,
    }))
    .sort((a, b) => a.sortInstant - b.sortInstant);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Today's Outreach"
        description={`${todays.length} email${todays.length === 1 ? "" : "s"} scheduled for today, in send order.`}
      />

      {todays.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
          Nothing scheduled for today. Set a Send date/time on an email step to have it show up here.
        </div>
      ) : (
        <div className="space-y-6">
          {todays.map((step) => (
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
                <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-paper">
                  {step.scheduledTime || "—"}
                  {step.scheduledTimezone ? ` (${step.scheduledTimezone})` : ""}
                </span>
              </div>

              <div className="space-y-3">
                {step.hasSubject && <CopyBox label="Subject" text={step.subject} />}
                <CopyBox label="Body" text={step.body} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
