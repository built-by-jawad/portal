import PageHeader from "@/components/PageHeader";
import { getConnectedEmail, isGoogleConnected } from "@/lib/google";
import { disconnectGoogleAction } from "@/lib/actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const [googleConnected, email] = await Promise.all([
    isGoogleConnected(),
    getConnectedEmail(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Settings"
        description="Connect Gmail to send emails, view scoped inbox replies, and track opens directly from the portal."
      />

      {connected && (
        <div className="mb-6 rounded-lg bg-green/15 px-4 py-3 text-sm font-medium text-green">
          Gmail connected successfully.
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          Something went wrong connecting Gmail ({error}). Try again.
        </div>
      )}

      <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
        <h2 className="font-display mb-4 text-sm font-bold uppercase tracking-wide text-slate">
          Gmail
        </h2>

        {googleConnected ? (
          <div className="space-y-4">
            <p className="text-sm text-ink">
              Connected as <span className="font-semibold">{email}</span>.
            </p>
            <p className="text-xs text-slate">
              Emails sent from lead pages go out from this account, and only inbox messages
              to/from a lead&apos;s own email address are ever shown — never a general inbox.
            </p>
            <form action={disconnectGoogleAction}>
              <button
                type="submit"
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                Disconnect Gmail
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate">
              Not connected yet. Connect your Gmail account to send outreach emails, see
              replies, and track opens.
            </p>
            <a
              href="/api/google/connect"
              className="inline-flex items-center justify-center rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
            >
              Connect Gmail
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
