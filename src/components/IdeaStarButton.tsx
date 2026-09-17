"use client";

import { useTransition } from "react";
import { toggleIdeaStarred } from "@/lib/actions";

export default function IdeaStarButton({
  ideaId,
  starred,
  className,
}: {
  ideaId: string;
  starred: boolean;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        startTransition(() => toggleIdeaStarred(ideaId));
      }}
      aria-label={starred ? "Unstar" : "Star"}
      className={`text-lg leading-none transition ${starred ? "text-yellow-500" : "text-mist/50 hover:text-yellow-500"} ${className ?? ""}`}
    >
      ★
    </button>
  );
}
