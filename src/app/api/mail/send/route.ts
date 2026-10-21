import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendThreadedEmail } from "@/lib/mailSend";

// Compose or reply from the /mail page, independent of any lead. inReplyTo (a Message-ID) is
// optional — set it when replying so the new message threads under the original.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { mailboxId, to, subject, text, inReplyTo, attachments } = body as {
    mailboxId?: string;
    to?: string;
    subject?: string;
    text?: string;
    inReplyTo?: string;
    attachments?: { filename: string; url: string }[];
  };

  if (!mailboxId || !to || !text) {
    return NextResponse.json({ error: "mailboxId, to and text are required" }, { status: 400 });
  }

  const mailbox = await prisma.mailbox.findUnique({ where: { id: mailboxId } });
  if (!mailbox) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });

  try {
    const result = await sendThreadedEmail({
      fromEmail: mailbox.email,
      to,
      subject: subject ?? "",
      text,
      inReplyTo: inReplyTo ?? null,
      attachments,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
