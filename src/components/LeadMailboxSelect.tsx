"use client";

import { useTransition } from "react";
import { updateLeadMailbox } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";

type Mailbox = { id: string; label: string; email: string };

export default function LeadMailboxSelect({
  leadId,
  mailboxes,
  value,
}: {
  leadId: string;
  mailboxes: Mailbox[];
  value: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const notify = useToast();

  return (
    <label className="flex items-center gap-2 text-xs font-medium text-slate">
      Sent from
      <select
        defaultValue={value ?? ""}
        disabled={isPending}
        onChange={(e) =>
          startTransition(async () => {
            await updateLeadMailbox(leadId, e.target.value);
            notify("Saved");
          })
        }
        className="rounded-lg border border-mist/40 bg-white px-2 py-1.5 text-xs text-ink focus:border-green focus:outline-none"
      >
        <option value="">Unassigned</option>
        {mailboxes.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} ({m.email})
          </option>
        ))}
      </select>
    </label>
  );
}
