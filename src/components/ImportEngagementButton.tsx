"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { importEngagementFromLead } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";

export default function ImportEngagementButton({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();
  const notify = useToast();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const { imported } = await importEngagementFromLead(leadId);
            notify(imported > 0 ? `Imported ${imported} profile${imported === 1 ? "" : "s"}` : "Already up to date");
            router.refresh();
          } catch {
            notify("Something went wrong");
          }
        })
      }
      className="shrink-0 rounded-lg border border-green/50 px-3 py-1.5 text-xs font-semibold text-green transition hover:bg-green/10 disabled:opacity-50"
    >
      Import
    </button>
  );
}
