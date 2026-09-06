"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { guessTimezoneFromAddress } from "@/lib/timezone";
import {
  disconnectAccount,
  getDefaultAccountId,
  setDefaultAccount,
  threadHasReplyFrom,
} from "@/lib/google";
import { performSend } from "@/lib/sendEngine";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}

function checked(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

export type DraftEmail = {
  hasSubject: boolean;
  subject: string;
  body: string;
  threadMode: "THREAD" | "SEPARATE";
  condition: "ALWAYS" | "IF_REPLIED" | "IF_NOT_REPLIED";
  scheduledDate: string;
  scheduledTime: string;
  scheduledTimezone: string;
};

const EMPTY_DRAFT: DraftEmail = {
  hasSubject: true,
  subject: "",
  body: "",
  threadMode: "THREAD",
  condition: "ALWAYS",
  scheduledDate: "",
  scheduledTime: "",
  scheduledTimezone: "",
};

function parseDraftEmails(formData: FormData): DraftEmail[] {
  const raw = formData.get("emailsJson");
  if (typeof raw !== "string" || !raw.trim()) return [{ ...EMPTY_DRAFT }];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [{ ...EMPTY_DRAFT }];

    return parsed.map((e) => ({
      hasSubject: typeof e?.hasSubject === "boolean" ? e.hasSubject : true,
      subject: typeof e?.subject === "string" ? e.subject : "",
      body: typeof e?.body === "string" ? e.body : "",
      threadMode: e?.threadMode === "SEPARATE" ? "SEPARATE" : "THREAD",
      condition:
        e?.condition === "IF_REPLIED" || e?.condition === "IF_NOT_REPLIED"
          ? e.condition
          : "ALWAYS",
      scheduledDate: typeof e?.scheduledDate === "string" ? e.scheduledDate : "",
      scheduledTime: typeof e?.scheduledTime === "string" ? e.scheduledTime : "",
      scheduledTimezone: typeof e?.scheduledTimezone === "string" ? e.scheduledTimezone : "",
    }));
  } catch {
    return [{ ...EMPTY_DRAFT }];
  }
}

export async function createLead(formData: FormData) {
  const businessName = str(formData, "businessName");
  if (!businessName) throw new Error("Business name is required");

  const address = str(formData, "address");
  const draftEmails = parseDraftEmails(formData);
  const guessedTimezone = guessTimezoneFromAddress(address);
  const sendAccountId = str(formData, "sendAccountId");

  const lead = await prisma.lead.create({
    data: {
      businessName,
      contactName: str(formData, "contactName"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      website: str(formData, "website"),
      address,
      trade: str(formData, "trade") ?? "OTHER",
      leakNotes: str(formData, "leakNotes"),
      notes: str(formData, "notes"),
      sendAccountId,
      emails: {
        create: draftEmails.map((e, order) => ({
          order,
          hasSubject: e.hasSubject,
          subject: e.hasSubject ? e.subject : "",
          body: e.body,
          threadMode: order === 0 ? "THREAD" : e.threadMode,
          condition: order === 0 ? "ALWAYS" : e.condition,
          scheduledDate: e.scheduledDate || null,
          scheduledTime: e.scheduledTime || null,
          scheduledTimezone: e.scheduledTimezone || guessedTimezone,
        })),
      },
    },
  });

  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(id: string, formData: FormData) {
  await prisma.lead.update({
    where: { id },
    data: {
      businessName: str(formData, "businessName") ?? undefined,
      contactName: str(formData, "contactName"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      website: str(formData, "website"),
      address: str(formData, "address"),
      trade: str(formData, "trade") ?? "OTHER",
      leakNotes: str(formData, "leakNotes"),
      notes: str(formData, "notes"),
    },
  });

  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
}

export async function updateLeadSendAccount(leadId: string, sendAccountId: string) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { sendAccountId: sendAccountId || null },
  });
  revalidatePath(`/leads/${leadId}`);
}

export async function deleteLead(id: string) {
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/leads");
  redirect("/leads");
}

export async function updateLeadStatus(id: string, status: string) {
  await prisma.lead.update({ where: { id }, data: { status } });
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
}

