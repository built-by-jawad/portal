"use client";

import { useState, useTransition } from "react";
import { updateLeadLoomVideo } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";

export default function LeadLoomVideo({
  leadId,
  wantsLoomVideo,
  loomVideoScript,
}: {
  leadId: string;
  wantsLoomVideo: boolean;
  loomVideoScript: string | null;
}) {
  const [enabled, setEnabled] = useState(wantsLoomVideo);
  const [script, setScript] = useState(loomVideoScript ?? "");
  const [isPending, startTransition] = useTransition();
  const notify = useToast();

  const toggle = (next: boolean) => {
    setEnabled(next);
    startTransition(async () => {
      await updateLeadLoomVideo(leadId, next, script);
      notify("Saved");
    });
  };

  const saveScript = () => {
    startTransition(async () => {
      await updateLeadLoomVideo(leadId, enabled, script);
      notify("Saved");
    });
  };

  return (
    <div className="mb-6 rounded-lg border border-mist/30 p-4">
      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={enabled}
          disabled={isPending}
          onChange={(e) => toggle(e.target.checked)}
          className="h-4 w-4 accent-green"
        />
        Do you want to send a Loom video?
      </label>

      {enabled && (
        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium text-ink">Loom video script</label>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            onBlur={saveScript}
            rows={6}
            placeholder="Write the script for this lead's Loom video..."
            className="w-full rounded-md border border-mist/40 bg-transparent px-3 py-2 text-sm outline-none focus:border-green"
          />
        </div>
      )}
    </div>
  );
}
