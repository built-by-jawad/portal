"use server";

import bcrypt from "bcryptjs";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PAGE_KEYS } from "@/lib/permissions";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}

async function uploadImage(formData: FormData): Promise<string | null> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  const blob = await put(`profile-images/${Date.now()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return blob.url;
}

async function savePermissions(profileId: string, formData: FormData) {
  for (const { key } of PAGE_KEYS) {
    const canView = formData.get(`view_${key}`) === "on";
    const canEdit = formData.get(`edit_${key}`) === "on";
    await prisma.profilePermission.upsert({
      where: { profileId_page: { profileId, page: key } },
      update: { canView, canEdit },
      create: { profileId, page: key, canView, canEdit },
    });
  }
}

export async function createProfile(formData: FormData) {
  const name = str(formData, "name");
  const email = str(formData, "email")?.toLowerCase();
  const password = str(formData, "password");
  if (!name || !email || !password) throw new Error("Name, email, and password are required");
  const role = str(formData, "role") === "ADMIN" ? "ADMIN" : "MEMBER";

  const imageUrl = await uploadImage(formData);
  const passwordHash = await bcrypt.hash(password, 10);

  const profile = await prisma.profile.create({
    data: { name, email, passwordHash, imageUrl, role },
  });

  if (role !== "ADMIN") await savePermissions(profile.id, formData);

  revalidatePath("/profiles");
  redirect("/profiles");
}

export async function updateProfile(formData: FormData) {
  const id = str(formData, "id");
  if (!id) throw new Error("Missing profile id");
  const name = str(formData, "name");
  const email = str(formData, "email")?.toLowerCase();
  if (!name || !email) throw new Error("Name and email are required");
  const role = str(formData, "role") === "ADMIN" ? "ADMIN" : "MEMBER";
  const password = str(formData, "password");

  const imageUrl = await uploadImage(formData);

  await prisma.profile.update({
    where: { id },
    data: {
      name,
      email,
      role,
      ...(imageUrl ? { imageUrl } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });

  if (role !== "ADMIN") await savePermissions(id, formData);

  revalidatePath("/profiles");
  redirect("/profiles");
}

export async function deleteProfile(profileId: string) {
  await prisma.profile.delete({ where: { id: profileId } });
  revalidatePath("/profiles");
}
