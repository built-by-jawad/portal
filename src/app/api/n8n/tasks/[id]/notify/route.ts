import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkN8nAuth } from "@/lib/n8n";
import { phonesForTask } from "@/lib/whatsapp";

// Called by the n8n webhook branch when someone clicks "Send WhatsApp now" on a task in the
// portal — same recipient resolution as the scheduled due-reminder poll, just triggered manually
// and regardless of the task's dueDate/dueTime.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = checkN8nAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ items: [] });

  const phones = await phonesForTask(task);
  const text = `🔔 "${task.title}" needs attention — sent manually from the portal.`;
  const items = phones.map((phone) => ({ taskId: task.id, phone, text }));

  return NextResponse.json({ items });
}
