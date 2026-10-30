import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

// Flat, folder-scoped message list for the /mail page's middle column — newest first, paginated
// via a date cursor. mailboxId="all" merges this folder across every active mailbox instead of
// scoping to one. mailboxId="leads" merges across every mailbox too, but additionally restricts to
// messages to/from a lead's email address — the sidebar's "Leads Only" view. starred=true ignores
// folder entirely and returns every flagged message in scope.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mailboxId = searchParams.get("mailboxId");
  const folder = searchParams.get("folder") ?? "INBOX";
  const starred = searchParams.get("starred") === "true";
  const cursor = searchParams.get("cursor");
  if (!mailboxId) return NextResponse.json({ error: "mailboxId is required" }, { status: 400 });

  const where: Prisma.MailMessageWhereInput = mailboxId === "all" || mailboxId === "leads" ? {} : { mailboxId };
  if (starred) where.flagged = true;
  else where.folder = folder;
  if (cursor) where.date = { lt: new Date(cursor) };

  if (mailboxId === "leads") {
    const leads = await prisma.lead.findMany({ where: { email: { not: null } }, select: { email: true } });
    const leadEmails = leads.map((l) => l.email!).filter(Boolean);
    where.OR = [{ fromAddress: { in: leadEmails } }, { toAddress: { in: leadEmails } }];
  }

  const messages = await prisma.mailMessage.findMany({
    where,
    orderBy: { date: "desc" },
    take: PAGE_SIZE,
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
      flagged: true,
      threadKey: true,
      _count: { select: { attachments: true } },
    },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      ...m,
      mailboxLabel: m.mailbox?.label || m.mailbox?.email,
      mailbox: undefined,
      hasAttachments: m._count.attachments > 0,
      _count: undefined,
      snippet: (m.textPlain ?? "").trim().replace(/\s+/g, " ").slice(0, 140),
    })),
    hasMore: messages.length === PAGE_SIZE,
    nextCursor: messages.length ? messages[messages.length - 1].date.toISOString() : null,
  });
}
