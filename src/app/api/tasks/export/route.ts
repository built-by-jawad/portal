import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toCsvRow } from "@/lib/csv";

const HEADERS = ["title", "description", "client", "dueDate", "dueTime", "completed"];

export async function GET() {
  const tasks = await prisma.task.findMany({
    include: { lead: { select: { businessName: true } } },
    orderBy: { createdAt: "asc" },
  });

  const lines = [
    toCsvRow(HEADERS),
    ...tasks.map((t) =>
      toCsvRow([
        t.title,
        t.description ?? "",
        t.lead?.businessName ?? "",
        t.dueDate ?? "",
        t.dueTime ?? "",
        t.completedAt ? "true" : "false",
      ])
    ),
  ];

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tasks-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
