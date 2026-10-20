import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkN8nAuth } from "@/lib/n8n";
import { STOPPING_STATUSES, LEGACY_STATUS, type OutreachStatus } from "@/lib/outreach";
import { revalidatePath } from "next/cache";

// Called from each mailbox's IMAP reply-detection branch when a new inbound message arrives.
// Matches the lead by the address that sent it (primary or secondary email), scoped to the
// mailbox that received it, and stops the sequence if it isn't already stopped.
export async function POST(request: NextRequest) {
  const authError = checkN8nAuth(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const mailboxEmail: string | undefined = body.mailboxEmail;
  const fromAddress: string | undefined = body.fromAddress;

  if (!mailboxEmail || !fromAddress) {
    return NextResponse.json({ error: "mailboxEmail and fromAddress are required" }, { status: 400 });
  }

  const from = fromAddress.trim().toLowerCase();

  const mailbox = await prisma.mailbox.findUnique({ where: { email: mailboxEmail.trim().toLowerCase() } });
  if (!mailbox) return NextResponse.json({ matched: false });

  const lead = await prisma.lead.findFirst({
    where: {
      mailboxId: mailbox.id,
      OR: [{ email: { equals: from, mode: "insensitive" } }, { secondaryEmails: { has: from } }],
    },
  });

  if (!lead) return NextResponse.json({ matched: false });

  if (!STOPPING_STATUSES.includes(lead.outreachStatus as OutreachStatus)) {
    const now = new Date();
    await prisma.$transaction([
      prisma.lead.update({
        where: { id: lead.id },
        data: {
          outreachStatus: "REPLIED",
          status: LEGACY_STATUS.REPLIED,
          repliedAt: lead.repliedAt ?? now,
          sequenceDone: true,
        },
      }),
      prisma.emailStepRecord.updateMany({
        where: { leadId: lead.id, status: { in: ["PENDING", "QUEUED"] } },
        data: { status: "SKIPPED" },
      }),
    ]);
    revalidatePath(`/leads/${lead.id}`);
  }

  return NextResponse.json({ matched: true, leadId: lead.id, businessName: lead.businessName, fromAddress: from });
}
