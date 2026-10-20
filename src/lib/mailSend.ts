import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { getGmailClient } from "@/lib/google";
import { appendToSent, syncMailbox } from "@/lib/mailSync";

// Password for each Titan mailbox, keyed by email. Stored as one JSON env var rather than per-
// mailbox vars so adding/removing a mailbox doesn't require new env var names.
// Shape: {"jawad@builtbyjawad.co": "...", "jawad@builtbyjawad.org": "...", ...}
function getMailboxPassword(email: string): string {
  const raw = process.env.TITAN_MAILBOX_PASSWORDS;
  if (!raw) throw new Error("TITAN_MAILBOX_PASSWORDS env var is not set");
  const map = JSON.parse(raw) as Record<string, string>;
  const password = map[email.toLowerCase()];
  if (!password) throw new Error(`No Titan password configured for ${email}`);
  return password;
}

function titanTransporterFor(email: string) {
  return nodemailer.createTransport({
    host: "smtp.titan.email",
    port: 465,
    secure: true,
    auth: { user: email, pass: getMailboxPassword(email) },
  });
}

function normalizeMessageId(id: string) {
  return id.startsWith("<") ? id : `<${id}>`;
}

function encodeHeaderWord(value: string) {
  // Keep it simple: base64 any non-ASCII subject so it's a valid RFC 2822 header.
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

async function sendViaGmail(params: {
  fromEmail: string;
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string | null;
  threadId?: string | null;
}) {
  const gmail = await getGmailClient(params.fromEmail);

  const inReplyTo = params.inReplyTo ? normalizeMessageId(params.inReplyTo) : undefined;
  const headers = [
    `From: ${params.fromEmail}`,
    `To: ${params.to}`,
    `Subject: ${encodeHeaderWord(params.subject)}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `MIME-Version: 1.0`,
  ];
  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`);
    headers.push(`References: ${inReplyTo}`);
  }

  const raw = `${headers.join("\r\n")}\r\n\r\n${params.text}`;
  const encoded = Buffer.from(raw).toString("base64url");

  // Passing Gmail's own threadId (when we have one, i.e. this is a follow-up) forces the message
  // into the same thread server-side — this is what actually controls Gmail threading, and it
  // works regardless of whether the In-Reply-To/References headers above match exactly.
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded, threadId: params.threadId ?? undefined },
  });

  // The send already succeeded by this point. Fetching the RFC822 Message-ID header is a nice-to-
  // have (lets a reply-detection poll match on it later) but needs an extra scope (gmail.metadata)
  // that an older Gmail connection may not have granted yet. Never let that lookup failing turn an
  // email that was actually sent into a reported failure.
  let messageIdHeader: string | undefined;
  try {
    const sent = await gmail.users.messages.get({
      userId: "me",
      id: res.data.id!,
      format: "metadata",
      metadataHeaders: ["Message-ID"],
    });
    messageIdHeader = sent.data.payload?.headers?.find((h) => h.name?.toLowerCase() === "message-id")?.value ?? undefined;
  } catch {
    // Missing scope or any other lookup failure — keep going with the fallback id below.
  }

  return {
    messageId: messageIdHeader ?? res.data.id ?? "",
    threadId: res.data.threadId ?? undefined,
  };
}

async function sendViaTitan(params: {
  fromEmail: string;
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string | null;
  attachments?: { filename: string; url: string }[];
}) {
  const transporter = titanTransporterFor(params.fromEmail);
  const inReplyTo = params.inReplyTo ? normalizeMessageId(params.inReplyTo) : undefined;

  const info = await transporter.sendMail({
    from: params.fromEmail,
    to: params.to,
    subject: params.subject,
    text: params.text,
    inReplyTo,
    references: inReplyTo,
    attachments: params.attachments?.map((a) => ({ filename: a.filename, path: a.url })),
  });

  // Raw SMTP sends never show up in Titan's own Sent folder on their own (that's a webmail-client
  // behavior, not an SMTP one) — append a copy ourselves, then sync so it's in the DB with its real
  // UID right away. Best-effort: a mail already sent should never be reported as failed.
  try {
    const headers = [
      `From: ${params.fromEmail}`,
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      `Message-ID: ${info.messageId}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `MIME-Version: 1.0`,
    ];
    if (inReplyTo) {
      headers.push(`In-Reply-To: ${inReplyTo}`);
      headers.push(`References: ${inReplyTo}`);
    }
    const raw = `${headers.join("\r\n")}\r\n\r\n${params.text}`;
    await appendToSent(params.fromEmail, raw);
    const mailbox = await prisma.mailbox.findUnique({ where: { email: params.fromEmail } });
    if (mailbox) await syncMailbox(mailbox.id, params.fromEmail);
  } catch (err) {
    console.error("appendToSent/syncMailbox failed (send itself succeeded):", err);
  }

  return { messageId: info.messageId as string, threadId: undefined as string | undefined };
}

export async function sendThreadedEmail(params: {
  fromEmail: string;
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string | null;
  threadId?: string | null;
  attachments?: { filename: string; url: string }[];
}) {
  const mailbox = await prisma.mailbox.findUnique({ where: { email: params.fromEmail } });
  if (mailbox?.provider === "GMAIL") {
    return sendViaGmail(params);
  }
  return sendViaTitan(params);
}
