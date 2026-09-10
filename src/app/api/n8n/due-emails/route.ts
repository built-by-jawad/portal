import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDue } from "@/lib/scheduling";
import { checkN8nAuth } from "@/lib/n8n";
import { getDefaultAccountId, listEmailAccounts } from "@/lib/google";

// n8n polls this on a schedule (e.g. every 5-15 min) to fetch every email step that's due to send
// right now. The portal is just the source of truth here — n8n does the actual Gmail sending with
// its own Gmail credential per account, then calls POST /api/n8n/mark-sent when it's done. Mirrors
// the same due-date and pipeline-condition checks /api/cron/send-scheduled uses, so this list is
// exactly what the Dashboard's "Next up to send" queue shows.
export async function GET(request: NextRequest) {
  const unauthorized = checkN8nAuth(request);
  if (unauthorized) return unauthorized;

  const [accounts, defaultAccountId] = await Promise.all([listEmailAccounts(), getDefaultAccountId()]);
  const accountById = new Map(accounts.map((a) => [a.id, a.email]));

  const now = new Date();

  const candidates = await prisma.emailStepRecord.findMany({
    where: {
      sentAt: null,
      scheduledDate: { not: null },
      lead: { status: { notIn: ["BOOKED", "DEAD"] } },
    },
    include: {
      lead: { select: { id: true, email: true, status: true, sendAccountId: true } },
      attachments: true,
    },
    orderBy: [{ leadId: "asc" }, { order: "asc" }],
  });

  const due = candidates.filter((r) => isDue(r.scheduledDate, r.scheduledTime, r.scheduledTimezone, now));
  if (due.length === 0) return NextResponse.json({ emails: [] });

  const previousByLeadOrder = new Map(
    (
      await prisma.emailStepRecord.findMany({
        where: { leadId: { in: [...new Set(due.map((r) => r.leadId))] } },
        select: { leadId: true, order: true, repliedAt: true, gmailThreadId: true, gmailMessageId: true },
      })
    ).map((r) => [`${r.leadId}:${r.order}`, r])
  );

  const emails = [];
  for (const record of due) {
    if (!record.lead.email) continue;

    if (record.condition !== "ALWAYS") {
      const prev = previousByLeadOrder.get(`${record.leadId}:${record.order - 1}`);
      const eligible =
        record.condition === "IF_REPLIED"
          ? !!prev?.repliedAt
          : record.condition === "IF_NOT_REPLIED"
            ? !prev?.repliedAt
            : true;
      if (!eligible) continue;
    }

    const effectiveAccountId = record.lead.sendAccountId || defaultAccountId;
    const fromAccountEmail = effectiveAccountId ? accountById.get(effectiveAccountId) : undefined;
    if (!fromAccountEmail) continue;

    const prev =
      record.order > 0 ? previousByLeadOrder.get(`${record.leadId}:${record.order - 1}`) : undefined;

    emails.push({
      recordId: record.id,
      leadId: record.leadId,
      toEmail: record.lead.email,
      fromAccountEmail,
      hasSubject: record.hasSubject,
      subject: record.subject,
      body: record.body,
      threadMode: record.threadMode,
      replyToGmailThreadId: record.threadMode === "THREAD" ? prev?.gmailThreadId ?? null : null,
      replyToGmailMessageId: record.threadMode === "THREAD" ? prev?.gmailMessageId ?? null : null,
      attachments: record.attachments.map((a) => ({ filename: a.filename, url: a.url })),
      scheduledDate: record.scheduledDate,
      scheduledTime: record.scheduledTime,
      scheduledTimezone: record.scheduledTimezone,
    });
  }

  return NextResponse.json({ emails });
}
