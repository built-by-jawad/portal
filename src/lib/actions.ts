"use server";

import { prisma } from "@/lib/prisma";
import { syncChannels, setOutreachStatus } from "@/lib/outreachActions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { guessTimezoneFromAddress } from "@/lib/timezone";
import { addMailbox, removeMailbox, setMailboxActive, pickLeastLoadedMailbox } from "@/lib/mailboxes";
import { ENGAGEMENT_DAYS, ENGAGEMENT_DAY_ACTIONS, SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/constants";
import { DEFAULT_PROSPECT_CHECKLIST } from "@/lib/prospectChecklist";
import { todayInTimeZone, addDays } from "@/lib/scheduling";
import { EMAIL_SEQUENCE_DAYS } from "@/lib/outreach";
import { sendEmailStepById } from "@/lib/sendEmailStep";

const PAKISTAN_TZ = "Asia/Karachi";

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

function channelList(formData: FormData): string[] {
  return formData.getAll("channels").filter((v): v is string => typeof v === "string");
}


export type DraftEmail = {
  hasSubject: boolean;
  subject: string;
  body: string;
  scheduledDate: string;
  scheduledTime: string;
  scheduledTimezone: string;
};

const EMPTY_DRAFT: DraftEmail = {
  hasSubject: true,
  subject: "",
  body: "",
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
  const channels = channelList(formData);

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
      timezone: guessedTimezone,
      city: str(formData, "city"),
      state: str(formData, "state"),
      instagram: str(formData, "instagram"),
      facebook: str(formData, "facebook"),
      linkedin: str(formData, "linkedin"),
      emails: {
        create: draftEmails.map((e, order) => ({
          order,
          hasSubject: e.hasSubject,
          subject: e.hasSubject ? e.subject : "",
          body: e.body,
          scheduledDate: e.scheduledDate || null,
          scheduledTime: e.scheduledTime || null,
          scheduledTimezone: e.scheduledTimezone || guessedTimezone,
        })),
      },
    },
  });

  await syncChannels(lead.id, channels);

  revalidatePath("/leads");
  revalidatePath("/calendar");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(id: string, formData: FormData) {
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
      city: str(formData, "city"),
      state: str(formData, "state"),
      instagram: str(formData, "instagram"),
      facebook: str(formData, "facebook"),
      linkedin: str(formData, "linkedin"),
    },
  });

  if (formData.get("channelsForm")) await syncChannels(id, channelList(formData));

  revalidatePath(`/leads/${id}`);
  revalidatePath("/clients/[id]", "page");
  revalidatePath("/leads");
}

export async function updateLeadMailbox(leadId: string, mailboxId: string) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { mailboxId: mailboxId || null },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/clients/[id]", "page");
}

export async function updateLeadTimezone(leadId: string, timezone: string) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { timezone: timezone || null },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/clients/[id]", "page");
}

// Assigns a mailbox (least-loaded active one) and lays out the 5-step day 1/4/7/10/13 cadence from
// today, then flips the lead into SEQUENCE_STARTED so n8n's due-email polling starts picking it up.
export async function startLeadSequence(leadId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId }, include: { emails: true } });
  if (lead.outreachStatus !== "NEW") throw new Error("Sequence already started");
  if (!lead.email) throw new Error("Lead needs an email address first");

  const timezone = lead.timezone || guessTimezoneFromAddress(lead.address);
  if (!timezone) throw new Error("Could not determine a timezone — set one by hand first");

  const mailbox = await pickLeastLoadedMailbox();
  if (!mailbox) throw new Error("No active mailbox available — add one in Settings first");

  const startDate = todayInTimeZone(timezone);

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: {
        timezone,
        mailboxId: mailbox.id,
        sequenceStartedAt: new Date(),
        sequenceDone: false,
        outreachStatus: "SEQUENCE_STARTED",
        status: "CONTACTED",
      },
    }),
    ...lead.emails
      .filter((e) => e.order < EMAIL_SEQUENCE_DAYS.length)
      .map((e) =>
        prisma.emailStepRecord.update({
          where: { id: e.id },
          data: {
            scheduledDate: addDays(startDate, EMAIL_SEQUENCE_DAYS[e.order] - 1),
            scheduledTime: "08:30",
            scheduledTimezone: timezone,
            status: "PENDING",
            sentAt: null,
            claimedAt: null,
          },
        })
      ),
  ]);

  revalidatePath(`/leads/${leadId}`);
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
  revalidatePath("/clients/[id]", "page");
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
      scheduledTimezone: guessTimezoneFromAddress(lead.address),
    },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/clients/[id]", "page");
}

export async function removeEmailStep(leadId: string, recordId: string) {
  await prisma.emailStepRecord.delete({ where: { id: recordId } });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/clients/[id]", "page");
}

