import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import ClientUpdateScreenshots from "@/components/ClientUpdateScreenshots";
import ClientUpdateEditForm from "@/components/ClientUpdateEditForm";
import DeleteClientUpdateButton from "@/components/DeleteClientUpdateButton";

export const dynamic = "force-dynamic";

export default async function ClientUpdateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const update = await prisma.clientUpdate.findUnique({
    where: { id },
    include: { lead: { select: { businessName: true } }, screenshots: { orderBy: { createdAt: "desc" } } },
  });

  if (!update) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      <div className="mb-6">
        <Link href="/client-updates" className="text-sm font-semibold text-green hover:underline">
          ← All client updates
        </Link>
      </div>

      <PageHeader
        title={update.taskName}
        description={`${update.date} · ${update.lead.businessName}`}
        action={<DeleteClientUpdateButton id={update.id} taskName={update.taskName} />}
      />

      <ClientUpdateEditForm
        id={update.id}
        date={update.date}
        taskName={update.taskName}
        description={update.description ?? ""}
        proofLink={update.proofLink ?? ""}
      />

      <ClientUpdateScreenshots clientUpdateId={update.id} screenshots={update.screenshots} />
    </div>
  );
}
