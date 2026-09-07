import { prisma } from "@/lib/prisma";
import { emailStepLabel } from "@/lib/constants";
import { scheduledToUtc, todayInTimeZone } from "@/lib/scheduling";

const PAKISTAN_TZ = "Asia/Karachi";

export type ActionItems = {
  dueEmails: { leadId: string; businessName: string; label: string; date: string }[];
  dueEngagement: { leadId: string; businessName: string; platform: string; dayNumber: number; date: string }[];
};

// Everything that's due (today or overdue, in Pakistan time) and still needs a human action:
// an outreach email not yet sent, or an engagement check-in not yet marked done. Used both by the
// Slack digest cron and could back an in-app badge later.
export async function getActionItems(): Promise<ActionItems> {
  const today = todayInTimeZone(PAKISTAN_TZ);

  const [emailCandidates, engagementCandidates] = await Promise.all([
    prisma.emailStepRecord.findMany({
      where: {
        sentAt: null,
        scheduledDate: { not: null },
        lead: { status: { notIn: ["BOOKED", "DEAD"] } },
      },
      include: { lead: { select: { id: true, businessName: true } } },
    }),
    prisma.engagementDay.findMany({
      where: { completedAt: null, date: { lte: today } },
      include: { lead: { select: { id: true, businessName: true } } },
    }),
  ]);

  const dueEmails = emailCandidates
    .map((r) => {
      const instant =
        scheduledToUtc(r.scheduledDate!, r.scheduledTime || "09:00", r.scheduledTimezone || "UTC")?.getTime() ?? 0;
      return { r, date: todayInTimeZone(PAKISTAN_TZ, new Date(instant)) };
    })
    .filter(({ date }) => date <= today)
    .map(({ r, date }) => ({
      leadId: r.leadId,
      businessName: r.lead.businessName,
      label: emailStepLabel(r.order),
      date,
    }));

  const dueEngagement = engagementCandidates.map((d) => ({
    leadId: d.leadId,
    businessName: d.lead.businessName,
    platform: d.platform,
    dayNumber: d.dayNumber,
    date: d.date,
  }));

  return { dueEmails, dueEngagement };
}

export function formatActionItemsForSlack(items: ActionItems): string | null {
  if (items.dueEmails.length === 0 && items.dueEngagement.length === 0) return null;

  const lines: string[] = ["*Outreach portal — action needed*"];

  if (items.dueEmails.length > 0) {
    lines.push("", `*Emails to send (${items.dueEmails.length}):*`);
    for (const e of items.dueEmails) {
      lines.push(`• ${e.businessName} — ${e.label} (${e.date})`);
    }
  }

  if (items.dueEngagement.length > 0) {
    lines.push("", `*Engagement check-ins (${items.dueEngagement.length}):*`);
    for (const e of items.dueEngagement) {
      lines.push(`• ${e.businessName} — ${e.platform} Day ${e.dayNumber} (${e.date})`);
    }
  }

  lines.push("", `${process.env.APP_URL}/calendar`);

  return lines.join("\n");
}
