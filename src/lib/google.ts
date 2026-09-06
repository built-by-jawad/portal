import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

function redirectUri() {
  return `${process.env.APP_URL}/api/google/callback`;
}

function newOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri()
  );
}

export function getGoogleAuthUrl() {
  const client = newOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

// Exchanges an OAuth code for tokens and upserts an EmailAccount row for whichever Google
// account just authorized — this is how multiple Gmail accounts get connected, one per
// /api/google/connect round trip. The first account connected is made the default automatically.
export async function exchangeCodeForTokens(code: string) {
  const client = newOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data: profile } = await oauth2.userinfo.get();
  if (!profile.email) throw new Error("Google did not return an email address");

  const existingCount = await prisma.emailAccount.count();

  await prisma.emailAccount.upsert({
    where: { email: profile.email },
    update: {
      accessToken: tokens.access_token ?? undefined,
      refreshToken: tokens.refresh_token ?? undefined,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      scope: tokens.scope ?? undefined,
    },
    create: {
      email: profile.email,
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token ?? "",
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope ?? null,
      isDefault: existingCount === 0,
    },
  });

  return profile.email;
}

export type ConnectedAccount = { id: string; email: string; isDefault: boolean };

export async function listEmailAccounts(): Promise<ConnectedAccount[]> {
  const rows = await prisma.emailAccount.findMany({
    where: { refreshToken: { not: "" } },
    orderBy: [{ isDefault: "desc" }, { email: "asc" }],
  });
  return rows.map((r) => ({ id: r.id, email: r.email, isDefault: r.isDefault }));
}

export async function isGoogleConnected() {
  const count = await prisma.emailAccount.count({ where: { refreshToken: { not: "" } } });
  return count > 0;
}

