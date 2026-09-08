import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id: leadId, fileId } = await params;

  const file = await prisma.leadFile.findUnique({ where: { id: fileId } });
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await del(file.url).catch(() => {});
  await prisma.leadFile.delete({ where: { id: fileId } });

  revalidatePath(`/leads/${leadId}`);
  return NextResponse.json({ ok: true });
}
