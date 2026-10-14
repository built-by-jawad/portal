import { prisma } from "@/lib/prisma";

// Plain typed-in sender addresses shown on a lead's sequence — display/organization only, nothing
// is actually sent through these. Replaces the old OAuth-connected Gmail account list.

export async function listSenderEmails() {
  return prisma.senderEmail.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getDefaultSenderEmailId(): Promise<string | null> {
  const def = await prisma.senderEmail.findFirst({ where: { isDefault: true } });
  if (def) return def.id;
  const first = await prisma.senderEmail.findFirst({ orderBy: { createdAt: "asc" } });
  return first?.id ?? null;
}

export async function addSenderEmail(email: string) {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) throw new Error("Email is required");
  const count = await prisma.senderEmail.count();
  return prisma.senderEmail.create({
    data: { email: trimmed, isDefault: count === 0 },
  });
}

export async function setDefaultSenderEmail(id: string) {
  await prisma.$transaction([
    prisma.senderEmail.updateMany({ data: { isDefault: false }, where: {} }),
    prisma.senderEmail.update({ where: { id }, data: { isDefault: true } }),
  ]);
}

export async function removeSenderEmail(id: string) {
  await prisma.senderEmail.delete({ where: { id } });
}
