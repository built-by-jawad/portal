import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import IdeaStarButton from "@/components/IdeaStarButton";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function IdeasPage() {
  const ideas = await prisma.idea.findMany({ orderBy: [{ starred: "desc" }, { createdAt: "desc" }] });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Ideas"
        description={`${ideas.length} saved idea${ideas.length === 1 ? "" : "s"}.`}
        action={
          <Link
            href="/ideas/new"
            className="inline-flex items-center justify-center rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
          >
            + Add Idea
          </Link>
        }
      />

      {ideas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-10 text-center text-sm text-slate">
          No ideas yet.{" "}
          <Link href="/ideas/new" className="font-semibold text-green hover:underline">
            Save your first one
          </Link>
          .
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {ideas.map((idea) => (
            <Link
              key={idea.id}
              href={`/ideas/${idea.id}`}
              className="flex flex-col rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm transition hover:border-green/50 hover:shadow-md sm:p-6"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="text-xs text-slate">{new Date(idea.createdAt).toLocaleDateString()}</span>
                <IdeaStarButton ideaId={idea.id} starred={idea.starred} />
              </div>
              <p className="line-clamp-5 text-sm text-ink">{stripHtml(idea.content)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
