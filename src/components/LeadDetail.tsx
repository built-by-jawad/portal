import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import LeadWorkspace from "@/components/LeadWorkspace";
import OutreachStatusSelect from "@/components/OutreachStatusSelect";
import DeleteLeadButton from "@/components/DeleteLeadButton";
import LeadSendAccountSelect from "@/components/LeadSendAccountSelect";
import LeadFiles from "@/components/LeadFiles";
import { listSenderEmails } from "@/lib/senderEmails";

export function loadLeadShared() {
  return listSenderEmails();
}

export default async function LeadDetail({
  params,
  shared = loadLeadShared(),
}: {
  params: Promise<{ id: string }>;
  shared?: ReturnType<typeof loadLeadShared>;
}) {
  const { id } = await params;

  const [lead, senderEmails] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      relationLoadStrategy: "join",
      include: {
        emails: { include: { attachments: true }, orderBy: { order: "asc" } },
        files: { orderBy: { createdAt: "desc" } },
      },
    }),
    shared,
  ]);

  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <div className="mb-6">
        <Link
          href={lead.status === "BOOKED" ? "/clients" : "/leads"}
          className="text-sm font-semibold text-green hover:underline"
        >
          {lead.status === "BOOKED" ? "← All clients" : "← All leads"}
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
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <LeadSendAccountSelect leadId={lead.id} senderEmails={senderEmails} value={lead.sendAccountId} />
        </div>
      )}

      <div className="mb-10">
        <LeadFiles leadId={lead.id} files={lead.files} />
      </div>

      <LeadWorkspace
        lead={lead}
        leadId={lead.id}
        records={lead.emails}
        isClient={lead.status === "BOOKED"}
      />
    </div>
  );
}
