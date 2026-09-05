"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}

export type DraftEmail = {
  subject: string;
  body: string;
  scheduledDate: string;
  scheduledTime: string;
  scheduledTimezone: string;
};

function parseDraftEmails(formData: FormData): DraftEmail[] {
  const raw = formData.get("emailsJson");
  if (typeof raw !== "string" || !raw.trim()) return [{ subject: "", body: "", scheduledDate: "", scheduledTime: "", scheduledTimezone: "" }];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [{ subject: "", body: "", scheduledDate: "", scheduledTime: "", scheduledTimezone: "" }];
    }
    return parsed.map((e) => ({
      subject: typeof e?.subject === "string" ? e.subject : "",
      body: typeof e?.body === "string" ? e.body : "",
      scheduledDate: typeof e?.scheduledDate === "string" ? e.scheduledDate : "",
      scheduledTime: typeof e?.scheduledTime === "string" ? e.scheduledTime : "",
      scheduledTimezone: typeof e?.scheduledTimezone === "string" ? e.scheduledTimezone : "",
    }));
  } catch {
    return [{ subject: "", body: "", scheduledDate: "", scheduledTime: "", scheduledTimezone: "" }];
  }
}

export async function createLead(formData: FormData) {
  const businessName = str(formData, "businessName");
  if (!businessName) throw new Error("Business name is required");

  const draftEmails = parseDraftEmails(formData);

  const lead = await prisma.lead.create({
    data: {
      businessName,
      contactName: str(formData, "contactName"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      website: str(formData, "website"),
      address: str(formData, "address"),
      trade: str(formData, "trade") ?? "OTHER",
      leakNotes: str(formData, "leakNotes"),
      notes: str(formData, "notes"),
      emails: {
        create: draftEmails.map((e, order) => ({
          order,
          subject: e.subject,
          body: e.body,
          scheduledDate: e.scheduledDate || null,
          scheduledTime: e.scheduledTime || null,
          scheduledTimezone: e.scheduledTimezone || null,
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
  const last = await prisma.emailStepRecord.findFirst({
    where: { leadId },
    orderBy: { order: "desc" },
  });
  const nextOrder = (last?.order ?? -1) + 1;

  await prisma.emailStepRecord.create({
    data: { leadId, order: nextOrder, subject: "", body: "" },
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function removeEmailStep(leadId: string, recordId: string) {
  await prisma.emailStepRecord.delete({ where: { id: recordId } });
  revalidatePath(`/leads/${leadId}`);
}

export async function updateEmailStep(recordId: string, formData: FormData) {
  const subject = str(formData, "subject") ?? "";
  const body = str(formData, "body") ?? "";
  const scheduledDate = str(formData, "scheduledDate");
  const scheduledTime = str(formData, "scheduledTime");
  const scheduledTimezone = str(formData, "scheduledTimezone");

  const record = await prisma.emailStepRecord.update({
    where: { id: recordId },
    data: { subject, body, scheduledDate, scheduledTime, scheduledTimezone },
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
