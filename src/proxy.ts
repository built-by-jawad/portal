import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { pageKeyForPathname } from "@/lib/permissions";

// Proxy defaults to the Node.js runtime in Next 16, so Prisma works here directly. Login/logout
// and all /api routes are excluded via the matcher below (they handle their own auth or none).
// Server Functions post back to the page they're called from, so blocking edit here covers them
// too — see the matcher's "Good to know" note in node_modules/next/dist/docs/.../proxy.md.
export default async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    if (request.method !== "GET") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const profile = await prisma.profile.findUnique({
    where: { id: session.profileId },
    include: { permissions: true },
  });

  if (!profile) {
    const res = request.method === "GET"
      ? NextResponse.redirect(new URL("/login", request.url))
      : NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (profile.role === "ADMIN") return NextResponse.next();

  const pageKey = pageKeyForPathname(request.nextUrl.pathname);
  if (!pageKey) return NextResponse.next();

  const permission = profile.permissions.find((p) => p.page === pageKey);

  if (!permission?.canView) {
    if (request.method !== "GET") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/no-access", request.url));
  }

  if (request.method !== "GET" && !permission.canEdit) {
    return NextResponse.json({ error: "View-only access" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|brand).*)"],
};
