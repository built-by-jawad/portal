import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { LEAD_STATUS_LABELS, LEAD_STATUSES, TRADE_LABELS, type Trade } from "@/lib/constants";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status && (LEAD_STATUSES as readonly string[]).includes(status) ? status : undefined;

  const leads = await prisma.lead.findMany({
    where: filter ? { status: filter } : undefined,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Leads"
        description={`${leads.length} lead${leads.length === 1 ? "" : "s"}${filter ? ` · ${LEAD_STATUS_LABELS[filter as keyof typeof LEAD_STATUS_LABELS]}` : ""}`}
        action={
          <Link
            href="/leads/new"
            className="inline-flex items-center justify-center rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
          >
            + Add Lead
          </Link>
        }
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
        {LEAD_STATUSES.map((s) => (
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
        <div className="overflow-hidden rounded-xl border border-mist/30 bg-white/60 shadow-sm">
          <ul className="divide-y divide-mist/20">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex flex-col gap-2 px-4 py-4 transition hover:bg-paper sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{lead.businessName}</p>
                    <p className="truncate text-xs text-slate">
                      {TRADE_LABELS[(lead.trade as Trade) ?? "OTHER"]}
                      {lead.city ? ` · ${lead.city}${lead.state ? `, ${lead.state}` : ""}` : ""}
                      {lead.contactName ? ` · ${lead.contactName}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={lead.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
