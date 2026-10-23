import { prisma } from "@/lib/prisma";
import { emailStepLabel } from "@/lib/constants";
import { scheduledToUtc, todayInTimeZone } from "@/lib/scheduling";

const PAKISTAN_TZ = "Asia/Karachi";

export type ActionItems = {
  dueEmails: { leadId: string; businessName: string; label: string; date: string }[];
  dueTasks: { title: string; businessName: string | null; date: string }[];
};

// Everything that's due (today or overdue, in Pakistan time) and still needs a human action: an
// outreach email not yet sent, or a task not yet done.
// Used both by the Slack digest cron and could back an in-app badge later.
export async function getActionItems(): Promise<ActionItems> {
  const today = todayInTimeZone(PAKISTAN_TZ);

  const [emailCandidates, taskCandidates] = await Promise.all([
    prisma.emailStepRecord.findMany({
      where: {
        scheduledDate: { not: null },
        lead: { status: { notIn: ["BOOKED", "DEAD"] } },
      },
      include: { lead: { select: { id: true, businessName: true } } },
    }),
    prisma.task.findMany({
      where: { completedAt: null, dueDate: { lte: today } },
      include: { lead: { select: { businessName: true } } },
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

  const dueTasks = taskCandidates.map((t) => ({
    title: t.title,
    businessName: t.lead?.businessName ?? null,
    date: t.dueDate!,
  }));

  return { dueEmails, dueTasks };
}

export function formatActionItemsForSlack(items: ActionItems): string | null {
  if (items.dueEmails.length === 0 && items.dueTasks.length === 0) {
    return null;
  }

  const lines: string[] = ["*Outreach portal — action needed*"];

  if (items.dueEmails.length > 0) {
    lines.push("", `*Emails to send (${items.dueEmails.length}):*`);
    for (const e of items.dueEmails) {
      lines.push(`• ${e.businessName} — ${e.label} (${e.date})`);
    }
  }

  if (items.dueTasks.length > 0) {
    lines.push("", `*Tasks (${items.dueTasks.length}):*`);
    for (const t of items.dueTasks) {
      lines.push(`• ${t.title}${t.businessName ? ` — ${t.businessName}` : ""} (${t.date})`);
    }
  }

  lines.push("", `${process.env.APP_URL}/calendar`);

  return lines.join("\n");
}
