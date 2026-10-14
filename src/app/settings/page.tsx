import PageHeader from "@/components/PageHeader";
import { listSenderEmails } from "@/lib/senderEmails";
import { addSenderEmailAction, removeSenderEmailAction, setDefaultSenderEmailAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const senderEmails = await listSenderEmails();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Settings"
        description="Sender email addresses shown on a lead's sequence — reference/display only, nothing is sent through these."
      />

      <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate">
            Sender emails
          </h2>
        </div>

        <form action={addSenderEmailAction} className="mb-4 flex flex-wrap gap-2">
          <input
            type="email"
            name="email"
            placeholder="name@builtbyjawad.com"
            required
            className="min-w-0 flex-1 rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm text-ink focus:border-green focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-paper transition hover:brightness-95"
          >
            + Add email
          </button>
        </form>

        {senderEmails.length === 0 ? (
          <p className="text-sm text-slate">No sender emails added yet.</p>
        ) : (
          <ul className="divide-y divide-mist/20">
            {senderEmails.map((s: { id: string; email: string; isDefault: boolean }) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {s.email}
                    {s.isDefault && (
                      <span className="ml-2 rounded-full bg-green/15 px-2 py-0.5 text-xs font-semibold text-green">
                        Default
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!s.isDefault && (
                    <form action={setDefaultSenderEmailAction.bind(null, s.id)}>
                      <button
                        type="submit"
                        className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10"
                      >
                        Make default
                      </button>
                    </form>
                  )}
                  <form action={removeSenderEmailAction.bind(null, s.id)}>
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
          Each lead can be assigned one of these addresses on its detail page, for display only;
          leads with none chosen show whichever is marked Default.
        </p>
      </div>
    </div>
  );
}
