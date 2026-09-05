import PageHeader from "@/components/PageHeader";
import NewLeadForm from "@/components/NewLeadForm";

export default function NewLeadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Add Lead" description="A new business to research and reach out to." />
      <NewLeadForm />
    </div>
  );
}
