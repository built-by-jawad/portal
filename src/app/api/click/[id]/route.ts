import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Every link in a sent email is rewritten to point here (see textToHtml in src/lib/google.ts),
// so a click redirects through this route on the way to the real destination, letting us log it.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const target = request.nextUrl.searchParams.get("u");

  if (!target) {
    return NextResponse.redirect(process.env.APP_URL ?? "/");
  }

  try {
    const record = await prisma.emailStepRecord.findUnique({ where: { id } });
    if (record) {
      await prisma.$transaction([
        prisma.emailStepRecord.update({
          where: { id },
          data: {
            clickCount: { increment: 1 },
            firstClickAt: record.firstClickAt ?? new Date(),
            lastClickAt: new Date(),
          },
        }),
        prisma.clickEvent.create({ data: { emailStepRecordId: id, url: target } }),
      ]);
    }
  } catch {
    // Click tracking is best-effort — never block the redirect over it.
  }

  return NextResponse.redirect(target);
}
