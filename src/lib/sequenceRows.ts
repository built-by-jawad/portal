import { prisma } from "@/lib/prisma";
import { CHANNEL_LABELS, stepAt, type Channel } from "@/lib/outreach";
import { loadCadence } from "@/lib/outreachData";
import type { SeqRow } from "@/components/SequenceTable";

export async function loadSequenceRows(onlyDueBy?: string): Promise<SeqRow[]> {
  const [cadence, seqs] = await Promise.all([
    loadCadence(),
    prisma.outreachSequence.findMany({
      where: onlyDueBy ? { done: false, nextActionDate: { not: null, lte: onlyDueBy } } : {},
      include: { lead: { select: { businessName: true, outreachStatus: true } } },
      orderBy: [{ nextActionDate: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  return seqs.map((s) => {
    const c = cadence[s.channel];
    const step = c && c.steps.length ? stepAt(c.steps, c.repeatEvery, s.stepIndex) : { label: "-", isDecision: false };
    return {
      id: s.id,
      leadId: s.leadId,
      business: s.lead.businessName,
      channel: CHANNEL_LABELS[s.channel as Channel] ?? s.channel,
      startDate: s.startDate,
      stepLabel: step.label,
      isDecision: step.isDecision,
      decision: s.decision,
      nextActionDate: s.nextActionDate,
      lastTouchDate: s.lastTouchDate,
      notes: s.notes,
      done: s.done,
      replied: !!s.repliedAt,
      status: s.lead.outreachStatus,
    };
  });
}
