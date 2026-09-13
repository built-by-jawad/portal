import PageHeader from "@/components/PageHeader";
import NewClientUpdateForm from "@/components/NewClientUpdateForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewClientUpdatePage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const { leadId } = await searchParams;

  const clients = await prisma.lead.findMany({
    where: { status: "BOOKED" },
    select: { id: true, businessName: true },
    orderBy: { businessName: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Log Client Update" description="Record a piece of completed work, with proof, in one go." />

      {clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-6 text-center text-sm text-slate">
          No clients yet. A lead becomes a client once its status is set to Booked.
        </div>
      ) : (
        <NewClientUpdateForm clients={clients} defaultLeadId={leadId || ""} />
      )}
    </div>
  );
}
