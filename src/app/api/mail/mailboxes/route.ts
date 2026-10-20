import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const mailboxes = await prisma.mailbox.findMany({
    where: { isActive: true },
    orderBy: { email: "asc" },
    select: { id: true, label: true, email: true },
  });
  return NextResponse.json({ mailboxes });
}