export async function addFollowup(leadId: string) {
  const [last, lead] = await Promise.all([
    prisma.emailStepRecord.findFirst({ where: { leadId }, orderBy: { order: "desc" } }),
    prisma.lead.findUniqueOrThrow({ where: { id: leadId } }),
  ]);
  const nextOrder = (last?.order ?? -1) + 1;

  await prisma.emailStepRecord.create({
    data: {
      leadId,
      order: nextOrder,
      hasSubject: false,
      subject: "",
      body: "",
      threadMode: "THREAD",
      condition: "ALWAYS",
      scheduledTimezone: guessTimezoneFromAddress(lead.address),
    },
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function removeEmailStep(leadId: string, recordId: string) {
  await prisma.emailStepRecord.delete({ where: { id: recordId } });
  revalidatePath(`/leads/${leadId}`);
}

export async function updateEmailStep(recordId: string, formData: FormData) {
  const hasSubject = checked(formData, "hasSubject");
  const subject = hasSubject ? str(formData, "subject") ?? "" : "";
  const body = str(formData, "body") ?? "";
  const threadMode = str(formData, "threadMode") === "SEPARATE" ? "SEPARATE" : "THREAD";
  const condition = ["IF_REPLIED", "IF_NOT_REPLIED"].includes(str(formData, "condition") ?? "")
    ? (str(formData, "condition") as string)
    : "ALWAYS";
  const scheduledDate = str(formData, "scheduledDate");
  const scheduledTime = str(formData, "scheduledTime");
  const scheduledTimezone = str(formData, "scheduledTimezone");

  const record = await prisma.emailStepRecord.update({
    where: { id: recordId },
    data: {
      hasSubject,
      subject,
      body,
      threadMode,
      condition,
      scheduledDate,
      scheduledTime,
      scheduledTimezone,
    },
  });

  revalidatePath(`/leads/${record.leadId}`);
}

export async function markEmailSent(leadId: string, recordId: string) {
  await prisma.emailStepRecord.update({
    where: { id: recordId },
    data: { sentAt: new Date() },
  });

  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  if (lead.status === "NEW" || lead.status === "RESEARCHED") {
    await prisma.lead.update({ where: { id: leadId }, data: { status: "CONTACTED" } });
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/");
}

export async function unmarkEmailSent(leadId: string, recordId: string) {
  await prisma.emailStepRecord.update({
    where: { id: recordId },
    data: { sentAt: null },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/");
}

export async function deleteAttachment(leadId: string, attachmentId: string) {
  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) return;
  await prisma.attachment.delete({ where: { id: attachmentId } });
  try {
    await del(attachment.url);
  } catch {
    // best-effort — don't fail the removal over a storage cleanup error
  }
  revalidatePath(`/leads/${leadId}`);
}

// Sends one email step via Gmail. accountId lets the caller pick which connected account to send
// from for this send (falls back to the lead's assigned account, then the default account).
export async function sendEmailNow(leadId: string, recordId: string, accountId?: string) {
  await performSend(leadId, recordId, accountId);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/");
}

// Scans the connected inbox for a reply on each sent-but-not-yet-checked email in this lead's
// sequence, stamping repliedAt when found. Drives the IF_REPLIED / IF_NOT_REPLIED pipeline
// conditions on later steps. Best-effort per record — one failure doesn't block the others.
export async function checkRepliesForLead(leadId: string) {
  const [lead, records] = await Promise.all([
    prisma.lead.findUniqueOrThrow({ where: { id: leadId } }),
    prisma.emailStepRecord.findMany({ where: { leadId }, orderBy: { order: "asc" } }),
  ]);

  if (!lead.email) return;
  const accountId = lead.sendAccountId || (await getDefaultAccountId());
  if (!accountId) return;

  for (const record of records) {
    if (!record.sentAt || record.repliedAt || !record.gmailThreadId) continue;
    try {
      const replied = await threadHasReplyFrom(
        accountId,
        record.gmailThreadId,
        lead.email,
        record.sentAt
      );
      if (replied) {
        await prisma.emailStepRecord.update({
          where: { id: record.id },
          data: { repliedAt: new Date() },
        });
      }
    } catch {
      // skip this record, try the rest
    }
  }

  const anyReplied = (
    await prisma.emailStepRecord.findMany({ where: { leadId }, select: { repliedAt: true } })
  ).some((r) => r.repliedAt);
  if (anyReplied && lead.status !== "BOOKED" && lead.status !== "DEAD") {
    await prisma.lead.update({ where: { id: leadId }, data: { status: "REPLIED" } });
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
}

export async function setDefaultAccountAction(accountId: string) {
  await setDefaultAccount(accountId);
  revalidatePath("/settings");
}

export async function disconnectAccountAction(accountId: string) {
  await disconnectAccount(accountId);
  revalidatePath("/settings");
}
