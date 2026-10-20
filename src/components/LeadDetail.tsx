import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import LeadWorkspace from "@/components/LeadWorkspace";
import OutreachStatusSelect from "@/components/OutreachStatusSelect";
import DeleteLeadButton from "@/components/DeleteLeadButton";
import LeadMailboxSelect from "@/components/LeadMailboxSelect";
import LeadTimezoneSelect from "@/components/LeadTimezoneSelect";
import LeadBusinessSummary from "@/components/LeadBusinessSummary";
import StartSequenceButton from "@/components/StartSequenceButton";
import { listMailboxes } from "@/lib/mailboxes";

export function loadLeadShared() {
  return listMailboxes();
}

export default async function LeadDetail({
  params,
  shared = loadLeadShared(),
}: {
  params: Promise<{ id: string }>;
  shared?: ReturnType<typeof loadLeadShared>;
}) {
  const { id } = await params;

  const [lead, mailboxes] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      relationLoadStrategy: "join",
      include: {
        emails: { include: { attachments: true }, orderBy: { order: "asc" } },
      },
    }),
    shared,
  ]);

  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={lead.status === "BOOKED" ? "/clients" : "/leads"}
          className="text-sm font-semibold text-green hover:underline"
        >
          {lead.status === "BOOKED" ? "← All clients" : "← All leads"}
        </Link>
        <Link href={`/leads/${lead.id}/full`} className="text-sm font-semibold text-slate hover:underline">
          View full details →
        </Link>
      </div>

      <PageHeader
        title={lead.businessName}
        description={lead.address ?? undefined}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <OutreachStatusSelect leadId={lead.id} status={lead.outreachStatus} stopReason={lead.stopReason} />
            <DeleteLeadButton leadId={lead.id} />
          </div>
        }
      />

      {lead.status !== "BOOKED" && (
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <LeadMailboxSelect leadId={lead.id} mailboxes={mailboxes} value={lead.mailboxId} />
          <LeadTimezoneSelect leadId={lead.id} value={lead.timezone} />
          {lead.outreachStatus === "NEW" && lead.email && <StartSequenceButton leadId={lead.id} />}
        </div>
      )}

      <div className="mb-6">
        <LeadBusinessSummary
          businessName={lead.businessName}
          contactName={lead.contactName}
          email={lead.email}
        />
      </div>

      <LeadWorkspace
        lead={lead}
        leadId={lead.id}
        records={lead.emails}
        isClient={lead.status === "BOOKED"}
        showFields={false}
      />
    </div>
  );
}
