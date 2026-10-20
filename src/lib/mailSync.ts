import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const FOLDERS = ["INBOX", "Sent", "Drafts", "Archive", "Spam", "Trash"];

function getMailboxPassword(email: string): string {
  const raw = process.env.TITAN_MAILBOX_PASSWORDS;
  if (!raw) throw new Error("TITAN_MAILBOX_PASSWORDS env var is not set");
  const map = JSON.parse(raw) as Record<string, string>;
  const password = map[email.toLowerCase()];
  if (!password) throw new Error(`No Titan password configured for ${email}`);
  return password;
}

// Groups a conversation without relying on References headers (Titan replies often lack them):
// normalized subject (Re:/Fwd: stripped, lowercased) plus the other party's address.
export function threadKeyFor(subject: string, mailboxEmail: string, fromAddress: string, toAddress: string) {
  const normalizedSubject = subject
    .replace(/^(\s*(re|fwd?)\s*:\s*)+/i, "")
    .trim()
    .toLowerCase();
  const other = fromAddress.toLowerCase() === mailboxEmail.toLowerCase() ? toAddress : fromAddress;
  return `${normalizedSubject}::${(other ?? "").toLowerCase()}`;
}

async function syncFolder(client: ImapFlow, mailboxId: string, mailboxEmail: string, folder: string) {
  let lock;
  try {
    lock = await client.getMailboxLock(folder);
  } catch {
    return; // folder doesn't exist on this account, skip it
  }
  try {
    const state = await prisma.mailSyncState.upsert({
      where: { mailboxId_folder: { mailboxId, folder } },
      update: {},
      create: { mailboxId, folder, lastUid: 0 },
    });

    const range = `${state.lastUid + 1}:*`;
    let maxUid = state.lastUid;
    const rows: Prisma.MailMessageCreateManyInput[] = [];

    for await (const msg of client.fetch(range, { uid: true, envelope: true, source: true, flags: true })) {
      if (msg.uid <= state.lastUid) continue;
      maxUid = Math.max(maxUid, msg.uid);
      const parsed = await simpleParser(msg.source!);
      const fromAddr = parsed.from?.value?.[0]?.address ?? msg.envelope?.from?.[0]?.address ?? "";
      const fromName = parsed.from?.value?.[0]?.name ?? msg.envelope?.from?.[0]?.name ?? null;
      const toAddr = parsed.to && "value" in parsed.to ? parsed.to.value?.[0]?.address : undefined;
      const subject = parsed.subject ?? msg.envelope?.subject ?? "(no subject)";

      rows.push({
        mailboxId,
        folder,
        uid: msg.uid,
        messageId: parsed.messageId ?? null,
        inReplyTo: parsed.inReplyTo ?? null,
        threadKey: threadKeyFor(subject, mailboxEmail, fromAddr, toAddr ?? ""),
        fromAddress: fromAddr,
        fromName,
        toAddress: toAddr ?? null,
        subject,
        textPlain: parsed.text ?? null,
        textHtml: typeof parsed.html === "string" ? parsed.html : null,
        date: parsed.date ?? msg.envelope?.date ?? new Date(),
        seen: msg.flags?.has("\\Seen") ?? false,
      });
    }

    if (rows.length > 0) {
      await prisma.mailMessage.createMany({ data: rows, skipDuplicates: true });
    }

    if (maxUid > state.lastUid) {
      await prisma.mailSyncState.update({ where: { mailboxId_folder: { mailboxId, folder } }, data: { lastUid: maxUid } });
    }
  } finally {
    lock.release();
  }
}

export async function syncMailbox(mailboxId: string, email: string) {
  const client = new ImapFlow({
    host: "imap.titan.email",
    port: 993,
    secure: true,
    auth: { user: email, pass: getMailboxPassword(email) },
    logger: false,
  });
  await client.connect();
  try {
    for (const folder of FOLDERS) {
      await syncFolder(client, mailboxId, email, folder);
    }
  } finally {
    await client.logout().catch(() => client.close());
  }
}

export async function syncAllActiveMailboxes() {
  const mailboxes = await prisma.mailbox.findMany({ where: { isActive: true, provider: "TITAN" } });
  const results: { email: string; ok: boolean; error?: string }[] = [];
  for (const mb of mailboxes) {
    try {
      await syncMailbox(mb.id, mb.email);
      results.push({ email: mb.email, ok: true });
    } catch (err) {
      results.push({ email: mb.email, ok: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }
  return results;
}

// Appends a raw RFC822 message to a mailbox's Sent folder right after a successful SMTP send, so
// Titan's own Sent folder (and this portal's /mail page) show it — raw SMTP never does this itself.
export async function appendToSent(email: string, rawMessage: string) {
  const client = new ImapFlow({
    host: "imap.titan.email",
    port: 993,
    secure: true,
    auth: { user: email, pass: getMailboxPassword(email) },
    logger: false,
  });
  await client.connect();
  try {
    await client.append("Sent", rawMessage, ["\\Seen"]);
  } finally {
    await client.logout().catch(() => client.close());
  }
}
