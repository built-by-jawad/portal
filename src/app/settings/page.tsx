import PageHeader from "@/components/PageHeader";
import { listEmailAccounts } from "@/lib/google";
import { disconnectAccountAction, setDefaultAccountAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const accounts = await listEmailAccounts();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Settings"
        description="Connect one or more Gmail accounts to send from, view scoped inbox replies, and track opens/clicks."
      />

      {connected && (
        <div className="mb-6 rounded-lg bg-green/15 px-4 py-3 text-sm font-medium text-green">
          Gmail account connected successfully.
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          Something went wrong connecting Gmail ({error}). Try again.
        </div>
      )}

      <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate">
            Connected Gmail accounts
          </h2>
          <a
            href="/api/google/connect"
            className="inline-flex items-center justify-center rounded-lg bg-green px-3 py-1.5 text-xs font-semibold text-paper transition hover:brightness-95"
          >
            + Connect account
          </a>
        </div>

        {accounts.length === 0 ? (
          <p className="text-sm text-slate">
            Not connected yet. Connect a Gmail account to send outreach emails, see replies, and
            track opens/clicks.
          </p>
        ) : (
          <ul className="divide-y divide-mist/20">
            {accounts.map((acc) => (
              <li key={acc.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {acc.email}
                    {acc.isDefault && (
                      <span className="ml-2 rounded-full bg-green/15 px-2 py-0.5 text-xs font-semibold text-green">
                        Default
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!acc.isDefault && (
                    <form action={setDefaultAccountAction.bind(null, acc.id)}>
                      <button
                        type="submit"
                        className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10"
                      >
                        Make default
                      </button>
                    </form>
                  )}
                  <form action={disconnectAccountAction.bind(null, acc.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Disconnect
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-slate">
          Each lead can be assigned one of these accounts to send its sequence from (set on the
          lead detail page); leads with no account chosen use whichever is marked Default. Inbox
          messages shown anywhere in the portal are always scoped to a lead&apos;s own email
          address, never a general inbox.
        </p>
      </div>
    </div>
  );
}