export async function getDefaultAccountId() {
  const row = await prisma.emailAccount.findFirst({
    where: { refreshToken: { not: "" } },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return row?.id ?? null;
}

export async function setDefaultAccount(accountId: string) {
  await prisma.$transaction([
    prisma.emailAccount.updateMany({ data: { isDefault: false }, where: {} }),
    prisma.emailAccount.update({ where: { id: accountId }, data: { isDefault: true } }),
  ]);
}

export async function disconnectAccount(accountId: string) {
  await prisma.emailAccount.delete({ where: { id: accountId } });
}

async function getAuthorizedClient(accountId: string) {
  const row = await prisma.emailAccount.findUnique({ where: { id: accountId } });
  if (!row?.refreshToken) throw new Error("This Gmail account is not connected");

  const client = newOAuthClient();
  client.setCredentials({
    access_token: row.accessToken ?? undefined,
    refresh_token: row.refreshToken,
    expiry_date: row.expiryDate?.getTime(),
  });

  client.on("tokens", (tokens) => {
    prisma.emailAccount
      .update({
        where: { id: accountId },
        data: {
          accessToken: tokens.access_token ?? undefined,
          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          refreshToken: tokens.refresh_token ?? undefined,
        },
      })
      .catch(() => {});
  });

  return client;
}

function base64url(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input, "utf-8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const URL_PATTERN = /https?:\/\/[^\s<]+[^\s<.,;:!?)]/g;

// Converts plain-text body into HTML, auto-linkifying bare URLs and routing each one through the
// click-tracking redirect (see /api/click/[id]) when a recordId is given.
function textToHtml(body: string, clickTrackingBaseUrl?: string) {
  const escaped = escapeHtml(body);
  const linked = escaped.replace(URL_PATTERN, (url) => {
    const href = clickTrackingBaseUrl
      ? `${clickTrackingBaseUrl}${clickTrackingBaseUrl.includes("?") ? "&" : "?"}u=${encodeURIComponent(url)}`
      : url;
    return `<a href="${href}">${url}</a>`;
  });
  return linked.replace(/\n/g, "<br>\n");
}

export type EmailAttachment = { filename: string; url: string; contentType: string };

export async function sendGmail(opts: {
  accountId: string;
  to: string;
  subject: string;
  bodyText: string;
  trackingPixelUrl?: string;
  clickTrackingBaseUrl?: string;
  threadId?: string;
  inReplyToMessageId?: string;
  attachments?: EmailAttachment[];
}) {
  const client = await getAuthorizedClient(opts.accountId);
  const gmail = google.gmail({ version: "v1", auth: client });

  const html =
    textToHtml(opts.bodyText, opts.clickTrackingBaseUrl) +
    (opts.trackingPixelUrl
      ? `\n<img src="${opts.trackingPixelUrl}" width="1" height="1" style="display:none" alt="">`
      : "");

  const commonHeaders = [`To: ${opts.to}`, `Subject: ${opts.subject}`, "MIME-Version: 1.0"];
  if (opts.inReplyToMessageId) {
    commonHeaders.push(`In-Reply-To: <${opts.inReplyToMessageId}>`);
    commonHeaders.push(`References: <${opts.inReplyToMessageId}>`);
  }

  let raw: string;

  if (opts.attachments && opts.attachments.length > 0) {
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const parts: string[] = [
      `Content-Type: text/html; charset=UTF-8`,
      `MIME-Version: 1.0`,
      ``,
      html,
    ];

    const attachmentBuffers = await Promise.all(
      opts.attachments.map(async (a) => {
        const res = await fetch(a.url);
        const buf = Buffer.from(await res.arrayBuffer());
        return { ...a, buf };
      })
    );

    const bodyParts = [
      `--${boundary}`,
      ...parts,
      ...attachmentBuffers.flatMap((a) => [
        `--${boundary}`,
        `Content-Type: ${a.contentType}; name="${a.filename}"`,
        `Content-Disposition: attachment; filename="${a.filename}"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        a.buf.toString("base64"),
      ]),
      `--${boundary}--`,
    ].join("\r\n");

    raw = base64url(
      `${[...commonHeaders, `Content-Type: multipart/mixed; boundary="${boundary}"`].join(
        "\r\n"
      )}\r\n\r\n${bodyParts}`
    );
  } else {
    raw = base64url(
      `${[...commonHeaders, "Content-Type: text/html; charset=UTF-8"].join("\r\n")}\r\n\r\n${html}`
    );
  }

  const { data } = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
      threadId: opts.threadId,
    },
  });

  return { messageId: data.id ?? null, threadId: data.threadId ?? null };
}

export type InboxMessage = {
  id: string;
  threadId: string;
  from: string;
  snippet: string;
  date: string;
  subject: string;
};

export async function listMessagesForAddress(
  accountId: string,
  address: string
): Promise<InboxMessage[]> {
  const client = await getAuthorizedClient(accountId);
  const gmail = google.gmail({ version: "v1", auth: client });

  const { data } = await gmail.users.messages.list({
    userId: "me",
    q: `to:${address} OR from:${address}`,
    maxResults: 20,
  });

  const messages = data.messages ?? [];
  const details = await Promise.all(
    messages.map(async (m) => {
      const { data: full } = await gmail.users.messages.get({
        userId: "me",
        id: m.id!,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      });
      const headers = full.payload?.headers ?? [];
      const get = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
      return {
        id: full.id!,
        threadId: full.threadId!,
        from: get("From"),
        subject: get("Subject"),
        date: get("Date"),
        snippet: full.snippet ?? "",
      };
    })
  );

  return details.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Fetches the full message list for a thread (used to detect whether the lead has replied), scoped
// to the account that owns the thread.
export async function threadHasReplyFrom(
  accountId: string,
  threadId: string,
  leadEmail: string,
  after: Date
): Promise<boolean> {
  const client = await getAuthorizedClient(accountId);
  const gmail = google.gmail({ version: "v1", auth: client });

  const { data } = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "metadata",
    metadataHeaders: ["From", "Date"],
  });

  const messages = data.messages ?? [];
  return messages.some((m) => {
    const headers = m.payload?.headers ?? [];
    const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value ?? "";
    const internalDate = m.internalDate ? new Date(Number(m.internalDate)) : null;
    return (
      from.toLowerCase().includes(leadEmail.toLowerCase()) &&
      internalDate !== null &&
      internalDate.getTime() > after.getTime()
    );
  });
}
