"use client";

import { useTransition } from "react";
import { checkRepliesForLead } from "@/lib/actions";

export default function CheckRepliesButton({ leadId }: { leadId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => checkRepliesForLead(leadId))}
      className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10 disabled:opacity-50"
    >
      {isPending ? "Checking…" : "Check for replies"}
    </button>
  );
}
