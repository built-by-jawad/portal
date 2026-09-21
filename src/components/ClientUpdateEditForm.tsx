"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { updateClientUpdate } from "@/lib/actions";

export default function ClientUpdateEditForm({
  id,
  date,
  taskName,
  description,
  proofLink,
}: {
  id: string;
  date: string;
  taskName: string;
  description: string;
  proofLink: string;
}) {
  const [isPending, startTransition] = useTransition();
  const notify = useToast();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateClientUpdate(id, formData);
      notify("Saved");
      router.push("/client-updates");
    });
  }

  return (
    <form action={handleSubmit} className="mb-10 space-y-4 rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Date</label>
        <input
          type="date"
          name="date"
          defaultValue={date}
          className="w-full max-w-xs rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Task name</label>
        <input
          name="taskName"
          required
          defaultValue={taskName}
          className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Description</label>
        <textarea
          name="description"
          rows={4}
          defaultValue={description}
          className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Proof link (optional)</label>
        <input
          type="url"
          name="proofLink"
          defaultValue={proofLink}
          placeholder="https://…"
          className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
