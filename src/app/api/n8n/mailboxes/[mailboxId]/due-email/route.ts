import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkN8nAuth } from "@/lib/n8n";
import { scheduledToUtc, isWithinSendWindow, todayInTimeZone } from "@/lib/scheduling";

// Returns the single highest-priority email step this mailbox should send right now, if any, and
// atomically claims it (status PENDING -> QUEUED) so a second poll in the same cycle can't also
// grab it. n8n is expected to call mark-sent/mark-failed shortly after; a claim older than 10
// minutes is treated as abandoned and re-offered.
const CLAIM_STALE_MS = 10 * 60 * 1000;

export async function GET(request: NextRequest, { params }: { params: Promise<{ mailboxId: string }> }) {
  const authError = checkN8nAuth(request);
  if (authError) return authError;

  const { mailboxId } = await params;

  const mailbox = await prisma.mailbox.findUnique({ where: { id: mailboxId } });
  if (!mailbox || !mailbox.isActive) {
    return NextResponse.json({ found: false });
  }

  const staleCutoff = new Date(Date.now() - CLAIM_STALE_MS);

  const candidates = await prisma.emailStepRecord.findMany({
    where: {
      lead: { mailboxId, outreachStatus: "SEQUENCE_STARTED" },
      OR: [{ status: "PENDING" }, { status: "QUEUED", claimedAt: { lt: staleCutoff } }],
    },
    include: { lead: true, attachments: true },
    orderBy: [{ order: "asc" }],
  });

  const now = new Date();

  for (const step of candidates) {
    const timezone = step.lead.timezone;
    if (!timezone) continue;
    if (!step.scheduledDate) continue;

    // Due means its scheduled date is today-or-earlier in the lead's own timezone, AND we're
    // currently inside the 8:30-10:30am local send window.
    const todayLocal = todayInTimeZone(timezone, now);
    if (step.scheduledDate > todayLocal) continue;
    if (!isWithinSendWindow(timezone, now)) continue;

    const dueInstant = scheduledToUtc(step.scheduledDate, step.scheduledTime ?? "08:30", timezone);
    if (dueInstant && dueInstant.getTime() > now.getTime()) continue;

    const claim = await prisma.emailStepRecord.updateMany({
      where: { id: step.id, status: step.status },
      data: { status: "QUEUED", claimedAt: now },
    });
    if (claim.count === 0) continue; // another poll already claimed it

    // Follow-ups (order > 0) must thread under the initial email: same subject (Re: prefixed)
    // and In-Reply-To/References pointing at the initial email's Message-ID.
    let threadSubject = step.hasSubject ? step.subject : null;
    let inReplyTo: string | null = null;
    if (step.order > 0) {
      const initialStep = await prisma.emailStepRecord.findFirst({
        where: { leadId: step.leadId, order: 0 },
      });
      if (initialStep) {
        const rootSubject = initialStep.hasSubject ? initialStep.subject : null;
        if (rootSubject) {
          threadSubject = /^re:/i.test(rootSubject) ? rootSubject : `Re: ${rootSubject}`;
        }
        inReplyTo = initialStep.messageId ?? null;
      }
    }

    return NextResponse.json({
      found: true,
      emailStepRecordId: step.id,
      leadId: step.leadId,
      to: step.lead.email,
      subject: threadSubject,
      body: step.body,
      order: step.order,
      inReplyTo,
      attachments: step.attachments.map((a) => ({ filename: a.filename, url: a.url })),
    });
  }

  return NextResponse.json({ found: false });
}
