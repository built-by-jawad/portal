import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import LeadForm from "@/components/LeadForm";
import StatusSelect from "@/components/StatusSelect";
import EmailSteps from "@/components/EmailSteps";
import DeleteLeadButton from "@/components/DeleteLeadButton";
import LeadInbox from "@/components/LeadInbox";
import LeadSendAccountSelect from "@/components/LeadSendAccountSelect";
import CheckRepliesButton from "@/components/CheckRepliesButton";
import { updateLead } from "@/lib/actions";
import { getDefaultAccountId, listEmailAccounts } from "@/lib/google";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lead, accounts, defaultAccountId] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: { emails: { include: { attachments: true }, orderBy: { order: "asc" } } },
    }),
    listEmailAccounts(),
    getDefaultAccountId(),
  ]);

  if (!lead) notFound();

  const boundUpdate = updateLead.bind(null, lead.id);
  const inboxAccountId = lead.sendAccountId || defaultAccountId;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <div className="mb-6">
        <Link href="/leads" className="text-sm font-semibold text-green hover:underline">
          ← All leads
        </Link>
      </div>

      <PageHeader
        title={lead.businessName}
        description={lead.address ?? undefined}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusSelect leadId={lead.id} status={lead.status} />
            <DeleteLeadButton leadId={lead.id} />
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <LeadSendAccountSelect leadId={lead.id} accounts={accounts} value={lead.sendAccountId} />
        <CheckRepliesButton leadId={lead.id} />
      </div>

      <div className="mb-10">
        <h2 className="font-display mb-4 text-lg font-bold text-ink">Emails</h2>
        <EmailSteps
          leadId={lead.id}
          leadEmail={lead.email}
          accounts={accounts}
          leadSendAccountId={lead.sendAccountId}
          records={lead.emails}
        />
      </div>

      {inboxAccountId && lead.email && (
        <div className="mb-10">
          <h2 className="font-display mb-4 text-lg font-bold text-ink">
            Inbox <span className="font-sans text-xs font-normal text-slate">(only messages with {lead.email})</span>
          </h2>
          <Suspense
            fallback={
              <div className="rounded-xl border border-mist/30 bg-white/60 p-6 text-center text-sm text-slate">
                Loading inbox…
              </div>
            }
          >
            <LeadInbox accountId={inboxAccountId} email={lead.email} />
          </Suspense>
        </div>
      )}

      <div>
        <h2 className="font-display mb-4 text-lg font-bold text-ink">Business details</h2>
        <LeadForm action={boundUpdate} lead={lead} submitLabel="Save changes" />
      </div>
    </div>
  );
}
