import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { getGmailClient } from "@/lib/google";

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

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  });

  // The send already succeeded by this point. Fetching the RFC822 Message-ID header is a nice-to-
  // have for threading follow-ups off the exact header value, but it needs an extra scope
  // (gmail.metadata) that an older Gmail connection may not have granted yet. Never let that
  // lookup failing turn an email that was actually sent into a reported failure — fall back to
  // Gmail's own message id, which is still enough to detect "already sent" on retries.
  let messageIdHeader: string | undefined;
  try {
    const sent = await gmail.users.messages.get({
      userId: "me",
      id: res.data.id!,
      format: "metadata",
      metadataHeaders: ["Message-ID"],
    });
    messageIdHeader = sent.data.payload?.headers?.find((h) => h.name === "Message-ID")?.value ?? undefined;
  } catch {
    // Missing scope or any other lookup failure — keep going with the fallback id below.
  }

  return { messageId: messageIdHeader ?? res.data.id ?? "" };
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

  return { messageId: info.messageId as string };
}

export async function sendThreadedEmail(params: {
  fromEmail: string;
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string | null;
  attachments?: { filename: string; url: string }[];
}) {
  const mailbox = await prisma.mailbox.findUnique({ where: { email: params.fromEmail } });
  if (mailbox?.provider === "GMAIL") {
    return sendViaGmail(params);
  }
  return sendViaTitan(params);
}
