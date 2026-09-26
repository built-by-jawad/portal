"use client";

import { useState, useTransition } from "react";
import { OUTREACH_STATUSES, OUTREACH_STATUS_LABELS, CLOSED_STATUSES, type OutreachStatus } from "@/lib/outreach";
import { setOutreachStatus } from "@/lib/outreachActions";

export default function OutreachStatusSelect({ leadId, status, stopReason }: { leadId: string; status: string; stopReason: string | null }) {
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState(status);
  const [reason, setReason] = useState(stopReason ?? "");
  const closed = CLOSED_STATUSES.includes(current as OutreachStatus);

  const save = (s: string, r: string) => start(async () => { await setOutreachStatus(leadId, s, r); });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={current}
        disabled={pending}
        onChange={(e) => { setCurrent(e.target.value); if (!CLOSED_STATUSES.includes(e.target.value as OutreachStatus)) save(e.target.value, ""); else save(e.target.value, reason); }}
        className="rounded-full border border-mist/40 bg-white px-3 py-1.5 text-xs font-semibold text-ink"
      >
        {OUTREACH_STATUSES.map((s) => (
          <option key={s} value={s}>{OUTREACH_STATUS_LABELS[s]}</option>
        ))}
      </select>
      {closed && (
        <input
          value={reason}
          placeholder="Stop reason"
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => save(current, reason)}
          className="rounded-full border border-mist/40 bg-white px-3 py-1.5 text-xs text-ink"
        />
      )}
    </div>
  );
}
