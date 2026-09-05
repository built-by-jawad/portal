import PageHeader from "@/components/PageHeader";
import LeadForm from "@/components/LeadForm";
import { createLead } from "@/lib/actions";

export default function NewLeadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Add Lead" description="A new business to research and reach out to." />
      <LeadForm action={createLead} submitLabel="Add Lead" />
    </div>
  );
}
