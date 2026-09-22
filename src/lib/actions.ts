"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { guessTimezoneFromAddress } from "@/lib/timezone";
import { deconflictSchedule } from "@/lib/scheduling";
import {
  disconnectAccount,
  getDefaultAccountId,
  setDefaultAccount,
  threadHasReplyFrom,
} from "@/lib/google";
import { performSend } from "@/lib/sendEngine";
import { ENGAGEMENT_DAYS, SOCIAL_PLATFORMS } from "@/lib/constants";
import { DEFAULT_PROSPECT_CHECKLIST } from "@/lib/prospectChecklist";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}

function checked(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function secondaryEmails(formData: FormData): string[] {
  return formData
    .getAll("secondaryEmails")
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}

function socialPlatforms(formData: FormData): string[] {
  return formData
    .getAll("socialPlatforms")
    .filter((v): v is string => typeof v === "string" && (SOCIAL_PLATFORMS as readonly string[]).includes(v));
}

// Seeds a 7-day engagement checklist for each newly-checked platform, starting today. Existing
// platforms are left alone (createMany + skipDuplicates on the unique leadId/platform/dayNumber
// constraint) so re-saving the lead form never resets progress already made.
async function seedEngagementDays(leadId: string, platforms: string[]) {
  if (platforms.length === 0) return;
  const today = new Date();
  const data = platforms.flatMap((platform) =>
    Array.from({ length: ENGAGEMENT_DAYS }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      return {
        leadId,
        platform,
        dayNumber: i + 1,
        date: date.toISOString().slice(0, 10),
      };
    })
  );
  await prisma.engagementDay.createMany({ data, skipDuplicates: true });
}

