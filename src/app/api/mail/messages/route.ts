import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Flat, folder-scoped message list for the /mail page's middle column — newest first.
// mailboxId="all" merges this folder across every active mailbox instead of scoping to one.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mailboxId = searchParams.get("mailboxId");
  const folder = searchParams.get("folder") ?? "INBOX";
  if (!mailboxId) return NextResponse.json({ error: "mailboxId is required" }, { status: 400 });

  const messages = await prisma.mailMessage.findMany({
    where: mailboxId === "all" ? { folder } : { mailboxId, folder },
    orderBy: { date: "desc" },
    take: 300,
    select: {
      id: true,
      uid: true,
      mailboxId: true,
      mailbox: { select: { label: true, email: true } },
      fromAddress: true,
      fromName: true,
      toAddress: true,
      subject: true,
      textPlain: true,
      date: true,
      seen: true,
      threadKey: true,
    },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      ...m,
      mailboxLabel: m.mailbox?.label || m.mailbox?.email,
      mailbox: undefined,
      snippet: (m.textPlain ?? "").trim().replace(/\s+/g, " ").slice(0, 140),
    })),
  });
}
