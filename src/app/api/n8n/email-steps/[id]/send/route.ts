import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkN8nAuth } from "@/lib/n8n";
import { sendThreadedEmail } from "@/lib/mailSend";
import { revalidatePath } from "next/cache";

// Called by n8n right after due-email claims a step. The portal does the actual SMTP send here
// (via nodemailer, not n8n's Send Email node) so it can set real In-Reply-To/References headers
// on follow-ups, threading them under the initial email instead of just matching the subject line.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = checkN8nAuth(request);
  if (authError) return authError;

  const { id } = await params;

  const step = await prisma.emailStepRecord.findUnique({
    where: { id },
    include: { lead: { include: { mailbox: true } }, attachments: true },
  });

  if (!step) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (step.status === "SENT") return NextResponse.json({ ok: true, alreadySent: true });
  if (!step.lead.mailbox) return NextResponse.json({ ok: false, error: "Lead has no mailbox assigned" }, { status: 400 });
  if (!step.lead.email) return NextResponse.json({ ok: false, error: "Lead has no email address" }, { status: 400 });

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
    return NextResponse.json({ ok: true, messageId });
  } catch (err) {
    await prisma.emailStepRecord.update({
      where: { id },
      data: { status: "FAILED", claimedAt: null },
    });
    revalidatePath(`/leads/${step.leadId}`);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message });
  }
}
