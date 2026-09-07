import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function ScriptsPage() {
  const scripts = await prisma.script.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Scripts"
        description={`${scripts.length} saved content script${scripts.length === 1 ? "" : "s"}.`}
        action={
          <Link
            href="/scripts/new"
            className="inline-flex items-center justify-center rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
          >
            + Add Script
          </Link>
        }
      />

      {scripts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-10 text-center text-sm text-slate">
          No scripts yet.{" "}
          <Link href="/scripts/new" className="font-semibold text-green hover:underline">
            Add your first one
          </Link>
          .
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {scripts.map((script) => (
            <Link
              key={script.id}
              href={`/scripts/${script.id}`}
              className="flex flex-col rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm transition hover:border-green/50 hover:shadow-md sm:p-6"
            >
              {script.category && (
                <span className="mb-2 inline-flex w-fit rounded-full bg-mist/20 px-2.5 py-0.5 text-xs font-semibold text-ink">
                  {script.category}
                </span>
              )}
              <p className="font-display font-bold text-ink">{script.title}</p>
              <p className="mt-1 line-clamp-3 text-sm text-slate">{stripHtml(script.content)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
