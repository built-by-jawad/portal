import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Flat, folder-scoped message list for the /mail page's middle column — newest first.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mailboxId = searchParams.get("mailboxId");
  const folder = searchParams.get("folder") ?? "INBOX";
  if (!mailboxId) return NextResponse.json({ error: "mailboxId is required" }, { status: 400 });

  const messages = await prisma.mailMessage.findMany({
    where: { mailboxId, folder },
    orderBy: { date: "desc" },
    take: 200,
    select: {
      id: true,
      uid: true,
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
    messages: messages.map((m) => ({ ...m, snippet: (m.textPlain ?? "").trim().replace(/\s+/g, " ").slice(0, 140) })),
  });
}
