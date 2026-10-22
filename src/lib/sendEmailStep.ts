import { prisma } from "@/lib/prisma";
import { sendThreadedEmail } from "@/lib/mailSend";
import { revalidatePath } from "next/cache";
import { todayInTimeZone, addDays } from "@/lib/scheduling";
import { EMAIL_SEQUENCE_DAYS, LEGACY_STATUS } from "@/lib/outreach";

// Sends one EmailStepRecord for real (via mailSend.ts), threading follow-ups under the lead's
// initial email. Shared by the n8n automated-send route and the portal's own "Send manually"
// button so both paths behave identically.
export async function sendEmailStepById(id: string) {
  const step = await prisma.emailStepRecord.findUnique({
    where: { id },
    include: { lead: { include: { mailbox: true } }, attachments: true },
  });

  if (!step) return { ok: false as const, error: "Not found" };
  if (step.status === "SENT") return { ok: true as const, alreadySent: true };
  if (!step.lead.mailbox) return { ok: false as const, error: "Lead has no mailbox assigned" };
  if (!step.lead.email) return { ok: false as const, error: "Lead has no email address" };

  let subject = step.hasSubject ? step.subject : "";
  let inReplyTo: string | null = null;
  let threadId: string | null = null;

  if (step.order > 0) {
    const initialStep = await prisma.emailStepRecord.findFirst({ where: { leadId: step.leadId, order: 0 } });
    if (initialStep) {
      const rootSubject = initialStep.hasSubject ? initialStep.subject : null;
      if (rootSubject) subject = /^re:/i.test(rootSubject) ? rootSubject : `Re: ${rootSubject}`;
      inReplyTo = initialStep.messageId ?? null;
      threadId = initialStep.threadId ?? null;
    }
  }

  try {
    const { messageId, threadId: sentThreadId } = await sendThreadedEmail({
      fromEmail: step.lead.mailbox.email,
      to: step.lead.email,
      subject: subject ?? "",
      text: step.body,
      inReplyTo,
      threadId,
      attachments: step.attachments.map((a) => ({ filename: a.filename, url: a.url })),
    });

    const sentAt = new Date();

    await prisma.emailStepRecord.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt,
        sentFromMailboxId: step.lead.mailboxId,
        messageId,
        threadId: sentThreadId ?? null,
      },
    });

    // The initial email going out, by any path, IS "starting the sequence" — lay out the rest of
    // the fixed day 1/4/7/10/13 cadence from today (in the lead's own timezone) right here, so a
    // follow-up isn't silently stuck with no scheduledDate just because "Start sequence" (which
    // does the same thing ahead of time) was never clicked.
    if (step.order === 0 && !step.lead.sequenceStartedAt && step.lead.timezone) {
      const startDate = todayInTimeZone(step.lead.timezone, sentAt);
      const followups = await prisma.emailStepRecord.findMany({
        where: { leadId: step.leadId, order: { gt: 0, lt: EMAIL_SEQUENCE_DAYS.length }, scheduledDate: null },
      });
      await prisma.$transaction([
        prisma.lead.update({
          where: { id: step.leadId },
          data: {
            sequenceStartedAt: sentAt,
            ...(step.lead.outreachStatus === "NEW"
              ? { outreachStatus: "SEQUENCE_STARTED", status: LEGACY_STATUS.SEQUENCE_STARTED }
              : {}),
          },
        }),
        ...followups.map((f) =>
          prisma.emailStepRecord.update({
            where: { id: f.id },
            data: {
              scheduledDate: addDays(startDate, EMAIL_SEQUENCE_DAYS[f.order] - 1),
              scheduledTime: f.scheduledTime ?? "08:30",
              scheduledTimezone: f.scheduledTimezone ?? step.lead.timezone,
            },
          })
        ),
      ]);
    }

    const remaining = await prisma.emailStepRecord.count({
      where: { leadId: step.leadId, status: { in: ["PENDING", "QUEUED"] } },
    });

    await prisma.lead.update({
      where: { id: step.leadId },
      data: {
        contactedAt: step.order === 0 ? (step.lead.contactedAt ?? sentAt) : step.lead.contactedAt,
        sequenceDone: remaining === 0,
      },
    });

    revalidatePath(`/leads/${step.leadId}`);
    revalidatePath(`/leads/${step.leadId}/full`);
    return { ok: true as const, messageId };
  } catch (err) {
    await prisma.emailStepRecord.update({
      where: { id },
      data: { status: "FAILED", claimedAt: null },
    });
    revalidatePath(`/leads/${step.leadId}`);
    revalidatePath(`/leads/${step.leadId}/full`);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false as const, error: message };
  }
}
