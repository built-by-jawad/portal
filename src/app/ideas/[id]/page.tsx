import { notFound } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import DeleteIdeaButton from "@/components/DeleteIdeaButton";
import IdeaStarButton from "@/components/IdeaStarButton";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idea = await prisma.idea.findUnique({ where: { id } });
  if (!idea) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <div className="mb-6">
        <Link href="/ideas" className="text-sm font-semibold text-green hover:underline">
          ← All ideas
        </Link>
      </div>

      <PageHeader
        title="Idea"
        action={
          <div className="flex flex-nowrap items-center gap-2">
            <IdeaStarButton ideaId={idea.id} starred={idea.starred} className="mr-1" />
            <Link
              href={`/ideas/${idea.id}/edit`}
              className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10"
            >
              Edit
            </Link>
            <DeleteIdeaButton ideaId={idea.id} />
          </div>
        }
      />

      <div
        className="prose prose-sm max-w-none rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6"
        dangerouslySetInnerHTML={{ __html: idea.content }}
      />

      <p className="mt-4 text-xs text-slate">Last updated {idea.updatedAt.toLocaleString()}</p>
    </div>
  );
}
