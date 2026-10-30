"use client";

import { useState } from "react";

// Extra Instagram links for a lead beyond the primary "Instagram" field — some leads run more
// than one account. All inputs share the name "secondaryInstagrams" so the server action can
// read them via formData.getAll("secondaryInstagrams"). Same pattern as SecondaryEmailsField.
export default function SecondaryInstagramsField({ initial }: { initial: string[] }) {
  const [links, setLinks] = useState<string[]>(initial);
  const [addAnother, setAddAnother] = useState(initial.length > 0);

  return (
    <div className="sm:col-span-2">
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={addAnother}
          onChange={(e) => {
            setAddAnother(e.target.checked);
            if (e.target.checked && links.length === 0) setLinks([""]);
            if (!e.target.checked) setLinks([]);
          }}
        />
        Add another Instagram?
      </label>

      {addAnother && (
        <div className="mt-2 space-y-2">
          {links.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                name="secondaryInstagrams"
                defaultValue={value}
                placeholder="Profile link or handle"
                className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
              />
              <button
                type="button"
                onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label="Remove Instagram link"
                className="shrink-0 rounded-lg border border-red-300 px-2.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLinks((prev) => [...prev, ""])}
            className="flex items-center gap-1 rounded-lg border border-dashed border-mist/50 px-3 py-1.5 text-xs font-semibold text-slate transition hover:border-green hover:text-green"
          >
            + Add Instagram
          </button>
        </div>
      )}
    </div>
  );
}
