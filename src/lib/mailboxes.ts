import { prisma } from "@/lib/prisma";

// Titan mailboxes that actually send automated outreach via n8n. No credentials live here — each
// mailbox's SMTP/IMAP creds are stored only in its own dedicated n8n workflow.

export async function listMailboxes() {
  return prisma.mailbox.findMany({ orderBy: { createdAt: "asc" } });
}

export async function addMailbox(label: string, email: string) {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) throw new Error("Email is required");
  return prisma.mailbox.create({
    data: { label: label.trim() || trimmedEmail, email: trimmedEmail },
  });
}

export async function setMailboxActive(id: string, isActive: boolean) {
  await prisma.mailbox.update({ where: { id }, data: { isActive } });
}

export async function removeMailbox(id: string) {
  await prisma.mailbox.delete({ where: { id } });
}

// Least-loaded active mailbox: fewest currently-running (not sequenceDone) leads assigned to it.
export async function pickLeastLoadedMailbox() {
  const mailboxes = await prisma.mailbox.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { leads: { where: { sequenceDone: false } } } } },
  });
  if (mailboxes.length === 0) return null;
  return mailboxes.reduce((best, m) =>
    m._count.leads < best._count.leads ? m : best
  );
}
