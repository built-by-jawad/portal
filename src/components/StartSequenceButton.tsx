"use client";

import { useTransition } from "react";
import { startLeadSequence } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";

export default function StartSequenceButton({ leadId }: { leadId: string }) {
  const [isPending, startTransition] = useTransition();
  const notify = useToast();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await startLeadSequence(leadId);
            notify("Sequence started");
          } catch (err) {
            notify(err instanceof Error ? err.message : "Could not start sequence");
          }
        })
      }
      className="rounded-lg bg-green px-3 py-1.5 text-xs font-semibold text-paper transition hover:brightness-95 disabled:opacity-50"
    >
      Start sequence
    </button>
  );
}
