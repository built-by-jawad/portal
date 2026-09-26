import Link from "next/link";
import { prisma } from "@/lib/prisma";
import LeadsList from "@/components/LeadsList";
import { OUTREACH_STATUS_LABELS, OUTREACH_STATUSES } from "@/lib/outreach";

export default async function LeadsTab({ status }: { status?: string }) {
  const leadStatuses = OUTREACH_STATUSES.filter((s) => s !== "WON");
  const filter = status && (leadStatuses as readonly string[]).includes(status) ? status : undefined;

  const leads = await prisma.lead.findMany({
    where: filter ? { outreachStatus: filter } : { status: { not: "BOOKED" } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <p className="mb-4 text-sm text-slate">{`${leads.length} lead${leads.length === 1 ? "" : "s"}${filter ? ` · ${OUTREACH_STATUS_LABELS[filter as keyof typeof OUTREACH_STATUS_LABELS]}` : ""}`}</p>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/outreach?tab=leads"
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            !filter ? "bg-ink text-paper" : "bg-white/60 text-slate hover:bg-mist/20"
          }`}
        >
          All
        </Link>
        {leadStatuses.map((s) => (
          <Link
            key={s}
            href={`/outreach?tab=leads&status=${s}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === s ? "bg-ink text-paper" : "bg-white/60 text-slate hover:bg-mist/20"
            }`}
          >
            {OUTREACH_STATUS_LABELS[s]}
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
