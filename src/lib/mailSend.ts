import nodemailer from "nodemailer";

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

function transporterFor(email: string) {
  return nodemailer.createTransport({
    host: "smtp.titan.email",
    port: 465,
    secure: true,
    auth: { user: email, pass: getMailboxPassword(email) },
  });
}

export async function sendThreadedEmail(params: {
  fromEmail: string;
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string | null;
  attachments?: { filename: string; url: string }[];
}) {
  const transporter = transporterFor(params.fromEmail);

  const inReplyTo = params.inReplyTo
    ? params.inReplyTo.startsWith("<")
      ? params.inReplyTo
      : `<${params.inReplyTo}>`
    : undefined;

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
