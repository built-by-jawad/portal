"use client";

import { useTransition } from "react";
import { deleteExpense } from "@/lib/expenseActions";

export default function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Delete this expense?")) {
          startTransition(() => deleteExpense(expenseId));
        }
      }}
      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      Delete
    </button>
  );
}
