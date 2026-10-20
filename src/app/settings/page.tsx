import PageHeader from "@/components/PageHeader";
import { listMailboxes } from "@/lib/mailboxes";
import { addMailboxAction, removeMailboxAction, toggleMailboxActiveAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const mailboxes = await listMailboxes();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Settings"
        description="Titan mailboxes used to send outreach sequences. SMTP/IMAP credentials for sending live only in n8n — add/remove mailboxes here just controls which ones leads can be assigned to."
      />

      <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate">
            Mailboxes
          </h2>
        </div>

        <form action={addMailboxAction} className="mb-4 flex flex-wrap gap-2">
          <input
            type="text"
            name="label"
            placeholder="Label (e.g. Mailbox 1)"
            className="min-w-0 flex-1 rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm text-ink focus:border-green focus:outline-none"
          />
          <input
            type="email"
            name="email"
            placeholder="name@yourdomain.com"
            required
            className="min-w-0 flex-1 rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm text-ink focus:border-green focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-paper transition hover:brightness-95"
          >
            + Add mailbox
          </button>
        </form>

        {mailboxes.length === 0 ? (
          <p className="text-sm text-slate">No mailboxes added yet.</p>
        ) : (
          <ul className="divide-y divide-mist/20">
            {mailboxes.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {m.label}
                    <span className="ml-2 text-slate">{m.email}</span>
                    {!m.isActive && (
                      <span className="ml-2 rounded-full bg-mist/30 px-2 py-0.5 text-xs font-semibold text-slate">
                        Inactive
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={toggleMailboxActiveAction.bind(null, m.id, !m.isActive)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10"
                    >
                      {m.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                  <form action={removeMailboxAction.bind(null, m.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-slate">
          A lead picks up the least-loaded active mailbox automatically when its sequence is started,
          and can be reassigned by hand from the lead detail page at any time.
        </p>
      </div>
    </div>
  );
}