export async function updateEmailStep(recordId: string, formData: FormData) {
  const hasSubject = checked(formData, "hasSubject");
  const subject = hasSubject ? str(formData, "subject") ?? "" : "";
  const body = str(formData, "body") ?? "";
  const messageId = str(formData, "messageId");

  // scheduledDate/scheduledTime/scheduledTimezone are no longer edited by hand here —
  // startLeadSequence (src/lib/actions.ts) sets them automatically from the lead's timezone and
  // the day-1/4/7/10/13 cadence, and the n8n due-email route reads them to decide what's due.
  // messageId (shown as "Thread ID" in the UI) IS hand-editable — it's auto-filled on send, but
  // can be cleared or overridden, e.g. to re-point a follow-up at a different thread.
  const record = await prisma.emailStepRecord.update({
    where: { id: recordId },
    data: {
      hasSubject,
      subject,
      body,
      messageId,
    },
  });

  revalidatePath(`/leads/${record.leadId}`);
  revalidatePath("/clients/[id]", "page");
  revalidatePath("/calendar");
}

export async function sendEmailStepManually(recordId: string) {
  return sendEmailStepById(recordId);
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
  revalidatePath("/clients/[id]", "page");
}

export async function addMailboxAction(formData: FormData) {
  const email = str(formData, "email");
  if (!email) throw new Error("Email is required");
  await addMailbox(str(formData, "label") ?? email, email);
  revalidatePath("/settings");
}

export async function toggleMailboxActiveAction(id: string, isActive: boolean) {
  await setMailboxActive(id, isActive);
  revalidatePath("/settings");
}

export async function removeMailboxAction(id: string) {
  await removeMailbox(id);
  revalidatePath("/settings");
}

export async function toggleEngagementDay(dayId: string) {
  const day = await prisma.engagementDay.findUniqueOrThrow({ where: { id: dayId } });
  await prisma.engagementDay.update({
    where: { id: dayId },
    data: { completedAt: day.completedAt ? null : new Date() },
  });
  revalidatePath("/engagement");
}

// Renames a single day's checklist item (e.g. "Follow" -> something else) for just this profile —
// the standard ENGAGEMENT_DAY_ACTIONS wording is only the seed default, not a fixed template.
export async function updateEngagementDayAction(dayId: string, action: string) {
  await prisma.engagementDay.update({ where: { id: dayId }, data: { action: action.trim() || null } });
  revalidatePath("/engagement");
}

// Drops one day from a profile's checklist entirely (e.g. "I don't need a Day 3 comment for this
// one") — the other days are untouched.
export async function deleteEngagementDay(dayId: string) {
  await prisma.engagementDay.delete({ where: { id: dayId } });
  revalidatePath("/engagement");
}

async function seedEngagementDays(profileId: string) {
  const today = todayInTimeZone(PAKISTAN_TZ);
  await prisma.engagementDay.createMany({
    data: Array.from({ length: ENGAGEMENT_DAYS }, (_, i) => ({
      profileId,
      dayNumber: i + 1,
      date: addDays(today, i),
      action: ENGAGEMENT_DAY_ACTIONS[i + 1] ?? null,
    })),
  });
}

// Manual add: one business name, one or more platforms each with its own profile URL (checkbox
// `platform_<PLATFORM>` plus text input `url_<PLATFORM>` per platform in SOCIAL_PLATFORMS).
export async function addEngagementProfilesManual(formData: FormData) {
  const businessName = str(formData, "businessName");
  if (!businessName) throw new Error("Business name is required");
  const time = str(formData, "time");

  for (const platform of SOCIAL_PLATFORMS) {
    if (!checked(formData, `platform_${platform}`)) continue;
    const profileUrl = str(formData, `url_${platform}`);
    if (!profileUrl) continue;

    const profile = await prisma.engagementProfile.create({
      data: { businessName, platform, profileUrl, time },
    });
    await seedEngagementDays(profile.id);
  }

  revalidatePath("/engagement");
  redirect("/engagement");
}

// Imports a lead's active outreach channels (INSTAGRAM/FACEBOOK/LINKEDIN with a saved profile URL)
// as engagement profiles, skipping any channel already imported for this lead.
export async function importEngagementFromLead(leadId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  const existing = await prisma.engagementProfile.findMany({
    where: { leadId },
    select: { platform: true },
  });
  const already = new Set(existing.map((p) => p.platform));

  const urlByPlatform: Partial<Record<SocialPlatform, string | null>> = {
    INSTAGRAM: lead.instagram,
    FACEBOOK: lead.facebook,
    LINKEDIN: lead.linkedin,
  };

  let imported = 0;
  for (const platform of lead.channels) {
    if (already.has(platform)) continue;
    const profileUrl = urlByPlatform[platform as SocialPlatform];
    if (!profileUrl) continue;

    const profile = await prisma.engagementProfile.create({
      data: { businessName: lead.businessName, leadId, platform, profileUrl },
    });
    await seedEngagementDays(profile.id);
    imported++;
  }

  revalidatePath("/engagement");
  return { imported };
}

