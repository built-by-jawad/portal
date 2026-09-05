"use client";

import { useState } from "react";
import { emailStepLabel, TIMEZONES } from "@/lib/constants";

type DraftEmail = {
  subject: string;
  body: string;
  scheduledDate: string;
  scheduledTime: string;
  scheduledTimezone: string;
};

const EMPTY_EMAIL: DraftEmail = {
  subject: "",
  body: "",
  scheduledDate: "",
  scheduledTime: "",
  scheduledTimezone: "",
};

export default function NewLeadEmailsBuilder() {
  const [emails, setEmails] = useState<DraftEmail[]>([{ ...EMPTY_EMAIL }]);
  const [active, setActive] = useState(0);

  function updateActive(patch: Partial<DraftEmail>) {
    setEmails((prev) => prev.map((e, i) => (i === active ? { ...e, ...patch } : e)));
  }

  function addFollowup() {
    setEmails((prev) => [...prev, { ...EMPTY_EMAIL }]);
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
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Subject</label>
            <input
              value={current.subject}
              onChange={(e) => updateActive({ subject: e.target.value })}
              className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Body</label>
            <textarea
              value={current.body}
              onChange={(e) => updateActive({ body: e.target.value })}
              rows={8}
              className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
            />
          </div>
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
                <option value="">Select...</option>
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
