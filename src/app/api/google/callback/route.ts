import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=missing_code", process.env.APP_URL));
  }

  try {
    await exchangeCodeForTokens(code);
    return NextResponse.redirect(new URL("/settings?connected=1", process.env.APP_URL));
  } catch (err) {
    console.error("Google OAuth callback failed", err);
    return NextResponse.redirect(new URL("/settings?error=oauth_failed", process.env.APP_URL));
  }
}
