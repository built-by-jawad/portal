import { NextRequest, NextResponse } from "next/server";
import { checkN8nAuth } from "@/lib/n8n";
import { sendEmailStepById } from "@/lib/sendEmailStep";

// Called by n8n right after due-email claims a step. The portal does the actual SMTP/Gmail send
// here (via mailSend.ts, not n8n's Send Email node) so it can set real In-Reply-To/References
// headers on follow-ups, threading them under the initial email instead of just matching subject.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = checkN8nAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const result = await sendEmailStepById(id);
  if (!result.ok && result.error === "Not found") {
    return NextResponse.json(result, { status: 404 });
  }
  if (!result.ok && (result.error === "Lead has no mailbox assigned" || result.error === "Lead has no email address")) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
