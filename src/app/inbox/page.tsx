import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { getDefaultAccountId, listMessagesForAddress, type InboxMessage } from "@/lib/google";

export const dynamic = "force-dynamic";

type Row = InboxMessage & { leadId: string; businessName: string; leadEmail: string };

export default async function InboxPage() {
  const [leads, defaultAccountId] = await Promise.all([
    prisma.lead.findMany({
      where: { email: { not: null } },
      select: { id: true, businessName: true, email: true, sendAccountId: true },
    }),
    getDefaultAccountId(),
  ]);

  if (!defaultAccountId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-10">
        <PageHeader title="Inbox" description="Messages with leads in your list — never a general inbox." />
        <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
          Connect a Gmail account in{" "}
          <Link href="/settings" className="font-semibold text-green hover:underline">
            Settings
          </Link>{" "}
          to see inbox messages here.
        </div>
      </div>
    );
  }

  const results = await Promise.allSettled(
    leads
      .filter((l): l is typeof l & { email: string } => !!l.email)
      .map(async (lead) => {
        const messages = await listMessagesForAddress(
          lead.sendAccountId || defaultAccountId,
          lead.email
        );
        return messages.map((m) => ({
          ...m,
          leadId: lead.id,
          businessName: lead.businessName,
          leadEmail: lead.email,
        }));
      })
  );

  const rows: Row[] = results
    .filter((r): r is PromiseFulfilledResult<Row[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Inbox"
        description="Messages with leads in your list only — every other address is filtered out."
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
          No messages found yet with any lead&apos;s email address.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-mist/30 bg-white/60 shadow-sm">
          <ul className="divide-y divide-mist/20">
            {rows.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/leads/${m.leadId}`}
                  className="block px-4 py-3.5 transition hover:bg-paper"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink">
                      {m.businessName} <span className="font-normal text-slate">· {m.from}</span>
                    </p>
                    <p className="shrink-0 text-xs text-slate">{m.date}</p>
                  </div>
                  <p className="truncate text-sm text-slate">{m.subject}</p>
                  <p className="truncate text-xs text-slate">{m.snippet}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
