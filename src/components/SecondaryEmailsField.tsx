"use client";

import { useState } from "react";

// Extra email inputs for a lead beyond the primary "Email" field, added/removed with a +/× just
// like the follow-up tabs elsewhere. All inputs share the name "secondaryEmails" so the server
// action can read them all via formData.getAll("secondaryEmails").
export default function SecondaryEmailsField({ initial }: { initial: string[] }) {
  const [emails, setEmails] = useState<string[]>(initial.length > 0 ? initial : []);

  return (
    <div className="sm:col-span-2">
      <label className="mb-1.5 block text-sm font-medium text-ink">
        Additional email addresses
      </label>
      <div className="space-y-2">
        {emails.map((value, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="email"
              name="secondaryEmails"
              defaultValue={value}
              className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
            />
            <button
              type="button"
              onClick={() => setEmails((prev) => prev.filter((_, idx) => idx !== i))}
              aria-label="Remove email"
              className="shrink-0 rounded-lg border border-red-300 px-2.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setEmails((prev) => [...prev, ""])}
        className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-mist/50 px-3 py-1.5 text-xs font-semibold text-slate transition hover:border-green hover:text-green"
      >
        + Add email
      </button>
    </div>
  );
}
