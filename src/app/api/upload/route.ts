import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Uploads a single email attachment to Vercel Blob storage and links it to an EmailStepRecord.
// Requires BLOB_READ_WRITE_TOKEN (auto-provided by Vercel once a Blob store is attached to the
// project; see .env.example for local dev setup).
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  const recordId = formData.get("recordId");
  const leadId = formData.get("leadId");

  if (!(file instanceof File) || typeof recordId !== "string" || typeof leadId !== "string") {
    return NextResponse.json({ error: "Missing file, recordId, or leadId" }, { status: 400 });
  }

  const blob = await put(`attachments/${recordId}/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  const attachment = await prisma.attachment.create({
    data: {
      emailStepRecordId: recordId,
      filename: file.name,
      url: blob.url,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    },
  });

  revalidatePath(`/leads/${leadId}`);
  return NextResponse.json({ attachment });
}
