import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkN8nAuth } from "@/lib/n8n";

export async function GET(request: NextRequest) {
  const authError = checkN8nAuth(request);
  if (authError) return authError;

  const [mailboxCount, pendingCount] = await Promise.all([
    prisma.mailbox.count({ where: { isActive: true } }),
    prisma.emailStepRecord.count({ where: { status: "PENDING" } }),
  ]);

  return NextResponse.json({ ok: true, mailboxCount, pendingCount });
}
