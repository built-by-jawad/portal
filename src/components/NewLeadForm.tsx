"use client";

import LeadFieldsSection from "@/components/LeadFieldsSection";
import NewLeadEmailsBuilder from "@/components/NewLeadEmailsBuilder";
import { createLead } from "@/lib/actions";

type Account = { id: string; email: string; isDefault: boolean };

export default function NewLeadForm({ accounts }: { accounts: Account[] }) {
  return (
    <form action={createLead} className="space-y-6">
      <LeadFieldsSection />

      {accounts.length > 0 && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Send emails from</label>
          <select
            name="sendAccountId"
            defaultValue=""
            className="w-full max-w-sm rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
          >
            <option value="">Default account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.email}
              </option>
            ))}
          </select>
        </div>
      )}

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
