import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [task, leads, profiles] = await Promise.all([
    prisma.task.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, businessName: true } },
        media: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.lead.findMany({ select: { id: true, businessName: true }, orderBy: { businessName: "asc" } }),
    prisma.profile.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ task, leads, profiles });
}
