import { NextRequest, NextResponse } from "next/server";

// Shared secret check for the /api/n8n/* routes. n8n sends this back on every request in the
// x-api-key header (set N8N_API_KEY the same in both the portal's env and the n8n workflow) so a
// stranger who finds the URL can't queue or mark sends on your behalf.
export function checkN8nAuth(request: NextRequest): NextResponse | null {
  const key = request.headers.get("x-api-key");
  if (!process.env.N8N_API_KEY || key !== process.env.N8N_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
