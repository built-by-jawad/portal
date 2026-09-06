"use client";

import { useState } from "react";
import { emailStepLabel, TIMEZONES } from "@/lib/constants";

type DraftEmail = {
  hasSubject: boolean;
  subject: string;
  body: string;
  threadMode: "THREAD" | "SEPARATE";
  condition: "ALWAYS" | "IF_REPLIED" | "IF_NOT_REPLIED";
  scheduledDate: string;
  scheduledTime: string;
  scheduledTimezone: string;
};

const INITIAL_EMAIL: DraftEmail = {
  hasSubject: true,
  subject: "",
  body: "",
  threadMode: "THREAD",
  condition: "ALWAYS",
  scheduledDate: "",
  scheduledTime: "",
  scheduledTimezone: "",
};

const FOLLOWUP_EMAIL: DraftEmail = {
  ...INITIAL_EMAIL,
  hasSubject: false,
};

export default function NewLeadEmailsBuilder() {
  const [emails, setEmails] = useState<DraftEmail[]>([{ ...INITIAL_EMAIL }]);
  const [active, setActive] = useState(0);

  function updateActive(patch: Partial<DraftEmail>) {
    setEmails((prev) => prev.map((e, i) => (i === active ? { ...e, ...patch } : e)));
  }

  function addFollowup() {
    setEmails((prev) => [...prev, { ...FOLLOWUP_EMAIL }]);
    setActive(emails.length);
  }

  function removeAt(index: number) {
    setEmails((prev) => prev.filter((_, i) => i !== index));
    setActive((prevActive) => {
      if (index < prevActive) return prevActive - 1;
      if (index === prevActive) return Math.max(0, index - 1);
      return prevActive;
    });
  }

  const current = emails[active];

  return (
    <div className="rounded-xl border border-mist/30 bg-white/60 shadow-sm">
      <input type="hidden" name="emailsJson" value={JSON.stringify(emails)} />

      <div className="flex flex-wrap items-center gap-1 border-b border-mist/20 p-2">
        {emails.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              active === i ? "bg-ink text-paper" : "text-slate hover:bg-mist/15"
            }`}
          >
            {emailStepLabel(i)}
          </button>
        ))}
        <button
          type="button"
          onClick={addFollowup}
          className="flex items-center gap-1 rounded-lg border border-dashed border-mist/50 px-3 py-2 text-xs font-semibold text-slate transition hover:border-green hover:text-green"
        >
          + Add follow-up
        </button>
      </div>

      <div className="p-4 sm:p-6">
        {emails.length > 1 && (
          <div className="mb-4 flex justify-end">
            {active > 0 && (
              <button
                type="button"
                onClick={() => removeAt(active)}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                Remove {emailStepLabel(active)}
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={current.hasSubject}
              onChange={(e) => updateActive({ hasSubject: e.target.checked })}
              className="h-4 w-4 rounded border-mist/40 accent-green"
            />
            Include a subject line
          </label>
          {!current.hasSubject && (
            <p className="text-xs text-slate">
              This email will reply in the same thread as the previous one, with no new subject.
            </p>
          )}

          {current.hasSubject && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Subject</label>
              <input
                value={current.subject}
                onChange={(e) => updateActive({ subject: e.target.value })}
                className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Body</label>
            <textarea
              value={current.body}
              onChange={(e) => updateActive({ body: e.target.value })}
              rows={8}
              className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
            />
          </div>
          {active > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Send as</label>
                <select
                  value={current.threadMode}
                  onChange={(e) =>
                    updateActive({ threadMode: e.target.value as DraftEmail["threadMode"] })
                  }
                  className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
                >
                  <option value="THREAD">Reply in the same thread as the previous email</option>
                  <option value="SEPARATE">Send as a separate, new email</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Only send if…</label>
                <select
                  value={current.condition}
                  onChange={(e) =>
                    updateActive({ condition: e.target.value as DraftEmail["condition"] })
                  }
                  className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
                >
                  <option value="ALWAYS">Always send this step</option>
                  <option value="IF_REPLIED">Lead replied to the previous email</option>
                  <option value="IF_NOT_REPLIED">Lead did NOT reply to the previous email</option>
                </select>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Send date</label>
              <input
                type="date"
                value={current.scheduledDate}
                onChange={(e) => updateActive({ scheduledDate: e.target.value })}
                className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Send time</label>
              <input
                type="time"
                value={current.scheduledTime}
                onChange={(e) => updateActive({ scheduledTime: e.target.value })}
                className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Timezone</label>
              <select
                value={current.scheduledTimezone}
                onChange={(e) => updateActive({ scheduledTimezone: e.target.value })}
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
        </div>
      </div>
    </div>
  );
}
