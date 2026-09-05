import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7",
  "base64"
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const record = await prisma.emailStepRecord.findUnique({ where: { id } });
    if (record) {
      await prisma.emailStepRecord.update({
        where: { id },
        data: {
          openCount: { increment: 1 },
          openedAt: record.openedAt ?? new Date(),
        },
      });
    }
  } catch {
    // Tracking is best-effort — never fail the pixel response over it.
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
