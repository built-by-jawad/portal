import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduledToUtc, todayInTimeZone } from "@/lib/scheduling";
import { recipientsForTask, sendWhatsApp } from "@/lib/whatsapp";

const TEAM_TZ = "Asia/Karachi";
const REMINDER_WINDOW_MS = 10 * 60 * 1000;

// Triggered every 5 minutes (see .github/workflows/task-reminders.yml). Finds open tasks due
// today with a dueTime that falls within the next 10 minutes, not yet reminded, and WhatsApps
// whoever should see it (everyone opted in if visibleToAll, else just the creator).
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = todayInTimeZone(TEAM_TZ, now);

  const candidates = await prisma.task.findMany({
    where: { completedAt: null, dueDate: today, dueTime: { not: null }, reminderSentAt: null },
  });

  let sent = 0;
  for (const task of candidates) {
    const dueInstant = scheduledToUtc(task.dueDate!, task.dueTime!, TEAM_TZ);
    if (!dueInstant) continue;

    const msUntilDue = dueInstant.getTime() - now.getTime();
    if (msUntilDue <= 0 || msUntilDue > REMINDER_WINDOW_MS) continue;

    const phones = await recipientsForTask(task);
    if (phones.length > 0) {
      const text = `⏰ "${task.title}" is due in about 10 minutes (${task.dueTime}).`;
      await Promise.all(phones.map((phone) => sendWhatsApp(phone, text)));
      sent++;
    }

    await prisma.task.update({ where: { id: task.id }, data: { reminderSentAt: now } });
  }

  return NextResponse.json({ checked: candidates.length, remindersSent: sent });
}
