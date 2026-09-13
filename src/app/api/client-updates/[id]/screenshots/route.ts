import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Uploads a proof screenshot for a ClientUpdate, either picked via file input or pasted from the
// clipboard, stored in the same Vercel Blob store used elsewhere, under a client-updates/ prefix.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientUpdateId } = await params;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const blob = await put(`client-updates/${clientUpdateId}/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  const screenshot = await prisma.clientUpdateScreenshot.create({
    data: {
      clientUpdateId,
      filename: file.name || "screenshot.png",
      url: blob.url,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    },
  });

  revalidatePath(`/client-updates/${clientUpdateId}`);
  revalidatePath("/client-updates");
  return NextResponse.json({ screenshot });
}
