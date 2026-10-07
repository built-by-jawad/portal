"use client";

import { useTransition } from "react";
import { deleteProfile } from "@/lib/profileActions";

export default function DeleteProfileButton({ profileId }: { profileId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Delete this profile? They'll lose access immediately.")) {
          startTransition(() => deleteProfile(profileId));
        }
      }}
      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      Delete
    </button>
  );
}
