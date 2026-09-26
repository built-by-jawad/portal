import { prisma } from "@/lib/prisma";
import { CHANNELS, CHANNEL_LABELS } from "@/lib/outreach";

export default async function OutreachFunnel() {
  const [added, contacted, replied, calls, teardowns, won, started, repliedSeqs] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { contactedAt: { not: null } } }),
    prisma.lead.count({ where: { repliedAt: { not: null } } }),
    prisma.lead.count({ where: { callBookedAt: { not: null } } }),
    prisma.lead.count({ where: { teardownSentAt: { not: null } } }),
    prisma.lead.count({ where: { wonAt: { not: null } } }),
    prisma.outreachSequence.groupBy({ by: ["channel"], where: { stepIndex: { gt: 0 } }, _count: true }),
    prisma.outreachSequence.groupBy({ by: ["channel"], where: { repliedAt: { not: null } }, _count: true }),
  ]);
  const stats = [
    ["Leads added", added],
    ["Contacted", contacted],
    ["Replied", replied],
    ["Calls booked", calls],
    ["Teardowns sent", teardowns],
    ["Won", won],
  ] as const;

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-xl border border-mist/30 bg-white p-4">
            <div className="text-2xl font-bold text-ink">{n}</div>
            <div className="text-xs text-slate">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {CHANNELS.map((ch) => {
          const sent = started.find((s) => s.channel === ch)?._count ?? 0;
          const rep = repliedSeqs.find((s) => s.channel === ch)?._count ?? 0;
          return (
            <div key={ch} className="rounded-xl border border-mist/30 bg-white p-4">
              <div className="text-2xl font-bold text-ink">{sent ? Math.round((rep / sent) * 100) : 0}%</div>
              <div className="text-xs text-slate">
                {CHANNEL_LABELS[ch]} reply rate ({rep}/{sent})
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