// groupKey identifies "one business" across its platform rows: `lead:<leadId>` for imported
// profiles, `name:<businessName>` for manually-added ones with no linked lead.
function groupWhere(groupKey: string) {
  if (groupKey.startsWith("lead:")) return { leadId: groupKey.slice(5) };
  return { leadId: null, businessName: decodeURIComponent(groupKey.slice(5)) };
}

// Edits one business's platform set: updates URLs/renames on kept platforms, creates + seeds
// newly-checked platforms, deletes unchecked ones (cascades their EngagementDay rows).
export async function updateEngagementBusiness(formData: FormData) {
  const groupKey = str(formData, "groupKey");
  if (!groupKey) throw new Error("Missing groupKey");
  const businessName = str(formData, "businessName");
  if (!businessName) throw new Error("Business name is required");
  const time = str(formData, "time");
  const leadId = groupKey.startsWith("lead:") ? groupKey.slice(5) : null;

  const existing = await prisma.engagementProfile.findMany({ where: groupWhere(groupKey) });
  const existingByPlatform = new Map(existing.map((p) => [p.platform, p]));

  for (const platform of SOCIAL_PLATFORMS) {
    const current = existingByPlatform.get(platform);
    const isChecked = checked(formData, `platform_${platform}`);
    const profileUrl = str(formData, `url_${platform}`);

    if (isChecked && profileUrl) {
      if (current) {
        await prisma.engagementProfile.update({
          where: { id: current.id },
          data: { businessName, profileUrl, time },
        });
      } else {
        const profile = await prisma.engagementProfile.create({
          data: { businessName, leadId, platform, profileUrl, time },
        });
        await seedEngagementDays(profile.id);
      }
    } else if (current) {
      await prisma.engagementProfile.delete({ where: { id: current.id } });
    }
  }

  revalidatePath("/engagement");
  redirect("/engagement");
}

export async function deleteEngagementBusinesses(groupKeys: string[]) {
  for (const groupKey of groupKeys) {
    await prisma.engagementProfile.deleteMany({ where: groupWhere(groupKey) });
  }
  revalidatePath("/engagement");
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
      source: str(formData, "source"),
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

// Logs each selected task as a client update on its own client, so a batch of finished tasks can
// be turned into progress-report entries in one go. Tasks with no client attached are skipped.
export async function addTasksToClientUpdates(ids: string[], date: string) {
  if (ids.length === 0) return { added: 0, skipped: 0 };
  const tasks = await prisma.task.findMany({ where: { id: { in: ids } } });
  const withClient = tasks.filter((t) => t.leadId);

  await prisma.clientUpdate.createMany({
    data: withClient.map((t) => ({
      leadId: t.leadId!,
      date,
      taskName: t.title,
      description: t.description,
    })),
  });

  revalidatePath("/client-updates");
  return { added: withClient.length, skipped: tasks.length - withClient.length };
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

export async function createClientQuestion(leadId: string, formData: FormData): Promise<string> {
  const question = str(formData, "question");
  if (!question) throw new Error("Question is required");

  const created = await prisma.clientQuestion.create({ data: { leadId, question } });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/clients/[id]", "page");
  revalidatePath("/questions");
  return created.id;
}

export async function updateClientQuestion(id: string, leadId: string, question: string, answer: string) {
  const text = question.trim();
  if (!text) throw new Error("Question is required");
  await prisma.clientQuestion.update({ where: { id }, data: { question: text, answer: answer.trim() || null } });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/clients/[id]", "page");
  revalidatePath("/questions");
}

export async function toggleClientQuestionResolved(id: string, leadId: string) {
  const q = await prisma.clientQuestion.findUniqueOrThrow({ where: { id } });
  await prisma.clientQuestion.update({
    where: { id },
    data: { resolvedAt: q.resolvedAt ? null : new Date() },
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/clients/[id]", "page");
  revalidatePath("/questions");
}

export async function updateClientQuestionAnswer(id: string, leadId: string, formData: FormData) {
  await prisma.clientQuestion.update({
    where: { id },
    data: { answer: str(formData, "answer") },
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/clients/[id]", "page");
  revalidatePath("/questions");
}

export async function deleteClientQuestion(id: string, leadId: string) {
  await prisma.clientQuestion.delete({ where: { id } });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/clients/[id]", "page");
  revalidatePath("/questions");
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


export async function bulkUpdateLeadStatus(ids: string[], status: string) {
  if (ids.length === 0) return;
  for (const id of ids) await setOutreachStatus(id, status);
  revalidatePath("/leads");
  revalidatePath("/clients");
  revalidatePath("/leads/[id]", "page");
  revalidatePath("/clients/[id]", "page");
}

export async function bulkDeleteLeads(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.lead.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/leads");
  revalidatePath("/clients");
}

export async function deleteLeadNoRedirect(id: string) {
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/leads");
  revalidatePath("/clients");
}
