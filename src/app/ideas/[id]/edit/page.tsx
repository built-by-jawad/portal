import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import IdeaEditor from "@/components/IdeaEditor";

export const dynamic = "force-dynamic";

export default async function EditIdeaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idea = await prisma.idea.findUnique({ where: { id } });
  if (!idea) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Edit Idea" description="Saves automatically as you type." />

      <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
        <IdeaEditor ideaId={idea.id} initialContent={idea.content} />
      </div>
    </div>
  );
}
