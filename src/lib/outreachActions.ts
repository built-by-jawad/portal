"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { todayInTimeZone } from "@/lib/scheduling";
import {
  CHANNELS,
  CLOSED_STATUSES,
  LEGACY_STATUS,
  STOPPING_STATUSES,
  isOutreachStatus,
  nextActionDate,
  stepAt,
  type OutreachStatus,
} from "@/lib/outreach";
import { loadCadence, type CadenceMap } from "@/lib/outreachData";

const today = () => todayInTimeZone("Asia/Karachi");

function refresh() {
  revalidatePath("/leads");
  revalidatePath("/leads/[id]", "page");
  revalidatePath("/clients");
  revalidatePath("/clients/[id]", "page");
  revalidatePath("/outreach");
  revalidatePath("/");
}

type Seq = { channel: string; startDate: string; stepIndex: number; done: boolean };

// Next action date, or null when the sequence is stopped (finished, or the lead replied,
// booked, said no, or is a bad fit).
function computeNext(seq: Seq, status: string, sequenceDone: boolean, cadence: CadenceMap): string | null {
  if (seq.done || sequenceDone) return null;
  if (STOPPING_STATUSES.includes(status as OutreachStatus)) return null;
  const c = cadence[seq.channel];
  if (!c || c.steps.length === 0) return null;
  return nextActionDate(seq.startDate, c.steps, c.repeatEvery, seq.stepIndex);
}

async function recomputeLead(leadId: string, cadence?: CadenceMap) {
  const cad = cadence ?? (await loadCadence());
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { outreachStatus: true, sequenceDone: true, sequences: true },
  });
  if (!lead) return;
  for (const seq of lead.sequences) {
    const next = computeNext(seq, lead.outreachStatus, lead.sequenceDone, cad);
    if (next !== seq.nextActionDate) {
      await prisma.outreachSequence.update({ where: { id: seq.id }, data: { nextActionDate: next } });
    }
  }
}

export async function setOutreachStatus(leadId: string, status: string, stopReason?: string) {
  if (!isOutreachStatus(status)) throw new Error("Unknown status");
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  const now = new Date();
  const closed = CLOSED_STATUSES.includes(status);

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      outreachStatus: status,
      status: LEGACY_STATUS[status],
      sequenceDone: closed,
      stopReason: closed ? (stopReason ?? lead.stopReason) : null,
      contactedAt: status !== "NEW" ? (lead.contactedAt ?? now) : lead.contactedAt,
      repliedAt: ["REPLIED", "CALL_BOOKED", "TEARDOWN_SENT", "WON"].includes(status) ? (lead.repliedAt ?? now) : lead.repliedAt,
      callBookedAt: status === "CALL_BOOKED" ? (lead.callBookedAt ?? now) : lead.callBookedAt,
      teardownSentAt: status === "TEARDOWN_SENT" ? (lead.teardownSentAt ?? now) : lead.teardownSentAt,
      wonAt: status === "WON" ? (lead.wonAt ?? now) : lead.wonAt,
    },
  });
  if (closed) {
    await prisma.outreachSequence.updateMany({ where: { leadId }, data: { done: true } });
  } else if (lead.sequenceDone) {
    await prisma.outreachSequence.updateMany({ where: { leadId, decision: { not: "NO" } }, data: { done: false } });
  }
  await recomputeLead(leadId);
  refresh();
}

export async function setStopReason(leadId: string, reason: string) {
  await prisma.lead.update({ where: { id: leadId }, data: { stopReason: reason.trim() || null } });
  refresh();
}

// Makes the lead's sequence rows match the ticked channels. New channels start today.
export async function syncChannels(leadId: string, channels: string[]) {
  const wanted = channels.filter((c) => (CHANNELS as readonly string[]).includes(c));
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId }, select: { sequences: true } });
  const cadence = await loadCadence();

  await prisma.lead.update({ where: { id: leadId }, data: { channels: wanted } });
  await prisma.outreachSequence.deleteMany({ where: { leadId, channel: { notIn: wanted } } });

  const existing = new Set(lead.sequences.map((s) => s.channel));
  for (const channel of wanted.filter((c) => !existing.has(c))) {
    await prisma.outreachSequence.create({ data: { leadId, channel, startDate: today() } });
  }
  await recomputeLead(leadId, cadence);
  refresh();
}

