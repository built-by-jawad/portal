import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { setMessageFlags, moveMessage, permanentlyDeleteMessage, syncMailbox } from "@/lib/mailSync";

const include = {
  mailbox: { select: { label: true, email: true } },
  attachments: { select: { id: true, filename: true, contentType: true, size: true, url: true } },
} as const;

type MessageWithExtras = Prisma.MailMessageGetPayload<{ include: typeof include }>;

function attach(m: MessageWithExtras) {
  return { ...m, mailboxLabel: m.mailbox?.label || m.mailbox?.email, mailbox: undefined };
}

// Full message plus the rest of its conversation (any folder, same mailbox, same threadKey) —
// the detail pane on the right side of /mail.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const message = await prisma.mailMessage.findUnique({ where: { id }, include });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!message.seen) {
    await prisma.mailMessage.update({ where: { id }, data: { seen: true } });
    setMessageFlags(message.mailbox.email, message.folder, message.uid, { seen: true }).catch((err) =>
      console.error("setMessageFlags(seen) failed:", err)
    );
  }

  const thread = await prisma.mailMessage.findMany({
    where: { mailboxId: message.mailboxId, threadKey: message.threadKey },
    orderBy: { date: "asc" },
    include,
  });

  return NextResponse.json({ message: { ...attach(message), seen: true }, thread: thread.map(attach) });
}

// Flips \Seen / \Flagged on the real mailbox and mirrors it in the DB. Body: { seen?, flagged? }.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { seen?: boolean; flagged?: boolean };
  const message = await prisma.mailMessage.findUnique({ where: { id }, include: { mailbox: true } });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await setMessageFlags(message.mailbox.email, message.folder, message.uid, body);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "IMAP flag update failed" }, { status: 500 });
  }

  const updated = await prisma.mailMessage.update({
    where: { id },
    data: {
      ...(body.seen !== undefined ? { seen: body.seen } : {}),
      ...(body.flagged !== undefined ? { flagged: body.flagged } : {}),
    },
  });

  return NextResponse.json({ message: updated });
}

// Deletes a message. If it's already in Trash this permanently removes it from the server;
// otherwise it moves it to Trash (standard mail-client "Delete" semantics).
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const message = await prisma.mailMessage.findUnique({ where: { id }, include: { mailbox: true } });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    if (message.folder === "Trash") {
      await permanentlyDeleteMessage(message.mailbox.email, message.folder, message.uid);
      await prisma.mailMessage.delete({ where: { id } });
    } else {
      await moveMessage(message.mailbox.email, message.folder, message.uid, "Trash");
      await prisma.mailMessage.delete({ where: { id } });
      await syncMailbox(message.mailboxId, message.mailbox.email);
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
