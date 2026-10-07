import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import ProfileForm from "@/components/ProfileForm";
import DeleteProfileButton from "@/components/DeleteProfileButton";
import { getCurrentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Admin-only page (also enforced by proxy.ts, since non-admins have no "profiles" permission
// row and ProfilePermission rows are never created for ADMIN-page access). Double-checked here
// too since this page issues real account-creation/deletion actions.
export default async function ProfilesPage() {
  const me = await getCurrentProfile();
  if (!me?.isAdmin) redirect("/no-access");

  const profiles = await prisma.profile.findMany({
    include: { permissions: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Profiles" description={`${profiles.length} profile${profiles.length === 1 ? "" : "s"} with portal access.`} />

      <div className="mb-8 rounded-xl border border-mist/30 bg-white/60 p-4 sm:p-6">
        <h2 className="mb-4 font-display font-bold text-ink">Add profile</h2>
        <ProfileForm />
      </div>

      <div className="flex flex-col gap-4">
        {profiles.map((profile) => (
          <div key={profile.id} className="rounded-xl border border-mist/30 bg-white/60 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {profile.imageUrl ? (
                  <img src={profile.imageUrl} alt={profile.name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green/15 text-sm font-semibold text-green">
                    {profile.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-display font-bold text-ink">{profile.name}</p>
                  <p className="text-xs text-slate">
                    {profile.email} · {profile.role === "ADMIN" ? "Admin" : "Member"}
                  </p>
                </div>
              </div>
              {profile.id !== me.id && <DeleteProfileButton profileId={profile.id} />}
            </div>
            <ProfileForm
              existing={{
                id: profile.id,
                name: profile.name,
                email: profile.email,
                role: profile.role,
                permissions: profile.permissions.map((p) => ({ page: p.page, canView: p.canView, canEdit: p.canEdit })),
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