// After any change that could create or shift a same-account send-time collision (scheduling a
// step, editing its time, or moving a lead to a different account), re-checks every not-yet-sent
// scheduled email on that effective account and applies a random 15-30 minute buffer to any that
// land within 15 minutes of another one on the same account. Returns the leadIds that got nudged
// so callers can revalidate those pages too.
async function deconflictAccountSchedule(effectiveAccountId: string): Promise<string[]> {
  const records = await prisma.emailStepRecord.findMany({
    where: { sentAt: null, scheduledDate: { not: null }, scheduledTime: { not: null } },
    select: {
      id: true,
      leadId: true,
      scheduledDate: true,
      scheduledTime: true,
      scheduledTimezone: true,
      lead: { select: { sendAccountId: true } },
    },
  });

  const defaultAccountId = await getDefaultAccountId();
  const relevant = records.filter(
    (r) => (r.lead.sendAccountId || defaultAccountId) === effectiveAccountId
  );

  const changes = deconflictSchedule(
    relevant.map((r) => ({
      id: r.id,
      scheduledDate: r.scheduledDate!,
      scheduledTime: r.scheduledTime!,
      scheduledTimezone: r.scheduledTimezone || "UTC",
    }))
  );

  if (changes.length === 0) return [];

  const leadIdById = new Map(relevant.map((r) => [r.id, r.leadId]));

  await Promise.all(
    changes.map((c) =>
      prisma.emailStepRecord.update({
        where: { id: c.id },
        data: { scheduledDate: c.scheduledDate, scheduledTime: c.scheduledTime },
      })
    )
  );

  return [...new Set(changes.map((c) => leadIdById.get(c.id)).filter((id): id is string => !!id))];
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
  const platforms = socialPlatforms(formData);

  const lead = await prisma.lead.create({
    data: {
      businessName,
      contactName: str(formData, "contactName"),
      email: str(formData, "email"),
      secondaryEmails: secondaryEmails(formData),
      phone: str(formData, "phone"),
      website: str(formData, "website"),
      address,
      trade: str(formData, "trade") ?? "OTHER",
      leakNotes: str(formData, "leakNotes"),
      notes: str(formData, "notes"),
      sendAccountId,
      socialPlatforms: platforms,
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

  await seedEngagementDays(lead.id, platforms);

  const effectiveAccountId = sendAccountId || (await getDefaultAccountId());
  if (effectiveAccountId) {
    const nudgedLeadIds = await deconflictAccountSchedule(effectiveAccountId);
    nudgedLeadIds.forEach((id) => revalidatePath(`/leads/${id}`));
  }

  revalidatePath("/leads");
  revalidatePath("/calendar");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(id: string, formData: FormData) {
  const existing = await prisma.lead.findUniqueOrThrow({ where: { id }, select: { socialPlatforms: true } });
  const platforms = socialPlatforms(formData);
  const newlyAdded = platforms.filter((p) => !existing.socialPlatforms.includes(p));

  await prisma.lead.update({
    where: { id },
    data: {
      businessName: str(formData, "businessName") ?? undefined,
      contactName: str(formData, "contactName"),
      email: str(formData, "email"),
      secondaryEmails: secondaryEmails(formData),
      phone: str(formData, "phone"),
      website: str(formData, "website"),
      address: str(formData, "address"),
      trade: str(formData, "trade") ?? "OTHER",
      leakNotes: str(formData, "leakNotes"),
      notes: str(formData, "notes"),
      socialPlatforms: platforms,
    },
  });

  await seedEngagementDays(id, newlyAdded);

  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  revalidatePath("/engagement");
}

export async function updateLeadSendAccount(leadId: string, sendAccountId: string) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { sendAccountId: sendAccountId || null },
  });

  const effectiveAccountId = sendAccountId || (await getDefaultAccountId());
  if (effectiveAccountId) {
    const nudgedLeadIds = await deconflictAccountSchedule(effectiveAccountId);
    nudgedLeadIds.forEach((id) => revalidatePath(`/leads/${id}`));
    if (nudgedLeadIds.length > 0) revalidatePath("/calendar");
  }

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
    include: { lead: { select: { sendAccountId: true } } },
  });

  let adjusted = false;
  if (scheduledDate && scheduledTime) {
    const effectiveAccountId = record.lead.sendAccountId || (await getDefaultAccountId());
    if (effectiveAccountId) {
      const nudgedLeadIds = await deconflictAccountSchedule(effectiveAccountId);
      adjusted = nudgedLeadIds.includes(record.leadId);
      nudgedLeadIds.forEach((id) => revalidatePath(`/leads/${id}`));
      if (nudgedLeadIds.length > 0) revalidatePath("/calendar");
    }
  }

  revalidatePath(`/leads/${record.leadId}`);
  return { adjusted };
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

export async function toggleEngagementDay(dayId: string, leadId: string) {
  const day = await prisma.engagementDay.findUniqueOrThrow({ where: { id: dayId } });
  await prisma.engagementDay.update({
    where: { id: dayId },
    data: { completedAt: day.completedAt ? null : new Date() },
  });
  revalidatePath(`/engagement/${leadId}`);
  revalidatePath("/engagement");
}

export async function updateEngagementNote(dayId: string, leadId: string, formData: FormData) {
  await prisma.engagementDay.update({
    where: { id: dayId },
    data: { note: str(formData, "note") },
  });
  revalidatePath(`/engagement/${leadId}`);
}

export async function createTask(formData: FormData) {
  const title = str(formData, "title");
  if (!title) throw new Error("Title is required");

  await prisma.task.create({
    data: {
      title,
      description: str(formData, "description"),
      leadId: str(formData, "leadId"),
      dueDate: str(formData, "dueDate"),
    },
  });

  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function updateTask(id: string, formData: FormData) {
  await prisma.task.update({
    where: { id },
    data: {
      title: str(formData, "title") ?? undefined,
      description: str(formData, "description"),
      leadId: str(formData, "leadId"),
      dueDate: str(formData, "dueDate"),
    },
  });
  revalidatePath("/tasks");
}

export async function toggleTaskDone(id: string) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id } });
  await prisma.task.update({
    where: { id },
    data: { completedAt: task.completedAt ? null : new Date() },
  });
  revalidatePath("/tasks");
}

