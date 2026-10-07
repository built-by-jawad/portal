import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

// Plain Route Handler (not a Server Action) so login works before any session exists — a
// Server Action on /login would itself be a POST to /login, which proxy.ts would otherwise
// need to special-case; keeping this as a matcher-excluded /api route avoids that entirely.
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const profile = email ? await prisma.profile.findUnique({ where: { email } }) : null;
  const valid = profile ? await bcrypt.compare(password, profile.passwordHash) : false;

  if (!profile || !valid) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, { status: 303 });
  }

  const token = await signSession({ profileId: profile.id });
  const res = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
