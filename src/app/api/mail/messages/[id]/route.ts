import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Full message plus the rest of its conversation (any folder, same mailbox, same threadKey) —
// the detail pane on the right side of /mail.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const message = await prisma.mailMessage.findUnique({
    where: { id },
    include: { mailbox: { select: { label: true, email: true } } },
  });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!message.seen) {
    await prisma.mailMessage.update({ where: { id }, data: { seen: true } });
  }

  const thread = await prisma.mailMessage.findMany({
    where: { mailboxId: message.mailboxId, threadKey: message.threadKey },
    orderBy: { date: "asc" },
    include: { mailbox: { select: { label: true, email: true } } },
  });

  const attach = (m: typeof message) => ({ ...m, mailboxLabel: m.mailbox?.label || m.mailbox?.email, mailbox: undefined });

  return NextResponse.json({ message: { ...attach(message), seen: true }, thread: thread.map(attach) });
}