export async function deleteTask(id: string) {
  await prisma.task.delete({ where: { id } });
  revalidatePath("/tasks");
}

// Single-task edit page's form submits here, then bounces back to the list — same update logic as
// the inline bulk-edit rows use, just with a redirect since this is a full-page form.
export async function saveTaskEdit(id: string, formData: FormData) {
  await updateTask(id, formData);
  redirect("/tasks");
}

export async function bulkUpdateTasks(
  ids: string[],
  patch: { leadId?: string | null; dueDate?: string | null; markDone?: boolean }
) {
  if (ids.length === 0) return;

  const data: { leadId?: string | null; dueDate?: string | null; completedAt?: Date | null } = {};
  if (patch.leadId !== undefined) data.leadId = patch.leadId || null;
  if (patch.dueDate !== undefined) data.dueDate = patch.dueDate || null;
  if (patch.markDone !== undefined) data.completedAt = patch.markDone ? new Date() : null;

  await prisma.task.updateMany({ where: { id: { in: ids } }, data });
  revalidatePath("/tasks");
}

export async function bulkDeleteTasks(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.task.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/tasks");
}

export async function createScript(formData: FormData) {
  const title = str(formData, "title");
  const content = str(formData, "content");
  if (!title) throw new Error("Title is required");
  if (!content) throw new Error("Content is required");

  const script = await prisma.script.create({
    data: { title, content, category: str(formData, "category") },
  });

  revalidatePath("/scripts");
  redirect(`/scripts/${script.id}`);
}

export async function updateScript(id: string, formData: FormData) {
  const content = str(formData, "content");
  if (!content) throw new Error("Content is required");

  await prisma.script.update({
    where: { id },
    data: {
      title: str(formData, "title") ?? undefined,
      category: str(formData, "category"),
      content,
    },
  });

  revalidatePath("/scripts");
  revalidatePath(`/scripts/${id}`);
  redirect(`/scripts/${id}`);
}

export async function deleteScript(id: string) {
  await prisma.script.delete({ where: { id } });
  revalidatePath("/scripts");
  redirect("/scripts");
}

// Does NOT redirect — the new-update form is a client component that stages screenshots before
// this ever runs, then uploads them against the returned id and shows its own "Saved" toast, so
// this just needs to hand back the created record.
export async function createClientUpdate(formData: FormData) {
  const leadId = str(formData, "leadId");
  const date = str(formData, "date");
  const taskName = str(formData, "taskName");
  if (!leadId) throw new Error("Client is required");
  if (!date) throw new Error("Date is required");
  if (!taskName) throw new Error("Task name is required");

  const update = await prisma.clientUpdate.create({
    data: {
      leadId,
      date,
      taskName,
      description: str(formData, "description"),
      proofLink: str(formData, "proofLink"),
    },
  });

  revalidatePath("/client-updates");
  return update;
}

export async function updateClientUpdate(id: string, formData: FormData) {
  const taskName = str(formData, "taskName");
  if (!taskName) throw new Error("Task name is required");

  await prisma.clientUpdate.update({
    where: { id },
    data: {
      date: str(formData, "date") ?? undefined,
      taskName,
      description: str(formData, "description"),
      proofLink: str(formData, "proofLink"),
    },
  });

  revalidatePath("/client-updates");
  revalidatePath(`/client-updates/${id}`);
}

export async function deleteClientUpdate(id: string) {
  const update = await prisma.clientUpdate.findUnique({
    where: { id },
    include: { screenshots: true },
  });
  if (!update) return;

  await Promise.all(update.screenshots.map((s) => del(s.url).catch(() => {})));
  await prisma.clientUpdate.delete({ where: { id } });

  revalidatePath("/client-updates");
  redirect("/client-updates");
}

