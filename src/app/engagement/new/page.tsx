import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import NewEngagementProfileForm from "@/components/NewEngagementProfileForm";

export const dynamic = "force-dynamic";

export default function NewEngagementProfilePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-6 md:py-10">
      <div className="mb-6">
        <Link href="/engagement" className="text-sm font-semibold text-green hover:underline">
          ← Engagement
        </Link>
      </div>

      <PageHeader title="Add business" description="Starts a 7-day warm-up checklist for each profile you add." />

      <NewEngagementProfileForm />
    </div>
  );
}
