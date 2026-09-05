"use client";

import { useTransition } from "react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/constants";
import { updateLeadStatus } from "@/lib/actions";

export default function StatusSelect({ leadId, status }: { leadId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(() => {
          updateLeadStatus(leadId, value);
        });
      }}
      className="rounded-full border border-mist/40 bg-white px-3 py-1.5 text-xs font-semibold text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green disabled:opacity-50"
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>
          {LEAD_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
