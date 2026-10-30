import { prisma } from "@/lib/prisma";
import type { Task } from "@prisma/client";

// Sends WhatsApp messages via the Unlimited Messaging API (api.unlimitedmessaging.app) — the same
// provider already used from n8n for lead-reply alerts. Not configured until
// UNLIMITED_MESSAGING_API_TOKEN exists — silently no-ops so the rest of the app never depends on
// WhatsApp being wired up. Generate a token at https://app.unlimitedmessaging.app/settings/tokens.
export async function sendWhatsApp(phone: string, text: string) {
  const token = process.env.UNLIMITED_MESSAGING_API_TOKEN;
  if (!token || !phone) return;

  await fetch("https://api.unlimitedmessaging.app/message", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: phone, text }),
  });
}

// Resolves who a task's WhatsApp reminder/notification should go to: its assignees if any,
// otherwise its creator. Shared by the scheduled due-reminder poll and the manual "notify now" action.
export async function phonesForTask(task: Task): Promise<string[]> {
  if (task.assignedToIds.length > 0) {
    const profiles = await prisma.profile.findMany({
      where: { id: { in: task.assignedToIds }, whatsappEnabled: true, phone: { not: null } },
      select: { phone: true },
    });
    return profiles.map((p) => p.phone!);
  }
  if (task.createdById) {
    const creator = await prisma.profile.findUnique({
      where: { id: task.createdById },
      select: { phone: true, whatsappEnabled: true },
    });
    return creator?.whatsappEnabled && creator.phone ? [creator.phone] : [];
  }
  return [];
}

export async function allWhatsappEnabledPhones(): Promise<string[]> {
  const profiles = await prisma.profile.findMany({
    where: { whatsappEnabled: true, phone: { not: null } },
    select: { phone: true },
  });
  return profiles.map((p) => p.phone!).filter(Boolean);
}
