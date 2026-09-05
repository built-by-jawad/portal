import { TRADES, TRADE_LABELS } from "@/lib/constants";
import type { Lead } from "@prisma/client";

export default function LeadFieldsSection({ lead }: { lead?: Lead }) {
  return (
    <>
      <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
        <h2 className="font-display mb-4 text-sm font-bold uppercase tracking-wide text-slate">
          Business
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Business name" name="businessName" required defaultValue={lead?.businessName} />
          <Field label="Contact name" name="contactName" defaultValue={lead?.contactName ?? undefined} />
          <Field label="Email" name="email" type="email" defaultValue={lead?.email ?? undefined} />
          <Field label="Phone" name="phone" defaultValue={lead?.phone ?? undefined} />
          <Field label="Website" name="website" defaultValue={lead?.website ?? undefined} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Trade</label>
            <select
              name="trade"
              defaultValue={lead?.trade ?? "OTHER"}
              className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
            >
              {TRADES.map((t) => (
                <option key={t} value={t}>
                  {TRADE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-ink">Address</label>
            <input
              name="address"
              defaultValue={lead?.address ?? undefined}
              placeholder="Street, city, state, ZIP"
              className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
        <h2 className="font-display mb-4 text-sm font-bold uppercase tracking-wide text-slate">
          Leak &amp; Notes <span className="font-sans text-xs font-normal normal-case text-slate">(optional)</span>
        </h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Leak spotted</label>
            <textarea
              name="leakNotes"
              rows={3}
              defaultValue={lead?.leakNotes ?? undefined}
              placeholder="e.g. no reply to contact form after 24h, outdated site, low review count vs. competitor"
              className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
            />
            <p className="mt-1 text-xs text-slate">For your own reference when writing the outreach emails.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Notes</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={lead?.notes ?? undefined}
              placeholder="Internal notes, call log, anything worth remembering"
              className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
            />
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-green"> *</span>}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
      />
    </div>
  );
}
