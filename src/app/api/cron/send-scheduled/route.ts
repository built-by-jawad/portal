import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDue } from "@/lib/scheduling";
import { performSend } from "@/lib/sendEngine";

export const maxDuration = 60;

// Runs on Vercel Cron (see vercel.json) and fires any email step whose scheduled date/time (in its
// own timezone) has arrived. Mirrors the same pipeline-condition and due-date checks the Dashboard's
// "Next up to send" queue uses, so what's queued there is exactly what this will eventually send.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const candidates = await prisma.emailStepRecord.findMany({
    where: {
      sentAt: null,
      scheduledDate: { not: null },
      lead: { status: { notIn: ["BOOKED", "DEAD"] } },
    },
    include: { lead: { select: { id: true, status: true, email: true } } },
    orderBy: [{ leadId: "asc" }, { order: "asc" }],
  });

  const due = candidates.filter((r) =>
    isDue(r.scheduledDate, r.scheduledTime, r.scheduledTimezone, now)
  );

  if (due.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, skipped: 0 });
  }

  const previousByLeadOrder = new Map(
    (
      await prisma.emailStepRecord.findMany({
        where: { leadId: { in: [...new Set(due.map((r) => r.leadId))] } },
        select: { leadId: true, order: true, repliedAt: true },
      })
    ).map((r) => [`${r.leadId}:${r.order}`, r.repliedAt])
  );

  const results = { sent: 0, failed: 0, skipped: 0, errors: [] as string[] };

  for (const record of due) {
    if (!record.lead.email) {
      results.skipped++;
      continue;
    }

    if (record.condition !== "ALWAYS") {
      const prevReplied = previousByLeadOrder.get(`${record.leadId}:${record.order - 1}`);
      const eligible =
        record.condition === "IF_REPLIED" ? !!prevReplied : record.condition === "IF_NOT_REPLIED" ? !prevReplied : true;
      if (!eligible) {
        results.skipped++;
        continue;
      }
    }

    try {
      await performSend(record.leadId, record.id);
      results.sent++;
    } catch (err) {
      results.failed++;
      results.errors.push(`${record.leadId}/${record.id}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  return NextResponse.json(results);
}
