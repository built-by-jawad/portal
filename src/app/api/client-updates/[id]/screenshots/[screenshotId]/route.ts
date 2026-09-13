import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; screenshotId: string }> }
) {
  const { id: clientUpdateId, screenshotId } = await params;

  const screenshot = await prisma.clientUpdateScreenshot.findUnique({ where: { id: screenshotId } });
  if (!screenshot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await del(screenshot.url).catch(() => {});
  await prisma.clientUpdateScreenshot.delete({ where: { id: screenshotId } });

  revalidatePath(`/client-updates/${clientUpdateId}`);
  revalidatePath("/client-updates");
  return NextResponse.json({ ok: true });
}
