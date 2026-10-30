import Link from "next/link";

type EngagementLead = {
  id: string;
  businessName: string;
  instagram: string | null;
  secondaryInstagrams: string[];
};

export default function EngagementGrid({
  leads,
  canOpenDetail = false,
}: {
  leads: EngagementLead[];
  canOpenDetail?: boolean;
}) {
  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
        No leads added to Engagement yet. Select leads on the Leads page and click "Add to Engagement".
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {leads.map((lead) => {
        const name = canOpenDetail ? (
          <Link href={`/leads/${lead.id}`} className="mb-2 block truncate font-semibold text-ink hover:underline">
            {lead.businessName}
          </Link>
        ) : (
          <p className="mb-2 truncate font-semibold text-ink">{lead.businessName}</p>
        );

        const allInstagrams = [lead.instagram, ...lead.secondaryInstagrams].filter(
          (v): v is string => Boolean(v)
        );

        return (
          <div key={lead.id} className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm">
            {name}
            {allInstagrams.length > 0 ? (
              <div className="flex flex-col gap-1">
                {allInstagrams.map((link, i) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-green hover:underline"
                  >
                    Instagram {allInstagrams.length > 1 ? i + 1 : ""} →
                  </a>
                ))}
              </div>
            ) : (
              <span className="text-sm text-slate">No Instagram link</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
