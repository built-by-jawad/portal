import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Uploads an image/video/file for a task (picked or pasted), stored in the shared Blob store.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params;
  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const blob = await put(`tasks/${taskId}/${file.name}`, file, { access: "public", addRandomSuffix: true });
  const media = await prisma.taskMedia.create({
    data: {
      taskId,
      filename: file.name || "pasted-image.png",
      url: blob.url,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    },
  });
  revalidatePath("/tasks");
  return NextResponse.json({ media });
}
