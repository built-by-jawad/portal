"use client";

import { useTransition } from "react";
import { deleteEngagementProfile } from "@/lib/actions";

export default function DeleteEngagementProfileButton({ profileId }: { profileId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Remove this profile and all its engagement days?")) return;
        startTransition(() => deleteEngagementProfile(profileId));
      }}
      className="shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
    >
      Remove
    </button>
  );
}
