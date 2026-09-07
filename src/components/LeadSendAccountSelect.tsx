"use client";

import { useTransition } from "react";
import { updateLeadSendAccount } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";

type Account = { id: string; email: string; isDefault: boolean };

export default function LeadSendAccountSelect({
  leadId,
  accounts,
  value,
}: {
  leadId: string;
  accounts: Account[];
  value: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const notify = useToast();
  if (accounts.length === 0) return null;

  return (
    <label className="flex items-center gap-2 text-xs font-medium text-slate">
      Send from
      <select
        defaultValue={value ?? ""}
        disabled={isPending}
        onChange={(e) =>
          startTransition(async () => {
            await updateLeadSendAccount(leadId, e.target.value);
            notify("Saved");
          })
        }
        className="rounded-lg border border-mist/40 bg-white px-2 py-1.5 text-xs text-ink focus:border-green focus:outline-none"
      >
        <option value="">Default account</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.email}
          </option>
        ))}
      </select>
    </label>
  );
}
