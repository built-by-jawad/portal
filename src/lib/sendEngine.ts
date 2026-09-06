import { prisma } from "@/lib/prisma";
import { getDefaultAccountId, sendGmail } from "@/lib/google";

function stripReplyPrefix(subject: string) {
  return subject.replace(/^(re:\s*)+/i, "").trim();
}

// Core Gmail-send logic, shared by the manual "Send via Gmail" button (src/lib/actions.ts) and the
// scheduled-send cron job (src/app/api/cron/send-scheduled/route.ts) so both paths stay identical.
export async function performSend(leadId: string, recordId: string, accountId?: string) {
  const [lead, records] = await Promise.all([
    prisma.lead.findUniqueOrThrow({ where: { id: leadId } }),
    prisma.emailStepRecord.findMany({
      where: { leadId },
      orderBy: { order: "asc" },
      include: { attachments: true },
    }),
  ]);

  if (!lead.email) throw new Error("This lead has no email address to send to.");

  const record = records.find((r) => r.id === recordId);
  if (!record) throw new Error("Email not found");

  const resolvedAccountId = accountId || lead.sendAccountId || (await getDefaultAccountId());
  if (!resolvedAccountId) {
    throw new Error("No Gmail account connected. Connect one in Settings first.");
  }

  const previous = records.filter((r) => r.order < record.order).at(-1);

  if (record.condition === "IF_REPLIED" && !previous?.repliedAt) {
    throw new Error(
      'This step only sends if the lead replied to the previous email. Run "Check for replies" first, or change its condition.'
    );
  }
  if (record.condition === "IF_NOT_REPLIED" && previous?.repliedAt) {
    throw new Error("This step only sends if the lead did NOT reply to the previous email, and they did.");
  }

  const useThread = record.threadMode !== "SEPARATE" && !!previous?.gmailThreadId;

  let subject = record.subject;
  if (!record.hasSubject) {
    const lastWithSubject = [...records]
      .filter((r) => r.order < record.order && r.hasSubject)
      .at(-1);
    const base = stripReplyPrefix(lastWithSubject?.subject || lead.businessName);
    subject = `Re: ${base}`;
  }

  // Vercel's deployment protection blocks anonymous requests (like Gmail's image proxy fetching
  // the tracking pixel, or its link-preview fetcher hitting a click redirect), so the bypass
  // secret is appended to both tracking URLs here — see VERCEL_AUTOMATION_BYPASS_SECRET in
  // Project Settings → Deployment Protection (auto-provided as a system env var).
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const bypassQuery = bypass ? `?x-vercel-protection-bypass=${bypass}` : "";
  const trackingPixelUrl = `${process.env.APP_URL}/api/track/${record.id}${bypassQuery}`;
  const clickTrackingBaseUrl = `${process.env.APP_URL}/api/click/${record.id}${bypassQuery}`;

  const { messageId, threadId } = await sendGmail({
    accountId: resolvedAccountId,
    to: lead.email,
    subject,
    bodyText: record.body,
    trackingPixelUrl,
    clickTrackingBaseUrl,
    threadId: useThread ? previous?.gmailThreadId ?? undefined : undefined,
    inReplyToMessageId: useThread ? previous?.gmailMessageId ?? undefined : undefined,
    attachments: record.attachments.map((a) => ({
      filename: a.filename,
      url: a.url,
      contentType: a.contentType,
    })),
  });

  await prisma.emailStepRecord.update({
    where: { id: recordId },
    data: {
      sentAt: new Date(),
      gmailMessageId: messageId,
      gmailThreadId: threadId,
    },
  });

  if (lead.status === "NEW" || lead.status === "RESEARCHED") {
    await prisma.lead.update({ where: { id: leadId }, data: { status: "CONTACTED" } });
  }
}
