import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import LeadsList from "@/components/LeadsList";
import { LEAD_STATUS_LABELS, LEAD_STATUSES } from "@/lib/constants";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const leadStatuses = LEAD_STATUSES.filter((s) => s !== "BOOKED");
  const filter = status && (leadStatuses as readonly string[]).includes(status) ? status : undefined;

  const leads = await prisma.lead.findMany({
    where: filter ? { status: filter } : { status: { not: "BOOKED" } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Leads"
        description={`${leads.length} lead${leads.length === 1 ? "" : "s"}${filter ? ` · ${LEAD_STATUS_LABELS[filter as keyof typeof LEAD_STATUS_LABELS]}` : ""}`}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/leads"
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            !filter ? "bg-ink text-paper" : "bg-white/60 text-slate hover:bg-mist/20"
          }`}
        >
          All
        </Link>
        {leadStatuses.map((s) => (
          <Link
            key={s}
            href={`/leads?status=${s}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === s ? "bg-ink text-paper" : "bg-white/60 text-slate hover:bg-mist/20"
            }`}
          >
            {LEAD_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-10 text-center text-sm text-slate">
          No leads yet.{" "}
          <Link href="/leads/new" className="font-semibold text-green hover:underline">
            Add your first one
          </Link>
          .
        </div>
      ) : (
        <LeadsList leads={leads} />
      )}
    </div>
  );
}
