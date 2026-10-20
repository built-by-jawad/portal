import { prisma } from "@/lib/prisma";
import { sendThreadedEmail } from "@/lib/mailSend";
import { revalidatePath } from "next/cache";

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

  if (step.order > 0) {
    const initialStep = await prisma.emailStepRecord.findFirst({ where: { leadId: step.leadId, order: 0 } });
    if (initialStep) {
      const rootSubject = initialStep.hasSubject ? initialStep.subject : null;
      if (rootSubject) subject = /^re:/i.test(rootSubject) ? rootSubject : `Re: ${rootSubject}`;
      inReplyTo = initialStep.messageId ?? null;
    }
  }

  try {
    const { messageId } = await sendThreadedEmail({
      fromEmail: step.lead.mailbox.email,
      to: step.lead.email,
      subject: subject ?? "",
      text: step.body,
      inReplyTo,
      attachments: step.attachments.map((a) => ({ filename: a.filename, url: a.url })),
    });

    const sentAt = new Date();

    await prisma.emailStepRecord.update({
      where: { id },
      data: { status: "SENT", sentAt, sentFromMailboxId: step.lead.mailboxId, messageId },
    });

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
