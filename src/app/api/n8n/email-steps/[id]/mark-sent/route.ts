import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkN8nAuth } from "@/lib/n8n";
import { revalidatePath } from "next/cache";
import { todayInTimeZone, addDays } from "@/lib/scheduling";
import { EMAIL_SEQUENCE_DAYS, LEGACY_STATUS } from "@/lib/outreach";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = checkN8nAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const mailboxId: string | undefined = body.mailboxId;
  const messageId: string | undefined = body.messageId;

  const step = await prisma.emailStepRecord.findUnique({ where: { id }, include: { lead: true } });
  if (!step) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (step.status === "SENT") {
    return NextResponse.json({ ok: true, alreadySent: true });
  }

  const sentAt = new Date();

  await prisma.emailStepRecord.update({
    where: { id },
    data: { status: "SENT", sentAt, sentFromMailboxId: mailboxId ?? step.lead.mailboxId, messageId },
  });

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
  return NextResponse.json({ ok: true });
}
