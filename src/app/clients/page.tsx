import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import { TRADE_LABELS, type Trade } from "@/lib/constants";

export const dynamic = "force-dynamic";

// A "client" is a lead that's actually booked — this page is a details-first view of the same
// Lead records shown on /leads, filtered to status BOOKED. No separate schema; click through to
// /leads/[id] for the full editable business-details form.
export default async function ClientsPage() {
  const clients = await prisma.lead.findMany({
    where: { status: "BOOKED" },
    orderBy: { businessName: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Clients"
        description={`${clients.length} client${clients.length === 1 ? "" : "s"} — booked leads.`}
      />

      {clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-10 text-center text-sm text-slate">
          No clients yet. A lead becomes a client once its status is set to Booked.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/leads/${client.id}`}
              className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm transition hover:border-green/50 hover:shadow-md sm:p-6"
            >
              <p className="font-display font-bold text-ink">{client.businessName}</p>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-green">
                {TRADE_LABELS[(client.trade as Trade) ?? "OTHER"]}
              </p>
              <dl className="space-y-1 text-sm text-slate">
                {client.contactName && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-xs uppercase text-slate/70">Contact</dt>
                    <dd className="text-ink">{client.contactName}</dd>
                  </div>
                )}
                {client.email && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-xs uppercase text-slate/70">Email</dt>
                    <dd className="truncate text-ink">{client.email}</dd>
                  </div>
                )}
                {client.phone && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-xs uppercase text-slate/70">Phone</dt>
                    <dd className="text-ink">{client.phone}</dd>
                  </div>
                )}
                {client.website && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-xs uppercase text-slate/70">Web</dt>
                    <dd className="truncate text-ink">{client.website}</dd>
                  </div>
                )}
                {client.address && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-xs uppercase text-slate/70">Address</dt>
                    <dd className="text-ink">{client.address}</dd>
                  </div>
                )}
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
