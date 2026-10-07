import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import type { PageKey } from "@/lib/permissions";

export type CurrentProfile = {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  role: string;
  isAdmin: boolean;
  permissions: Map<PageKey, { canView: boolean; canEdit: boolean }>;
};

// Reads the session cookie and loads the profile + permissions. Returns null if there's no
// valid session or the profile was deleted. Call once per request (page/layout); cheap enough
// not to bother caching further.
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: session.profileId },
    include: { permissions: true },
  });
  if (!profile) return null;

  const permissions = new Map<PageKey, { canView: boolean; canEdit: boolean }>();
  for (const p of profile.permissions) {
    permissions.set(p.page as PageKey, { canView: p.canView, canEdit: p.canEdit });
  }

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    imageUrl: profile.imageUrl,
    role: profile.role,
    isAdmin: profile.role === "ADMIN",
    permissions,
  };
}

export function canView(profile: CurrentProfile, page: PageKey): boolean {
  if (profile.isAdmin) return true;
  return profile.permissions.get(page)?.canView ?? false;
}

export function canEdit(profile: CurrentProfile, page: PageKey): boolean {
  if (profile.isAdmin) return true;
  return profile.permissions.get(page)?.canEdit ?? false;
}
