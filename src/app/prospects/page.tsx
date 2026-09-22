import PageHeader from "@/components/PageHeader";
import ProspectsTable from "@/components/ProspectsTable";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProspectsPage() {
  const prospects = await prisma.prospect.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Prospects"
        description="Raw business data, not leads yet. Import a scrape or add rows by hand, then convert one to a Lead once outreach actually starts."
      />
      <ProspectsTable prospects={prospects} />
    </div>
  );
}
