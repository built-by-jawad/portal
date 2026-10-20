import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkN8nAuth } from "@/lib/n8n";
import { revalidatePath } from "next/cache";

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
