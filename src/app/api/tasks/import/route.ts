import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/csv";
import { revalidatePath } from "next/cache";

// Expects the same columns /api/tasks/export produces: title,description,client,dueDate,completed
// "client" is matched case-insensitively against existing lead business names — unmatched or blank
// stays a general task (leadId null) rather than failing the whole import.
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const titleCol = col("title");
  if (titleCol === -1) {
    return NextResponse.json({ error: 'CSV must have a "title" column' }, { status: 400 });
  }
  const descCol = col("description");
  const clientCol = col("client");
  const dueDateCol = col("duedate");
  const completedCol = col("completed");

  const leads = await prisma.lead.findMany({ select: { id: true, businessName: true } });
  const leadByName = new Map(leads.map((l) => [l.businessName.trim().toLowerCase(), l.id]));

  const dataRows = rows.slice(1).filter((r) => r[titleCol]?.trim());

  let created = 0;
  for (const row of dataRows) {
    const title = row[titleCol]?.trim();
    if (!title) continue;

    const clientName = clientCol !== -1 ? row[clientCol]?.trim() : "";
    const leadId = clientName ? leadByName.get(clientName.toLowerCase()) ?? null : null;
    const completed = completedCol !== -1 && /^(true|1|yes)$/i.test(row[completedCol]?.trim() ?? "");

    await prisma.task.create({
      data: {
        title,
        description: descCol !== -1 ? row[descCol]?.trim() || null : null,
        leadId,
        dueDate: dueDateCol !== -1 ? row[dueDateCol]?.trim() || null : null,
        completedAt: completed ? new Date() : null,
      },
    });
    created++;
  }

  revalidatePath("/tasks");
  return NextResponse.json({ created });
}
