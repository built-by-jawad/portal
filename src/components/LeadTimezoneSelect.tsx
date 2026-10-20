"use client";

import { useTransition } from "react";
import { updateLeadTimezone } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";
import { TIMEZONES } from "@/lib/constants";

export default function LeadTimezoneSelect({
  leadId,
  value,
}: {
  leadId: string;
  value: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const notify = useToast();

  return (
    <label className="flex items-center gap-2 text-xs font-medium text-slate">
      Timezone
      <select
        defaultValue={value ?? ""}
        disabled={isPending}
        onChange={(e) =>
          startTransition(async () => {
            await updateLeadTimezone(leadId, e.target.value);
            notify("Saved");
          })
        }
        className="rounded-lg border border-mist/40 bg-white px-2 py-1.5 text-xs text-ink focus:border-green focus:outline-none"
      >
        <option value="">Auto-detect from address</option>
        {TIMEZONES.map((tz) => (
          <option key={tz.value} value={tz.value}>
            {tz.label}
          </option>
        ))}
      </select>
    </label>
  );
}
