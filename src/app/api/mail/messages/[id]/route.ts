import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Full message plus the rest of its conversation (any folder, same mailbox, same threadKey) —
// the detail pane on the right side of /mail.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const message = await prisma.mailMessage.findUnique({ where: { id } });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!message.seen) {
    await prisma.mailMessage.update({ where: { id }, data: { seen: true } });
  }

  const thread = await prisma.mailMessage.findMany({
    where: { mailboxId: message.mailboxId, threadKey: message.threadKey },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ message: { ...message, seen: true }, thread });
}
