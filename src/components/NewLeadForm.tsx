"use client";

import LeadFieldsSection from "@/components/LeadFieldsSection";
import NewLeadEmailsBuilder from "@/components/NewLeadEmailsBuilder";
import { createLead } from "@/lib/actions";

export default function NewLeadForm() {
  return (
    <form action={createLead} className="space-y-6">
      <LeadFieldsSection />

      <div>
        <h2 className="font-display mb-4 text-lg font-bold text-ink">Emails</h2>
        <NewLeadEmailsBuilder />
        <p className="mt-2 text-xs text-slate">
          Attachments can be added per email once the lead is saved, from its detail page.
        </p>
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
      >
        Add Lead
      </button>
    </form>
  );
}
