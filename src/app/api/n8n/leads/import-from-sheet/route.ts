import { NextRequest, NextResponse } from "next/server";
import { checkN8nAuth } from "@/lib/n8n";
import { importLeadFromSheet } from "@/lib/actions";

// Called from the n8n workflow that watches the "Portal Data Paste" Google Sheet tab for newly
// appended rows. One row in, at most one new Lead out (business-info fields only — email subject
// and body are never set here, those are always written by hand in the portal).
export async function POST(request: NextRequest) {
  const authError = checkN8nAuth(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));

  if (!body?.businessName || typeof body.businessName !== "string") {
    return NextResponse.json({ error: "businessName is required" }, { status: 400 });
  }

  try {
    const result = await importLeadFromSheet(body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Import failed" }, { status: 400 });
  }
}
