import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import LeadWorkspace from "@/components/LeadWorkspace";
import OutreachStatusSelect from "@/components/OutreachStatusSelect";
import DeleteLeadButton from "@/components/DeleteLeadButton";
import LeadFiles from "@/components/LeadFiles";

const LINK_OUT_SECTIONS = [
  { href: "/tasks", label: "Tasks" },
  { href: "/client-updates", label: "Client updates" },
  { href: "/questions", label: "Questions" },
];

export default async function LeadDetailFull({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    relationLoadStrategy: "join",
    include: {
      emails: { include: { attachments: true }, orderBy: { order: "asc" } },
      files: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <div className="mb-6">
        <Link href={`/leads/${lead.id}`} className="text-sm font-semibold text-green hover:underline">
          ← Back to lead
        </Link>
      </div>

      <PageHeader
        title={`${lead.businessName} — full details`}
        description={lead.address ?? undefined}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <OutreachStatusSelect leadId={lead.id} status={lead.outreachStatus} stopReason={lead.stopReason} />
            <DeleteLeadButton leadId={lead.id} />
          </div>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LINK_OUT_SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-lg border border-mist/30 bg-white/60 px-3 py-2 text-center text-xs font-semibold text-slate shadow-sm transition hover:border-green hover:text-green"
          >
            {s.label} →
          </Link>
        ))}
      </div>

      <div className="mb-10">
        <LeadFiles leadId={lead.id} files={lead.files} />
      </div>

      <LeadWorkspace
        lead={lead}
        leadId={lead.id}
        records={lead.emails}
        isClient={lead.status === "BOOKED"}
        showFields={true}
      />
    </div>
  );
}
