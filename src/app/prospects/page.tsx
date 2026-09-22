import PageHeader from "@/components/PageHeader";
import ProspectsTable from "@/components/ProspectsTable";
import { prisma } from "@/lib/prisma";
import { buildOrderedColumns } from "@/lib/prospectColumns";

export const dynamic = "force-dynamic";

export default async function ProspectsPage() {
  const [prospects, customColumns, boardSettings] = await Promise.all([
    prisma.prospect.findMany({ orderBy: { order: "asc" } }),
    prisma.prospectColumn.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.prospectBoardSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const columns = buildOrderedColumns(customColumns, boardSettings?.columnOrder ?? []);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Prospects"
        description="Raw, unvetted business data — a spreadsheet/database for sourcing, not a lead list."
      />
      <ProspectsTable
        prospects={prospects.map((p) => ({ ...p, customFields: (p.customFields as Record<string, string>) ?? {} }))}
        columns={columns}
      />
    </div>
  );
}
