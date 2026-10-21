import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Returns every active mailbox plus its unread Inbox count, so the /mail sidebar can show
// unread badges per mailbox and a combined total for the "All Mailboxes" view.
export async function GET() {
  const [mailboxes, unread] = await Promise.all([
    prisma.mailbox.findMany({
      where: { isActive: true },
      orderBy: { email: "asc" },
      select: { id: true, label: true, email: true },
    }),
    prisma.mailMessage.groupBy({
      by: ["mailboxId"],
      where: { folder: "INBOX", seen: false },
      _count: true,
    }),
  ]);

  const unreadByMailbox = Object.fromEntries(unread.map((u) => [u.mailboxId, u._count]));
  return NextResponse.json({
    mailboxes: mailboxes.map((m) => ({ ...m, unread: unreadByMailbox[m.id] ?? 0 })),
  });
}
