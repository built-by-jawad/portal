"use client";

import { useTransition } from "react";
import { bulkSetEngagement } from "@/lib/actions";

export default function LeadEngagementToggle({ leadId, isEngaged }: { leadId: string; isEngaged: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => bulkSetEngagement([leadId], !isEngaged))}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
        isEngaged
          ? "border-pink-300 bg-pink-100 text-pink-700 hover:bg-pink-200"
          : "border-mist/40 text-ink hover:bg-mist/10"
      }`}
    >
      {isEngaged ? "✓ On Engagement" : "Add to Engagement"}
    </button>
  );
}
