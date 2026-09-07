import { notFound } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import EngagementChecklist from "@/components/EngagementChecklist";
import { prisma } from "@/lib/prisma";
import { SOCIAL_PLATFORM_LABELS, ENGAGEMENT_DAYS, type SocialPlatform } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function EngagementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { engagementDays: { orderBy: [{ platform: "asc" }, { dayNumber: "asc" }] } },
  });

  if (!lead) notFound();

  const byPlatform = new Map<string, typeof lead.engagementDays>();
  for (const day of lead.engagementDays) {
    const list = byPlatform.get(day.platform) ?? [];
    list.push(day);
    byPlatform.set(day.platform, list);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <div className="mb-6">
        <Link href="/engagement" className="text-sm font-semibold text-green hover:underline">
          ← Engagement
        </Link>
      </div>

      <PageHeader
        title={lead.businessName}
        description={
          lead.socialPlatforms.length > 0
            ? `Active on ${lead.socialPlatforms
                .map((p) => SOCIAL_PLATFORM_LABELS[p as SocialPlatform] ?? p)
                .join(", ")}`
            : "Not marked active on any platform yet"
        }
        action={
          <Link
            href={`/leads/${lead.id}`}
            className="text-sm font-semibold text-green hover:underline"
          >
            View lead →
          </Link>
        }
      />

      {lead.socialPlatforms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
          Check a platform on this lead&apos;s Business details to start a {ENGAGEMENT_DAYS}-day
          engagement checklist.
        </div>
      ) : (
        <div className="space-y-8">
          {lead.socialPlatforms.map((platform) => {
            const days = byPlatform.get(platform) ?? [];
            const done = days.filter((d) => d.completedAt).length;
            return (
              <div key={platform}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-ink">
                    {SOCIAL_PLATFORM_LABELS[platform as SocialPlatform] ?? platform}
                  </h2>
                  <span className="text-xs font-semibold text-slate">
                    {done}/{days.length} days
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border border-mist/30 bg-white/60 shadow-sm">
                  <EngagementChecklist leadId={lead.id} days={days} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
