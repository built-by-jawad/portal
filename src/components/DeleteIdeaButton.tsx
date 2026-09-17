"use client";

import { useTransition } from "react";
import { deleteIdea } from "@/lib/actions";

export default function DeleteIdeaButton({ ideaId }: { ideaId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Delete this idea? This can't be undone.")) {
          startTransition(() => deleteIdea(ideaId));
        }
      }}
      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      Delete
    </button>
  );
}
