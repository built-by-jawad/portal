import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkN8nAuth } from "@/lib/n8n";
import { todayInTimeZone, minutesOfDayInTimeZone, formatTime12h } from "@/lib/scheduling";

const TEAM_TZ = "Asia/Karachi";

// Polled by n8n once a minute. Returns one WhatsApp item per (task, phone) whose dueDate is today
// and dueTime is exactly the current minute, in Asia/Karachi — an exact-minute match instead of a
// window-plus-guard-flag, so it fires exactly once per task with no separate "already sent" state
// to track. Recipients: assignedToIds if set, else just the creator.
export async function GET(request: NextRequest) {
  const authError = checkN8nAuth(request);
  if (authError) return authError;

  const now = new Date();
  const today = todayInTimeZone(TEAM_TZ, now);
  const minutes = minutesOfDayInTimeZone(TEAM_TZ, now);
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  const currentTime = `${hh}:${mm}`;

  const tasks = await prisma.task.findMany({
    where: { completedAt: null, dueDate: today, dueTime: currentTime },
  });

  const items: { taskId: string; phone: string; text: string }[] = [];

  for (const task of tasks) {
    let phones: string[];

    if (task.assignedToIds.length > 0) {
      const profiles = await prisma.profile.findMany({
        where: { id: { in: task.assignedToIds }, whatsappEnabled: true, phone: { not: null } },
        select: { phone: true },
      });
      phones = profiles.map((p) => p.phone!);
    } else if (task.createdById) {
      const creator = await prisma.profile.findUnique({
        where: { id: task.createdById },
        select: { phone: true, whatsappEnabled: true },
      });
      phones = creator?.whatsappEnabled && creator.phone ? [creator.phone] : [];
    } else {
      phones = [];
    }

    const text = `⏰ "${task.title}" is due now (${formatTime12h(task.dueTime!)}).`;
    for (const phone of phones) items.push({ taskId: task.id, phone, text });
  }

  return NextResponse.json({ items });
}
