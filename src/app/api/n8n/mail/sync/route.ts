import { NextRequest, NextResponse } from "next/server";
import { checkN8nAuth } from "@/lib/n8n";
import { syncAllActiveMailboxes } from "@/lib/mailSync";

// Polled by a dedicated n8n schedule trigger every couple minutes to pull new IMAP mail (every
// folder, every active Titan mailbox) into the portal's MailMessage table for the /mail page.
export async function POST(request: NextRequest) {
  const authError = checkN8nAuth(request);
  if (authError) return authError;

  const results = await syncAllActiveMailboxes();
  return NextResponse.json({ results });
}
