import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { updateIdea } from "@/lib/actions";
import RichTextEditor from "@/components/RichTextEditor";

export const dynamic = "force-dynamic";

export default async function EditIdeaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idea = await prisma.idea.findUnique({ where: { id } });
  if (!idea) notFound();

  const boundSave = updateIdea.bind(null, idea.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Edit Idea" description="Update this idea." />

      <form action={boundSave} className="space-y-4 rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Idea <span className="text-green">*</span>
          </label>
          <RichTextEditor initialContent={idea.content} />
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
        >
          Save Idea
        </button>
      </form>
    </div>
  );
}
