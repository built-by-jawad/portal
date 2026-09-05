"use client";

import { useEffect, useState, useTransition } from "react";
import { emailStepLabel, TIMEZONES } from "@/lib/constants";
import {
  markEmailSent,
  unmarkEmailSent,
  updateEmailStep,
  addFollowup,
  removeEmailStep,
  sendEmailNow,
} from "@/lib/actions";

type StepRecord = {
  id: string;
  order: number;
  hasSubject: boolean;
  subject: string;
  body: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  scheduledTimezone: string | null;
  sentAt: Date | null;
  openedAt: Date | null;
  openCount: number;
};

export default function EmailSteps({
  leadId,
  leadEmail,
  googleConnected,
  records,
}: {
  leadId: string;
  leadEmail: string | null;
  googleConnected: boolean;
  records: StepRecord[];
}) {
  const sorted = [...records].sort((a, b) => a.order - b.order);
  const [activeId, setActiveId] = useState<string | undefined>(sorted[0]?.id);
  const [isPending, startTransition] = useTransition();
  const [sendError, setSendError] = useState<string | null>(null);

  const current = sorted.find((r) => r.id === activeId) ?? sorted[0];
  const [subjectEnabled, setSubjectEnabled] = useState(current?.hasSubject ?? true);

  useEffect(() => {
    setSubjectEnabled(current?.hasSubject ?? true);
    setSendError(null);
  }, [current?.id, current?.hasSubject]);

  function handleSend() {
    setSendError(null);
    startTransition(async () => {
      try {
        await sendEmailNow(leadId, current.id);
      } catch (err) {
        setSendError(err instanceof Error ? err.message : "Failed to send email");
      }
    });
  }

  return (
    <div className="rounded-xl border border-mist/30 bg-white/60 shadow-sm">
      <div className="flex flex-wrap items-center gap-1 border-b border-mist/20 p-2">
        {sorted.map((rec) => (
          <button
            key={rec.id}
            onClick={() => setActiveId(rec.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              current?.id === rec.id
                ? "bg-ink text-paper"
                : "text-slate hover:bg-mist/15"
            }`}
          >
            {emailStepLabel(rec.order)}
            {rec.sentAt && <span className="text-green">✓</span>}
          </button>
        ))}
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await addFollowup(leadId);
            })
          }
          className="flex items-center gap-1 rounded-lg border border-dashed border-mist/50 px-3 py-2 text-xs font-semibold text-slate transition hover:border-green hover:text-green disabled:opacity-50"
        >
          + Add follow-up
        </button>
      </div>

      {current && (
        <div className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {current.sentAt ? (
                <p className="text-xs font-medium text-green">
                  Sent {new Date(current.sentAt).toLocaleString()}
                </p>
              ) : (
                <p className="text-xs font-medium text-slate">Not sent yet</p>
              )}
              {current.sentAt && (
                <p className="mt-0.5 text-xs font-medium text-slate">
                  {current.openCount > 0 ? (
                    <span className="text-green">
                      Opened {current.openCount > 1 ? `${current.openCount}×` : ""}
                      {current.openedAt ? ` · last ${new Date(current.openedAt).toLocaleString()}` : ""}
                    </span>
                  ) : (
                    "Not opened yet"
                  )}
                </p>
              )}
              {(current.scheduledDate || current.scheduledTime) && (
                <p className="mt-0.5 text-xs text-slate">
                  Scheduled {current.scheduledDate || "—"} {current.scheduledTime || ""}
                  {current.scheduledTimezone ? ` (${current.scheduledTimezone})` : ""}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!current.sentAt && googleConnected && leadEmail && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSend}
                  className="rounded-lg bg-green px-3 py-1.5 text-xs font-semibold text-paper transition hover:brightness-95 disabled:opacity-50"
                >
                  Send via Gmail
                </button>
              )}
              {current.sentAt ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(() => unmarkEmailSent(leadId, current.id))}
                  className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10 disabled:opacity-50"
                >
                  Unmark sent
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(() => markEmailSent(leadId, current.id))}
                  className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10 disabled:opacity-50"
                >
                  Mark as sent manually
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
                      startTransition(() => removeEmailStep(leadId, current.id));
                    }
                  }}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {sendError && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {sendError}
            </p>
          )}
          {!googleConnected && (
            <p className="mb-4 text-xs text-slate">
              Connect Gmail in <a href="/settings" className="font-semibold text-green hover:underline">Settings</a> to send from here.
            </p>
          )}
          {googleConnected && !leadEmail && (
            <p className="mb-4 text-xs text-slate">Add an email address to this lead to send via Gmail.</p>
          )}

          <form
            key={current.id}
            action={(formData) => updateEmailStep(current.id, formData)}
            className="space-y-3"
          >
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
                This email will reply in the same thread as the previous one, with no new subject.
              </p>
            )}
            {subjectEnabled && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Subject</label>
                <input
                  name="subject"
                  defaultValue={current.subject}
                  className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Body</label>
              <textarea
                name="body"
                rows={12}
                defaultValue={current.body}
                className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Send date</label>
                <input
                  type="date"
                  name="scheduledDate"
                  defaultValue={current.scheduledDate ?? ""}
                  className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Send time</label>
                <input
                  type="time"
                  name="scheduledTime"
                  defaultValue={current.scheduledTime ?? ""}
                  className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Timezone</label>
                <select
                  name="scheduledTimezone"
                  defaultValue={current.scheduledTimezone ?? ""}
                  className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
                >
                  <option value="">Auto-detect from address</option>
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:brightness-110"
            >
              Save
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