export async function completeStep(seqId: string) {
  const seq = await prisma.outreachSequence.findUniqueOrThrow({ where: { id: seqId }, include: { lead: true } });
  const cadence = await loadCadence();
  const c = cadence[seq.channel];
  const current = stepAt(c.steps, c.repeatEvery, seq.stepIndex);
  if (current.isDecision && seq.decision !== "YES") {
    throw new Error("Pick Yes or No on the interest check first");
  }
  const next = { ...seq, stepIndex: seq.stepIndex + 1 };
  await prisma.outreachSequence.update({
    where: { id: seqId },
    data: {
      stepIndex: next.stepIndex,
      lastTouchDate: today(),
      nextActionDate: computeNext(next, seq.lead.outreachStatus, seq.lead.sequenceDone, cadence),
    },
  });
  if (seq.lead.outreachStatus === "NEW") {
    await prisma.lead.update({
      where: { id: seq.leadId },
      data: { outreachStatus: "IN_SEQUENCE", status: LEGACY_STATUS.IN_SEQUENCE, contactedAt: seq.lead.contactedAt ?? new Date() },
    });
  } else if (!seq.lead.contactedAt) {
    await prisma.lead.update({ where: { id: seq.leadId }, data: { contactedAt: new Date() } });
  }
  refresh();
}

// They replied on this channel: records it for the per-channel reply rate and stops the sequences.
export async function markSequenceReplied(seqId: string) {
  const seq = await prisma.outreachSequence.findUniqueOrThrow({ where: { id: seqId }, include: { lead: true } });
  await prisma.outreachSequence.update({ where: { id: seqId }, data: { repliedAt: seq.repliedAt ?? new Date() } });
  if (["NEW", "IN_SEQUENCE"].includes(seq.lead.outreachStatus)) {
    await setOutreachStatus(seq.leadId, "REPLIED");
  } else {
    refresh();
  }
}

// The yes/no on the interest check step. No ends the sequence for good.
export async function setDecision(seqId: string, decision: string) {
  const seq = await prisma.outreachSequence.findUniqueOrThrow({ where: { id: seqId } });
  const value = decision === "YES" || decision === "NO" ? decision : null;
  await prisma.outreachSequence.update({
    where: { id: seqId },
    data: { decision: value, done: value === "NO", nextActionDate: value === "NO" ? null : seq.nextActionDate },
  });
  if (value !== "NO") await recomputeLead(seq.leadId);
  refresh();
}

export async function updateSequenceFields(seqId: string, fields: { startDate?: string; notes?: string; lastTouchDate?: string }) {
  const data: { startDate?: string; notes?: string | null; lastTouchDate?: string | null } = {};
  if (fields.startDate && /^\d{4}-\d{2}-\d{2}$/.test(fields.startDate)) data.startDate = fields.startDate;
  if (fields.notes !== undefined) data.notes = fields.notes.trim() || null;
  if (fields.lastTouchDate !== undefined) data.lastTouchDate = fields.lastTouchDate || null;
  const seq = await prisma.outreachSequence.update({ where: { id: seqId }, data });
  await recomputeLead(seq.leadId);
  refresh();
}

export async function replaceCadence(
  channel: string,
  repeatEvery: number,
  steps: { day: number; label: string; isDecision: boolean }[]
) {
  if (!(CHANNELS as readonly string[]).includes(channel)) throw new Error("Unknown channel");
  const clean = steps
    .filter((s) => Number.isFinite(s.day) && s.day >= 1)
    .sort((a, b) => a.day - b.day)
    .map((s, position) => ({
      channel,
      position,
      day: Math.round(s.day),
      label: s.label.trim() || `Day ${Math.round(s.day)}`,
      isDecision: s.isDecision,
    }));
  if (clean.length === 0) throw new Error("Add at least one step");
  const repeat = Math.max(1, Math.round(repeatEvery) || 30);
  await prisma.$transaction([
    prisma.cadenceStep.deleteMany({ where: { channel } }),
    prisma.cadenceStep.createMany({ data: clean }),
    prisma.cadenceSetting.upsert({ where: { channel }, update: { repeatEvery: repeat }, create: { channel, repeatEvery: repeat } }),
  ]);
  const seqs = await prisma.outreachSequence.findMany({ where: { channel }, select: { leadId: true } });
  const cadence = await loadCadence();
  for (const leadId of new Set(seqs.map((s) => s.leadId))) await recomputeLead(leadId, cadence);
  refresh();
}
