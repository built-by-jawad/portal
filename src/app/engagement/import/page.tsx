import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import ImportEngagementButton from "@/components/ImportEngagementButton";
import { prisma } from "@/lib/prisma";
import { SOCIAL_PLATFORM_LABELS, type SocialPlatform } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ImportEngagementPage() {
  const leads = await prisma.lead.findMany({
    where: { channels: { hasSome: ["INSTAGRAM", "FACEBOOK", "LINKEDIN"] } },
    relationLoadStrategy: "join",
    include: { engagementProfiles: { select: { platform: true } } },
    orderBy: { businessName: "asc" },
  });

  const candidates = leads
    .map((lead) => {
      const imported = new Set(lead.engagementProfiles.map((p) => p.platform));
      const urlByPlatform: Partial<Record<SocialPlatform, string | null>> = {
        INSTAGRAM: lead.instagram,
        FACEBOOK: lead.facebook,
        LINKEDIN: lead.linkedin,
      };
      const pending = lead.channels.filter(
        (c) => !imported.has(c) && !!urlByPlatform[c as SocialPlatform]
      );
      return { lead, pending };
    })
    .filter((c) => c.pending.length > 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      <div className="mb-6">
        <Link href="/engagement" className="text-sm font-semibold text-green hover:underline">
          ← Engagement
        </Link>
      </div>

      <PageHeader
        title="Import from outreach"
        description="Leads with an active social channel and a saved profile link, not yet added to Engagement."
      />

      {candidates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-10 text-center text-sm text-slate">
          Nothing to import. Every active channel with a saved profile link is already here.
        </div>
      ) : (
        <div className="space-y-2">
          {candidates.map(({ lead, pending }) => (
            <div
              key={lead.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-mist/30 bg-white/60 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">{lead.businessName}</p>
                <p className="text-xs text-slate">
                  {pending.map((p) => SOCIAL_PLATFORM_LABELS[p as SocialPlatform] ?? p).join(", ")}
                </p>
              </div>
              <ImportEngagementButton leadId={lead.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
