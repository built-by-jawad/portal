import { listMessagesForAddress } from "@/lib/google";

export default async function LeadInbox({
  accountId,
  email,
}: {
  accountId: string;
  email: string;
}) {
  let messages;
  let error: string | null = null;

  try {
    messages = await listMessagesForAddress(accountId, email);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load inbox";
  }

  if (error) {
    return (
      <div className="rounded-xl border border-mist/30 bg-white/60 p-4 text-sm text-slate shadow-sm">
        Couldn&apos;t load inbox: {error}
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-mist/50 p-6 text-center text-sm text-slate">
        No emails found with {email} yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-mist/30 bg-white/60 shadow-sm">
      <ul className="divide-y divide-mist/20">
        {messages.map((m) => (
          <li key={m.id}>
            <a
              href={`https://mail.google.com/mail/u/0/#all/${m.threadId}`}
              target="_blank"
              rel="noreferrer"
              className="block px-4 py-3.5 transition hover:bg-paper"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-ink">{m.from}</p>
                <p className="shrink-0 text-xs text-slate">{m.date}</p>
              </div>
              <p className="truncate text-sm text-slate">{m.subject}</p>
              <p className="truncate text-xs text-slate">{m.snippet}</p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
