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

export async function exchangeCodeForTokens(code: string) {
  const client = newOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data: profile } = await oauth2.userinfo.get();

  await prisma.googleAuth.upsert({
    where: { id: "singleton" },
    update: {
      email: profile.email ?? undefined,
      accessToken: tokens.access_token ?? undefined,
      refreshToken: tokens.refresh_token ?? undefined,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      scope: tokens.scope ?? undefined,
    },
    create: {
      id: "singleton",
      email: profile.email ?? null,
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token ?? "",
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope ?? null,
    },
  });

  return profile.email;
}

export async function isGoogleConnected() {
  const row = await prisma.googleAuth.findUnique({ where: { id: "singleton" } });
  return !!row?.refreshToken;
}

export async function getConnectedEmail() {
  const row = await prisma.googleAuth.findUnique({ where: { id: "singleton" } });
  return row?.email ?? null;
}

export async function disconnectGoogle() {
  await prisma.googleAuth.deleteMany({ where: { id: "singleton" } });
}

async function getAuthorizedClient() {
  const row = await prisma.googleAuth.findUnique({ where: { id: "singleton" } });
  if (!row?.refreshToken) throw new Error("Gmail is not connected");

  const client = newOAuthClient();
  client.setCredentials({
    access_token: row.accessToken ?? undefined,
    refresh_token: row.refreshToken,
    expiry_date: row.expiryDate?.getTime(),
  });

  client.on("tokens", (tokens) => {
    prisma.googleAuth
      .update({
        where: { id: "singleton" },
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

function base64url(input: string) {
  return Buffer.from(input, "utf-8")
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

function textToHtml(body: string) {
  return escapeHtml(body).replace(/\n/g, "<br>\n");
}

export async function sendGmail(opts: {
  to: string;
  subject: string;
  bodyText: string;
  trackingPixelUrl?: string;
  threadId?: string;
  inReplyToMessageId?: string;
}) {
  const client = await getAuthorizedClient();
  const gmail = google.gmail({ version: "v1", auth: client });

  const html =
    textToHtml(opts.bodyText) +
    (opts.trackingPixelUrl
      ? `\n<img src="${opts.trackingPixelUrl}" width="1" height="1" style="display:none" alt="">`
      : "");

  const headers = [
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    "Content-Type: text/html; charset=UTF-8",
    "MIME-Version: 1.0",
  ];
  if (opts.inReplyToMessageId) {
    headers.push(`In-Reply-To: <${opts.inReplyToMessageId}>`);
    headers.push(`References: <${opts.inReplyToMessageId}>`);
  }

  const raw = base64url(`${headers.join("\r\n")}\r\n\r\n${html}`);

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

export async function listMessagesForAddress(address: string): Promise<InboxMessage[]> {
  const client = await getAuthorizedClient();
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
