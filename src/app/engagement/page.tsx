import PageHeader from "@/components/PageHeader";
import EngagementGrid from "@/components/EngagementGrid";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EngagementPage() {
  const leads = await prisma.lead.findMany({
    where: { isEngaged: true },
    select: { id: true, businessName: true, instagram: true },
    orderBy: { businessName: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Engagement" description="Leads selected for engagement, with their Instagram link." />
      <EngagementGrid leads={leads} />
    </div>
  );
}
