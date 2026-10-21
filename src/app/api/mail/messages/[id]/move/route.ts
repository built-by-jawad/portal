import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { moveMessage, syncMailbox } from "@/lib/mailSync";

// Moves a message to another real IMAP folder (e.g. Archive). Body: { to: string }.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { to } = (await request.json().catch(() => ({}))) as { to?: string };
  if (!to) return NextResponse.json({ error: "to is required" }, { status: 400 });

  const message = await prisma.mailMessage.findUnique({ where: { id }, include: { mailbox: true } });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (message.folder === to) return NextResponse.json({ ok: true }); // already there

  try {
    await moveMessage(message.mailbox.email, message.folder, message.uid, to);
    await prisma.mailMessage.delete({ where: { id } });
    await syncMailbox(message.mailboxId, message.mailbox.email);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Move failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
