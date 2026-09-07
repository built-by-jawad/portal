import { notFound } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import ScriptContentView from "@/components/ScriptContentView";
import DeleteScriptButton from "@/components/DeleteScriptButton";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ScriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const script = await prisma.script.findUnique({ where: { id } });
  if (!script) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <div className="mb-6">
        <Link href="/scripts" className="text-sm font-semibold text-green hover:underline">
          ← All scripts
        </Link>
      </div>

      <PageHeader
        title={script.title}
        description={script.category ?? undefined}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/scripts/${script.id}/edit`}
              className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10"
            >
              Edit
            </Link>
            <DeleteScriptButton scriptId={script.id} />
          </div>
        }
      />

      <ScriptContentView html={script.content} />

      <p className="mt-4 text-xs text-slate">
        Last updated {script.updatedAt.toLocaleString()}
      </p>
    </div>
  );
}
