"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Lead } from "@prisma/client";
import LeadFieldsSection from "@/components/LeadFieldsSection";
import AttachmentsUploader from "@/components/AttachmentsUploader";
import { useToast } from "@/components/ToastProvider";
import { emailStepLabel } from "@/lib/constants";
import { updateLead, updateEmailStep, addFollowup, removeEmailStep, sendEmailStepManually } from "@/lib/actions";

type Attachment = { id: string; filename: string; url: string; size: number };

type StepRecord = {
  id: string;
  order: number;
  hasSubject: boolean;
  subject: string;
  body: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  scheduledTimezone: string | null;
  status: string;
  messageId: string | null;
  attachments: Attachment[];
};

type DraftFields = {
  hasSubject: boolean;
  subject: string;
  body: string;
};

// Business details and the email sequence used to have two separate Save buttons — one native
// <form> each. They're combined here into a single <form> with one Save button: business fields
// and the currently active email tab's fields share one FormData on submit (their field names
// never collide), and any OTHER tab you edited but didn't switch back to is saved too from a
// drafts map kept in memory (see the comment on `drafts` below). Sending/marking-sent/removing a
// step stay as their own immediate actions since those aren't simple field edits.
export default function LeadWorkspace({
  lead,
  leadId,
  records,
  isClient = false,
  showFields = true,
}: {
  lead: Lead;
  leadId: string;
  records: StepRecord[];
  isClient?: boolean;
  showFields?: boolean;
}) {
  const sorted = [...records].sort((a, b) => a.order - b.order);
  const [activeId, setActiveId] = useState<string | undefined>(sorted[0]?.id);
  const [isPending, startTransition] = useTransition();
  const notify = useToast();

  // Unsaved edits for email tabs other than the one currently open, keyed by record id. Switching
  // tabs (or adding a follow-up) snapshots the tab you're leaving into this map so its text isn't
  // lost; the single Save button below flushes the active tab (straight from the form) plus every
  // entry still sitting in this map.
  const [drafts, setDrafts] = useState<Record<string, DraftFields>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const current = sorted.find((r) => r.id === activeId) ?? sorted[0];
  const draft = current ? drafts[current.id] : undefined;
  const [subjectEnabled, setSubjectEnabled] = useState(draft?.hasSubject ?? current?.hasSubject ?? true);
  const [attachmentsEnabled, setAttachmentsEnabled] = useState(
    (current?.attachments.length ?? 0) > 0
  );

  useEffect(() => {
    const d = current ? drafts[current.id] : undefined;
    setSubjectEnabled(d?.hasSubject ?? current?.hasSubject ?? true);
    setAttachmentsEnabled((current?.attachments.length ?? 0) > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Reads the email-tab fields out of the shared form (the lead fields live in the same form but
  // have different names, so this is just the subset relevant to the current tab) and stashes them
  // for the given record id.
  function captureDraft() {
    if (!current || !formRef.current) return;
    const fd = new FormData(formRef.current);
    setDrafts((prev) => ({
      ...prev,
      [current.id]: {
        hasSubject: subjectEnabled,
        subject: fd.get("subject")?.toString() ?? "",
        body: fd.get("body")?.toString() ?? "",
      },
    }));
  }

  function switchTab(id: string) {
    captureDraft();
    setActiveId(id);
  }

  function handleSaveAll(formData: FormData) {
    startTransition(async () => {
      if (showFields) await updateLead(leadId, formData);

      if (current && !isClient) {
        await updateEmailStep(current.id, formData);
      }

      const otherDraftIds = Object.keys(drafts).filter((id) => id !== current?.id);
      for (const id of otherDraftIds) {
        const d = drafts[id];
        const fd = new FormData();
        if (d.hasSubject) fd.set("hasSubject", "on");
        fd.set("subject", d.subject);
        fd.set("body", d.body);
        await updateEmailStep(id, fd);
      }

      setDrafts({});
      notify("Saved");
    });
  }

  return (
    <form ref={formRef} action={handleSaveAll} className="space-y-6">
      {!isClient && (
      <div>
        <h2 className="font-display mb-4 text-lg font-bold text-ink">Emails</h2>
        <div className="rounded-xl border border-mist/30 bg-white/60 shadow-sm">
          <div className="flex flex-wrap items-center gap-1 border-b border-mist/20 p-2">
            {sorted.map((rec) => (
              <button
                key={rec.id}
                type="button"
                onClick={() => switchTab(rec.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  current?.id === rec.id ? "bg-ink text-paper" : "text-slate hover:bg-mist/15"
                }`}
              >
                {emailStepLabel(rec.order)}
                {drafts[rec.id] && (
                  <span title="Unsaved changes" className="text-amber-500">●</span>
                )}
              </button>
            ))}
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                captureDraft();
                startTransition(async () => {
                  await addFollowup(leadId);
                  notify("Follow-up added");
                });
              }}
              className="flex items-center gap-1 rounded-lg border border-dashed border-mist/50 px-3 py-2 text-xs font-semibold text-slate transition hover:border-green hover:text-green disabled:opacity-50"
            >
              + Add follow-up
            </button>
          </div>

          {current && (
            <div className="p-4 sm:p-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {(current.scheduledDate || current.scheduledTime) && (
                    <p className="text-xs font-medium text-slate">
                      Planned for {current.scheduledDate || "—"} {current.scheduledTime || ""}
                      {current.scheduledTimezone ? ` (${current.scheduledTimezone})` : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!isClient && current.status !== "SENT" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        const isFollowup = current.order > 0;
                        const question = isFollowup
                          ? `Send ${emailStepLabel(current.order)} manually right now, in the same thread as the initial email?`
                          : `Send ${emailStepLabel(current.order)} manually right now?`;
                        if (!confirm(question)) return;
                        startTransition(async () => {
                          const result = await sendEmailStepManually(current.id);
                          if (result.ok) {
                            notify("Sent");
                          } else {
                            notify(`Send failed: ${result.error}`);
                          }
                        });
                      }}
                      className="rounded-lg border border-green/40 px-3 py-1.5 text-xs font-semibold text-green transition hover:bg-green/10 disabled:opacity-50"
                    >
                      Send manually
                    </button>
                  )}
                  {current.order > 0 && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (confirm(`Remove ${emailStepLabel(current.order)}?`)) {
                          const remaining = sorted.filter((r) => r.id !== current.id);
                          setActiveId(remaining[remaining.length - 1]?.id);
                          startTransition(async () => {
                            await removeEmailStep(leadId, current.id);
                            notify("Removed");
                          });
                        }
                      }}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div key={current.id} className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    name="hasSubject"
                    checked={subjectEnabled}
                    onChange={(e) => setSubjectEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-mist/40 accent-green"
                  />
                  Include a subject line
                </label>
                {!subjectEnabled && (
                  <p className="text-xs text-slate">
                    This email will use a &quot;Re:&quot; subject with no new line of its own.
                  </p>
                )}
                {subjectEnabled && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Subject</label>
                    <input
                      name="subject"
                      defaultValue={draft?.subject ?? current.subject}
                      className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">Body</label>
                  <textarea
                    name="body"
                    rows={12}
                    defaultValue={draft?.body ?? current.body}
                    className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={attachmentsEnabled}
                      onChange={(e) => setAttachmentsEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-mist/40 accent-green"
                    />
                    Attach files to this email
                  </label>
                  {attachmentsEnabled && (
                    <div className="mt-2">
                      <AttachmentsUploader
                        leadId={leadId}
                        recordId={current.id}
                        attachments={current.attachments}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">Thread ID</label>
                  <input
                    type="text"
                    readOnly
                    value={
                      current.messageId ??
                      (current.order > 0
                        ? "Will match the initial email's thread once that email sends"
                        : "Saved automatically once this email sends")
                    }
                    className="w-full rounded-lg border border-mist/40 bg-mist/10 px-3 py-2.5 text-sm text-slate focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {showFields && (
        <div>
          <h2 className="font-display mb-4 text-lg font-bold text-ink">Business details</h2>
          <LeadFieldsSection lead={lead} isClient={isClient} />
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95 disabled:opacity-50"
      >
        Save changes
      </button>
    </form>
  );
}