export async function createClientQuestion(leadId: string, formData: FormData) {
  const question = str(formData, "question");
  if (!question) throw new Error("Question is required");

  await prisma.clientQuestion.create({ data: { leadId, question } });
  revalidatePath(`/leads/${leadId}`);
}

export async function toggleClientQuestionResolved(id: string, leadId: string) {
  const q = await prisma.clientQuestion.findUniqueOrThrow({ where: { id } });
  await prisma.clientQuestion.update({
    where: { id },
    data: { resolvedAt: q.resolvedAt ? null : new Date() },
  });
  revalidatePath(`/leads/${leadId}`);
}

export async function updateClientQuestionAnswer(id: string, leadId: string, formData: FormData) {
  await prisma.clientQuestion.update({
    where: { id },
    data: { answer: str(formData, "answer") },
  });
  revalidatePath(`/leads/${leadId}`);
}

export async function deleteClientQuestion(id: string, leadId: string) {
  await prisma.clientQuestion.delete({ where: { id } });
  revalidatePath(`/leads/${leadId}`);
}

// Creates the idea record the first time there's something worth saving (called once, from the
// client, on the first debounced autosave tick on a brand-new idea) — returns the id so the editor
// can keep autosaving against it via autosaveIdea below.
export async function createIdeaDraft(content: string): Promise<string> {
  const idea = await prisma.idea.create({ data: { content } });
  revalidatePath("/ideas");
  return idea.id;
}

export async function autosaveIdea(id: string, content: string) {
  await prisma.idea.update({ where: { id }, data: { content } });
  revalidatePath("/ideas");
  revalidatePath(`/ideas/${id}`);
}

export async function toggleIdeaStarred(id: string) {
  const idea = await prisma.idea.findUniqueOrThrow({ where: { id } });
  await prisma.idea.update({ where: { id }, data: { starred: !idea.starred } });
  revalidatePath("/ideas");
  revalidatePath(`/ideas/${id}`);
}

export async function deleteIdea(id: string) {
  await prisma.idea.delete({ where: { id } });
  revalidatePath("/ideas");
  redirect("/ideas");
}

// Prospects: raw, unvetted business data (bulk-imported or added by hand) that hasn't become a
// lead yet. See prisma/schema.prisma Prospect/ProspectColumn/ProspectBoardSettings/
// ProspectChecklistItem models for field meanings. Rows sort by `order` ascending (new rows go
// to the bottom); columns sort by ProspectBoardSettings.columnOrder.

const BUILTIN_PROSPECT_FIELDS = new Set([
  "businessName",
  "phone",
  "emails",
  "website",
  "category",
  "address",
  "notes",
]);
const BUILTIN_PROSPECT_NUMBER_FIELDS = new Set(["rating", "reviewCount"]);

async function nextProspectOrder(): Promise<number> {
  const last = await prisma.prospect.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
  return (last?.order ?? 0) + 1;
}

async function seedProspectChecklist(prospectId: string) {
  await prisma.prospectChecklistItem.createMany({
    data: DEFAULT_PROSPECT_CHECKLIST.map((item, i) => ({
      prospectId,
      section: item.section,
      text: item.text,
      order: i,
    })),
  });
}

export async function createProspect(data: {
  businessName: string;
  phone?: string;
  emails?: string;
  website?: string;
  category?: string;
  address?: string;
  rating?: number | null;
  reviewCount?: number | null;
  notes?: string;
  source?: string;
}) {
  const order = await nextProspectOrder();
  const prospect = await prisma.prospect.create({
    data: {
      businessName: data.businessName || "Untitled business",
      phone: data.phone || null,
      emails: data.emails || null,
      website: data.website || null,
      category: data.category || null,
      address: data.address || null,
      rating: data.rating ?? null,
      reviewCount: data.reviewCount ?? null,
      notes: data.notes || null,
      source: data.source || null,
      order,
    },
  });
  await seedProspectChecklist(prospect.id);
  revalidatePath("/prospects");
  return prospect;
}

