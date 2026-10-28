"use client";

import { useState } from "react";
import { TRADE_LABELS } from "@/lib/constants";
import { CHANNEL_LABELS } from "@/lib/outreach";

type CopyableLead = {
  businessName: string;
  contactName: string | null;
  email: string | null;
  secondaryEmails: string[];
  phone: string | null;
  website: string | null;
  trade: string;
  address: string | null;
  city: string | null;
  state: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  channels: string[];
  leakNotes: string | null;
  notes: string | null;
};

// Everything about the business EXCEPT the Loom video script (that's per-outreach, not a business
// detail) — one "Label: value" per row so pasting anywhere (email, notes app, chat) stays readable.
function formatLeadForCopy(lead: CopyableLead): string {
  const rows: [string, string][] = [
    ["Business name", lead.businessName],
    ["Contact name", lead.contactName || "—"],
    ["Email", lead.email || "—"],
    ["Secondary emails", lead.secondaryEmails.length ? lead.secondaryEmails.join(", ") : "—"],
    ["Phone", lead.phone || "—"],
    ["Website", lead.website || "—"],
    ["Trade", TRADE_LABELS[lead.trade as keyof typeof TRADE_LABELS] ?? lead.trade],
    ["Address", lead.address || "—"],
    ["City", lead.city || "—"],
    ["State", lead.state || "—"],
    ["Instagram", lead.instagram || "—"],
    ["Facebook", lead.facebook || "—"],
    ["LinkedIn", lead.linkedin || "—"],
    [
      "Channels",
      lead.channels.length
        ? lead.channels.map((c) => CHANNEL_LABELS[c as keyof typeof CHANNEL_LABELS] ?? c).join(", ")
        : "—",
    ],
    ["Leak spotted", lead.leakNotes || "—"],
    ["Notes", lead.notes || "—"],
  ];

  return rows.map(([label, value]) => `${label}: ${value}`).join("\n");
}

export default function LeadCopyDetails({ lead }: { lead: CopyableLead }) {
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(formatLeadForCopy(lead));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — nothing to fall back to here
    }
  }

  return (
    <button
      type="button"
      onClick={copyAll}
      className="text-sm font-semibold text-slate hover:underline"
    >
      {copied ? "✓ Copied" : "Copy all details"}
    </button>
  );
}
