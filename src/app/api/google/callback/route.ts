import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=missing_code", process.env.APP_URL));
  }

  try {
    await exchangeCodeForTokens(code);
    revalidatePath("/settings");
    return NextResponse.redirect(new URL("/settings?connected=1", process.env.APP_URL));
  } catch (err) {
    console.error("Google OAuth callback failed", err);
    return NextResponse.redirect(new URL("/settings?error=oauth_failed", process.env.APP_URL));
  }
}