// Adds `count` empty rows at once, at the bottom, each seeded with the default checklist.
export async function createProspectsBulk(count: number) {
  const n = Math.max(1, Math.min(count, 200));
  const start = await nextProspectOrder();
  const created: { id: string }[] = [];
  for (let i = 0; i < n; i++) {
    const prospect = await prisma.prospect.create({
      data: { businessName: "Untitled business", order: start + i },
      select: { id: true },
    });
    await seedProspectChecklist(prospect.id);
    created.push(prospect);
  }
  revalidatePath("/prospects");
  return created;
}

// Single built-in text field edit (spreadsheet cell save-on-blur).
export async function updateProspectField(id: string, field: string, value: string) {
  if (!BUILTIN_PROSPECT_FIELDS.has(field)) throw new Error(`Field not editable: ${field}`);
  await prisma.prospect.update({ where: { id }, data: { [field]: value || null } });
  revalidatePath("/prospects");
}

export async function updateProspectNumberField(id: string, field: string, value: string) {
  if (!BUILTIN_PROSPECT_NUMBER_FIELDS.has(field)) throw new Error(`Field not editable: ${field}`);
  const num = value.trim() === "" ? null : field === "rating" ? parseFloat(value) : parseInt(value, 10);
  await prisma.prospect.update({ where: { id }, data: { [field]: Number.isFinite(num as number) ? num : null } });
  revalidatePath("/prospects");
}

// Custom column value — stored in Prospect.customFields[columnKey].
export async function updateProspectCustomField(id: string, columnKey: string, value: string) {
  const prospect = await prisma.prospect.findUniqueOrThrow({ where: { id }, select: { customFields: true } });
  const customFields = { ...(prospect.customFields as Record<string, string>) };
  if (value === "") delete customFields[columnKey];
  else customFields[columnKey] = value;
  await prisma.prospect.update({ where: { id }, data: { customFields } });
  revalidatePath("/prospects");
}

export async function deleteProspect(id: string) {
  await prisma.prospect.delete({ where: { id } });
  revalidatePath("/prospects");
}

export async function bulkDeleteProspects(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.prospect.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/prospects");
}

// --- Columns (Notion-database style: built-in fields + ad-hoc ProspectColumn rows) ---

function slugifyColumnKey(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "column";
}

export async function createProspectColumn(label: string, type: "TEXT" | "NUMBER" = "TEXT") {
  const base = slugifyColumnKey(label);
  let key = base;
  let n = 1;
  while (await prisma.prospectColumn.findUnique({ where: { key } })) {
    key = `${base}_${++n}`;
  }
  const column = await prisma.prospectColumn.create({ data: { key, label: label || "New column", type } });
  await appendToColumnOrder(column.key);
  revalidatePath("/prospects");
  return column;
}

export async function createProspectColumnsBulk(labels: string[], type: "TEXT" | "NUMBER" = "TEXT") {
  const created = [];
  for (const label of labels) {
    if (!label.trim()) continue;
    created.push(await createProspectColumn(label.trim(), type));
  }
  return created;
}

export async function renameProspectColumn(id: string, label: string) {
  await prisma.prospectColumn.update({ where: { id }, data: { label: label || "Untitled column" } });
  revalidatePath("/prospects");
}

export async function deleteProspectColumn(id: string) {
  const column = await prisma.prospectColumn.findUniqueOrThrow({ where: { id } });
  await prisma.prospectColumn.delete({ where: { id } });
  await removeFromColumnOrder(column.key);
  revalidatePath("/prospects");
}

async function getBoardSettings() {
  return prisma.prospectBoardSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", columnOrder: [] },
    update: {},
  });
}

async function appendToColumnOrder(key: string) {
  const settings = await getBoardSettings();
  if (settings.columnOrder.includes(key)) return;
  await prisma.prospectBoardSettings.update({
    where: { id: "singleton" },
    data: { columnOrder: [...settings.columnOrder, key] },
  });
}

