import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import LeadForm from "@/components/LeadForm";
import StatusSelect from "@/components/StatusSelect";
import EmailSteps from "@/components/EmailSteps";
import DeleteLeadButton from "@/components/DeleteLeadButton";
import { updateLead } from "@/lib/actions";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { emails: true },
  });

  if (!lead) notFound();

  const boundUpdate = updateLead.bind(null, lead.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <div className="mb-6">
        <Link href="/leads" className="text-sm font-semibold text-green hover:underline">
          ← All leads
        </Link>
      </div>

      <PageHeader
        title={lead.businessName}
        description={[lead.city, lead.state].filter(Boolean).join(", ") || undefined}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusSelect leadId={lead.id} status={lead.status} />
            <DeleteLeadButton leadId={lead.id} />
          </div>
        }
      />

      <div className="mb-10">
        <h2 className="font-display mb-4 text-lg font-bold text-ink">Emails</h2>
        <EmailSteps leadId={lead.id} records={lead.emails} />
      </div>

      <div>
        <h2 className="font-display mb-4 text-lg font-bold text-ink">Business details</h2>
        <LeadForm action={boundUpdate} lead={lead} submitLabel="Save changes" />
      </div>
    </div>
  );
}
