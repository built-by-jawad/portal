import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.metadata",
  "https://www.googleapis.com/auth/userinfo.email",
];

function redirectUri() {
  return `${process.env.APP_URL}/api/google/callback`;
}

function newOAuthClient() {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri());
}

export function getGoogleAuthUrl() {
  const client = newOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

// Exchanges the OAuth code for tokens and upserts a Mailbox row (provider "GMAIL") for the
// connected address, so it shows up alongside the Titan mailboxes everywhere a Mailbox is used.
export async function exchangeCodeForTokens(code: string) {
  const client = newOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data: profile } = await oauth2.userinfo.get();
  const email = profile.email;
  if (!email) throw new Error("Google did not return an email address");

  await prisma.mailbox.upsert({
    where: { email },
    update: {
      provider: "GMAIL",
      refreshToken: tokens.refresh_token ?? undefined,
      accessToken: tokens.access_token ?? undefined,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      isActive: true,
    },
    create: {
      label: email,
      email,
      provider: "GMAIL",
      refreshToken: tokens.refresh_token ?? null,
      accessToken: tokens.access_token ?? null,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  });

  return email;
}

// Returns a ready-to-use OAuth2 client for this Gmail mailbox, refreshing the access token first
// if it's missing or expired. Used by mailSend.ts to send via the Gmail API.
export async function getGmailClient(mailboxEmail: string) {
  const mailbox = await prisma.mailbox.findUnique({ where: { email: mailboxEmail } });
  if (!mailbox || mailbox.provider !== "GMAIL" || !mailbox.refreshToken) {
    throw new Error(`${mailboxEmail} is not a connected Gmail mailbox`);
  }

  const client = newOAuthClient();
  client.setCredentials({
    refresh_token: mailbox.refreshToken,
    access_token: mailbox.accessToken ?? undefined,
    expiry_date: mailbox.tokenExpiry?.getTime(),
  });

  const needsRefresh = !mailbox.accessToken || !mailbox.tokenExpiry || mailbox.tokenExpiry.getTime() < Date.now() + 60_000;
  if (needsRefresh) {
    const { credentials } = await client.refreshAccessToken();
    client.setCredentials(credentials);
    await prisma.mailbox.update({
      where: { id: mailbox.id },
      data: {
        accessToken: credentials.access_token ?? undefined,
        tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
      },
    });
  }

  return google.gmail({ version: "v1", auth: client });
}
