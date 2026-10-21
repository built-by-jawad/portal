import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const FOLDERS = ["INBOX", "Sent", "Drafts", "Archive", "Spam", "Trash"];

function getMailboxPassword(email: string): string {
  const raw = process.env.TITAN_MAILBOX_PASSWORDS;
  if (!raw) throw new Error("TITAN_MAILBOX_PASSWORDS env var is not set");
  const map = JSON.parse(raw) as Record<string, string>;
  const password = map[email.toLowerCase()];
  if (!password) throw new Error(`No Titan password configured for ${email}`);
  return password;
}

async function withImapClient<T>(email: string, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = new ImapFlow({
    host: "imap.titan.email",
    port: 993,
    secure: true,
    auth: { user: email, pass: getMailboxPassword(email) },
    logger: false,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.logout().catch(() => client.close());
  }
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

    for await (const msg of client.fetch(range, { uid: true, envelope: true, source: true, flags: true })) {
      if (msg.uid <= state.lastUid) continue;
      maxUid = Math.max(maxUid, msg.uid);
      const parsed = await simpleParser(msg.source!);
      const fromAddr = parsed.from?.value?.[0]?.address ?? msg.envelope?.from?.[0]?.address ?? "";
      const fromName = parsed.from?.value?.[0]?.name ?? msg.envelope?.from?.[0]?.name ?? null;
      const toAddr = parsed.to && "value" in parsed.to ? parsed.to.value?.[0]?.address : undefined;
      const subject = parsed.subject ?? msg.envelope?.subject ?? "(no subject)";

      const data: Prisma.MailMessageUncheckedCreateInput = {
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
        flagged: msg.flags?.has("\\Flagged") ?? false,
      };

      try {
        const created = await prisma.mailMessage.create({ data });
        const attachments = (parsed.attachments ?? []).filter((a) => a.filename);
        for (const att of attachments) {
          const blob = await put(`mail-attachments/${created.id}/${att.filename}`, att.content, {
            access: "public",
            contentType: att.contentType,
            addRandomSuffix: true,
          });
          await prisma.mailAttachment.create({
            data: {
              mailMessageId: created.id,
              filename: att.filename ?? "attachment",
              contentType: att.contentType,
              size: att.content.length,
              url: blob.url,
            },
          });
        }
      } catch (err) {
        // Same UID appeared twice in this fetch batch (seen once on a prior run too) — already synced, skip it.
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
      }
    }

    if (maxUid > state.lastUid) {
      await prisma.mailSyncState.update({ where: { mailboxId_folder: { mailboxId, folder } }, data: { lastUid: maxUid } });
    }
  } finally {
    lock.release();
  }
}

export async function syncMailbox(mailboxId: string, email: string) {
  await withImapClient(email, async (client) => {
    for (const folder of FOLDERS) {
      await syncFolder(client, mailboxId, email, folder);
    }
  });
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
  await withImapClient(email, async (client) => {
    await client.append("Sent", rawMessage, ["\\Seen"]);
  });
}

// Flips \Seen / \Flagged on the real IMAP message. Callers update the MailMessage row themselves
// once this resolves — keeps the DB and the real mailbox in agreement.
export async function setMessageFlags(email: string, folder: string, uid: number, flags: { seen?: boolean; flagged?: boolean }) {
  await withImapClient(email, async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      if (flags.seen === true) await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      if (flags.seen === false) await client.messageFlagsRemove(String(uid), ["\\Seen"], { uid: true });
      if (flags.flagged === true) await client.messageFlagsAdd(String(uid), ["\\Flagged"], { uid: true });
      if (flags.flagged === false) await client.messageFlagsRemove(String(uid), ["\\Flagged"], { uid: true });
    } finally {
      lock.release();
    }
  });
}

// Moves a message to another real IMAP folder (e.g. Archive, Trash). The destination gets a new
// UID assigned by the server — callers should delete the old MailMessage row and re-run
// syncMailbox so the moved message is picked up fresh in its new folder.
export async function moveMessage(email: string, fromFolder: string, uid: number, toFolder: string) {
  await withImapClient(email, async (client) => {
    const lock = await client.getMailboxLock(fromFolder);
    try {
      await client.messageMove(String(uid), toFolder, { uid: true });
    } finally {
      lock.release();
    }
  });
}

// Permanently removes a message from the server (flags \Deleted + expunges). Only meant to be
// called on messages already sitting in Trash.
export async function permanentlyDeleteMessage(email: string, folder: string, uid: number) {
  await withImapClient(email, async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      await client.messageDelete(String(uid), { uid: true });
    } finally {
      lock.release();
    }
  });
}
