import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Uploads a file (screenshot, PDF, etc.) attached directly to a lead, stored in the same Vercel
// Blob store used for email attachments, under a leads/ prefix.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const blob = await put(`leads/${leadId}/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  const leadFile = await prisma.leadFile.create({
    data: {
      leadId,
      filename: file.name,
      url: blob.url,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    },
  });

  revalidatePath(`/leads/${leadId}`);
  return NextResponse.json({ file: leadFile });
}
