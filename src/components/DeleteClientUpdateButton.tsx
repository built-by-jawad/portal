"use client";

import { useTransition } from "react";
import { deleteClientUpdate } from "@/lib/actions";

export default function DeleteClientUpdateButton({ id, taskName }: { id: string; taskName: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Delete "${taskName}"? This removes its screenshots too.`)) return;
        startTransition(() => deleteClientUpdate(id));
      }}
      className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
    >
      Delete
    </button>
  );
}
