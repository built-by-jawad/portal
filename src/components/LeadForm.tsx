"use client";

import type { Lead } from "@prisma/client";
import LeadFieldsSection from "@/components/LeadFieldsSection";
import { useToast } from "@/components/ToastProvider";

export default function LeadForm({
  action,
  lead,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  lead?: Lead;
  submitLabel: string;
}) {
  const notify = useToast();

  async function handleSubmit(formData: FormData) {
    await action(formData);
    notify("Saved");
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <LeadFieldsSection lead={lead} />

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
      >
        {submitLabel}
      </button>
    </form>
  );
}
