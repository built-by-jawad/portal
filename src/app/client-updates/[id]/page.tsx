import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import ClientUpdateScreenshots from "@/components/ClientUpdateScreenshots";
import DeleteClientUpdateButton from "@/components/DeleteClientUpdateButton";
import { updateClientUpdate } from "@/lib/actions";

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

  const boundUpdate = updateClientUpdate.bind(null, id);

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

      <form
        action={boundUpdate}
        className="mb-10 space-y-4 rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6"
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Date</label>
          <input
            type="date"
            name="date"
            defaultValue={update.date}
            className="w-full max-w-xs rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Task name</label>
          <input
            name="taskName"
            required
            defaultValue={update.taskName}
            className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Description</label>
          <textarea
            name="description"
            rows={4}
            defaultValue={update.description ?? ""}
            className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
        >
          Save changes
        </button>
      </form>

      <ClientUpdateScreenshots clientUpdateId={update.id} screenshots={update.screenshots} />
    </div>
  );
}
