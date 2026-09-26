import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  const { mediaId } = await params;
  const media = await prisma.clientQuestionMedia.findUnique({ where: { id: mediaId } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await del(media.url).catch(() => {});
  await prisma.clientQuestionMedia.delete({ where: { id: mediaId } });
  revalidatePath("/questions");
  return NextResponse.json({ ok: true });
}