async function removeFromColumnOrder(key: string) {
  const settings = await getBoardSettings();
  await prisma.prospectBoardSettings.update({
    where: { id: "singleton" },
    data: { columnOrder: settings.columnOrder.filter((k) => k !== key) },
  });
}

// Full reorder — pass the complete ordered list of column keys (built-in field names + custom
// column keys mixed together), as dragged/reordered in the "Manage columns" panel.
export async function reorderProspectColumns(order: string[]) {
  await prisma.prospectBoardSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", columnOrder: order },
    update: { columnOrder: order },
  });
  revalidatePath("/prospects");
}

// --- CSV import ---

// Bulk CSV import for prospects — expects the google-maps-scraper-kit column layout
// (title,phone,emails,website,category,address,review_rating,review_count) but tolerates any
// subset/order of those headers by name, case-insensitively.
export async function importProspectsCsv(rows: string[][]) {
  if (rows.length === 0) return { created: 0 };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => names.map((n) => header.indexOf(n)).find((i) => i !== -1) ?? -1;

  const titleCol = col("title", "businessname", "business name", "name");
  if (titleCol === -1) throw new Error('CSV must have a "title" (or "businessName") column');

  const phoneCol = col("phone");
  const emailsCol = col("emails", "email");
  const websiteCol = col("website");
  const categoryCol = col("category");
  const addressCol = col("address");
  const ratingCol = col("review_rating", "rating");
  const reviewCountCol = col("review_count", "reviewcount");

  const dataRows = rows.slice(1).filter((r) => r[titleCol]?.trim());
  let order = await nextProspectOrder();

  let created = 0;
  for (const row of dataRows) {
    const businessName = row[titleCol]?.trim();
    if (!businessName) continue;

    const rating = ratingCol !== -1 ? parseFloat(row[ratingCol]) : NaN;
    const reviewCount = reviewCountCol !== -1 ? parseInt(row[reviewCountCol], 10) : NaN;

    const prospect = await prisma.prospect.create({
      data: {
        businessName,
        phone: phoneCol !== -1 ? row[phoneCol]?.trim() || null : null,
        emails: emailsCol !== -1 ? row[emailsCol]?.trim() || null : null,
        website: websiteCol !== -1 ? row[websiteCol]?.trim() || null : null,
        category: categoryCol !== -1 ? row[categoryCol]?.trim() || null : null,
        address: addressCol !== -1 ? row[addressCol]?.trim() || null : null,
        rating: Number.isFinite(rating) ? rating : null,
        reviewCount: Number.isFinite(reviewCount) ? reviewCount : null,
        source: "csv-import",
        order: order++,
      },
    });
    await seedProspectChecklist(prospect.id);
    created++;
  }

  revalidatePath("/prospects");
  return { created };
}

// --- Checklist (per-prospect, seeded from DEFAULT_PROSPECT_CHECKLIST, fully editable after) ---

export async function getProspectChecklist(prospectId: string) {
  return prisma.prospectChecklistItem.findMany({ where: { prospectId }, orderBy: { order: "asc" } });
}

export async function addChecklistItem(prospectId: string, section: string, text: string) {
  const last = await prisma.prospectChecklistItem.findFirst({
    where: { prospectId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const item = await prisma.prospectChecklistItem.create({
    data: { prospectId, section: section || "Checklist", text, order: (last?.order ?? 0) + 1 },
  });
  revalidatePath("/prospects");
  return item;
}

export async function updateChecklistItem(id: string, data: { text?: string; checked?: boolean; section?: string }) {
  await prisma.prospectChecklistItem.update({
    where: { id },
    data: {
      ...(data.text !== undefined ? { text: data.text } : {}),
      ...(data.checked !== undefined ? { checked: data.checked } : {}),
      ...(data.section !== undefined ? { section: data.section } : {}),
    },
  });
  revalidatePath("/prospects");
}

export async function deleteChecklistItem(id: string) {
  await prisma.prospectChecklistItem.delete({ where: { id } });
  revalidatePath("/prospects");
}

