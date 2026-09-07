import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { updateScript } from "@/lib/actions";
import RichTextEditor from "@/components/RichTextEditor";

export const dynamic = "force-dynamic";

export default async function EditScriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const script = await prisma.script.findUnique({ where: { id } });
  if (!script) notFound();

  const boundSave = updateScript.bind(null, script.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Edit Script" description="Update this content script." />

      <form action={boundSave} className="space-y-4 rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Title <span className="text-green">*</span>
          </label>
          <input
            name="title"
            required
            defaultValue={script.title}
            className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Category</label>
          <input
            name="category"
            defaultValue={script.category ?? ""}
            placeholder="e.g. Instagram Reel, Cold Call, Email"
            className="w-full max-w-xs rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Content <span className="text-green">*</span>
          </label>
          <RichTextEditor initialContent={script.content} />
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
        >
          Save Script
        </button>
      </form>
    </div>
  );
}
