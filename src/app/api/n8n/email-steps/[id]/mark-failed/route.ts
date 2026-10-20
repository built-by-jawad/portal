import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkN8nAuth } from "@/lib/n8n";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = checkN8nAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason: string | undefined = body.reason;

  const step = await prisma.emailStepRecord.findUnique({ where: { id } });
  if (!step) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.emailStepRecord.update({
    where: { id },
    data: { status: "FAILED", claimedAt: null },
  });

  revalidatePath(`/leads/${step.leadId}`);
  return NextResponse.json({ ok: true, reason });
}
