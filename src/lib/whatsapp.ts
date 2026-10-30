import { prisma } from "@/lib/prisma";

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

export async function allWhatsappEnabledPhones(): Promise<string[]> {
  const profiles = await prisma.profile.findMany({
    where: { whatsappEnabled: true, phone: { not: null } },
    select: { phone: true },
  });
  return profiles.map((p) => p.phone!).filter(Boolean);
}
