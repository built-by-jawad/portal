import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { checkN8nAuth } from "@/lib/n8n";

// n8n calls this right after it actually sends an email step via Gmail, so the portal's UI
// (tabs, dashboard, calendar) reflects reality. gmailThreadId/gmailMessageId are optional but
// worth passing when known, since a THREAD-mode follow-up on the same lead needs them to reply
// in the same Gmail thread (see /api/n8n/due-emails' replyToGmailThreadId/replyToGmailMessageId).
export async function POST(request: NextRequest) {
  const unauthorized = checkN8nAuth(request);
  if (unauthorized) return unauthorized;

  const { recordId, gmailThreadId, gmailMessageId } = await request.json();
  if (typeof recordId !== "string" || !recordId) {
    return NextResponse.json({ error: "Missing recordId" }, { status: 400 });
  }

  const record = await prisma.emailStepRecord.update({
    where: { id: recordId },
    data: {
      sentAt: new Date(),
      gmailThreadId: typeof gmailThreadId === "string" ? gmailThreadId : undefined,
      gmailMessageId: typeof gmailMessageId === "string" ? gmailMessageId : undefined,
    },
  });

  revalidatePath(`/leads/${record.leadId}`);
  revalidatePath("/calendar");
  revalidatePath("/");

  return NextResponse.json({ ok: true });
}
