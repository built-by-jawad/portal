import { NextRequest, NextResponse } from "next/server";
import { allWhatsappEnabledPhones, sendWhatsApp } from "@/lib/whatsapp";

// Triggered on a schedule (see .github/workflows/daily-plan-check.yml) with ?when=morning or
// ?when=evening. The morning pack-up/plan-your-day check goes to Muhammad Jawad only; the evening
// one still goes to everyone opted in.
const JAWAD_PHONE = "+923159782971";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const when = request.nextUrl.searchParams.get("when") === "evening" ? "evening" : "morning";
  const text =
    when === "morning"
      ? "Have you planned today yet? 🗓️"
      : "Before you close out — have you planned tomorrow yet? 🗓️";

  const phones = when === "morning" ? [JAWAD_PHONE] : await allWhatsappEnabledPhones();
  await Promise.all(phones.map((phone) => sendWhatsApp(phone, text)));

  return NextResponse.json({ sent: phones.length, when });
}
