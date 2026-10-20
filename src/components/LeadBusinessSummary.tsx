"use client";

import { useState } from "react";

export default function LeadBusinessSummary({
  businessName,
  contactName,
  email,
}: {
  businessName: string;
  contactName: string | null;
  email: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — nothing to fall back to here
    }
  }

  return (
    <div className="rounded-xl border border-mist/30 bg-white/60 p-4 text-sm shadow-sm">
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Business name</dt>
          <dd className="text-ink">{businessName}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Contact name</dt>
          <dd className="text-ink">{contactName || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Email</dt>
          <dd className="flex items-center gap-2 text-ink">
            <span className="truncate">{email || "—"}</span>
            {email && (
              <button
                type="button"
                onClick={copyEmail}
                title="Copy to clipboard"
                className="shrink-0 rounded-md border border-mist/40 px-1.5 py-0.5 text-xs text-slate transition hover:bg-mist/10"
              >
                {copied ? "✓" : "⧉"}
              </button>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
