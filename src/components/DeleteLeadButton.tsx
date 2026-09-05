"use client";

import { useTransition } from "react";
import { deleteLead } from "@/lib/actions";

export default function DeleteLeadButton({ leadId }: { leadId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Delete this lead and all its email drafts? This can't be undone.")) {
          startTransition(() => deleteLead(leadId));
        }
      }}
      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      Delete lead
    </button>
  );
}
