"use client";

import { useRef, useTransition } from "react";
import { createIdea, deleteIdea, toggleIdeaStarred } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";

type Idea = {
  id: string;
  content: string;
  starred: boolean;
  createdAt: Date;
};

export default function IdeasList({ ideas }: { ideas: Idea[] }) {
  const [isPending, startTransition] = useTransition();
  const notify = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const starred = ideas.filter((i) => i.starred);
  const rest = ideas.filter((i) => !i.starred);

  function addIdea(formData: FormData) {
    startTransition(async () => {
      await createIdea(formData);
      notify("Saved");
      formRef.current?.reset();
    });
  }

  return (
    <div>
      <form ref={formRef} action={addIdea} className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start">
        <textarea
          name="content"
          required
          rows={2}
          placeholder="What's the idea?"
          className="flex-1 resize-y rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-paper transition hover:brightness-95 disabled:opacity-60"
        >
          Save idea
        </button>
      </form>

      {ideas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-10 text-center text-sm text-slate">
          No ideas saved yet. Jot one down whenever it comes to mind.
        </div>
      ) : (
        <div className="space-y-6">
          {starred.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate">Starred</p>
              <ul className="space-y-2">
                {starred.map((idea) => (
                  <IdeaRow key={idea.id} idea={idea} isPending={isPending} startTransition={startTransition} notify={notify} />
                ))}
              </ul>
            </div>
          )}

          {rest.length > 0 && (
            <div>
              {starred.length > 0 && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate">All ideas</p>}
              <ul className="space-y-2">
                {rest.map((idea) => (
                  <IdeaRow key={idea.id} idea={idea} isPending={isPending} startTransition={startTransition} notify={notify} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IdeaRow({
  idea,
  isPending,
  startTransition,
  notify,
}: {
  idea: Idea;
  isPending: boolean;
  startTransition: (fn: () => Promise<void> | void) => void;
  notify: (message: string) => void;
}) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await toggleIdeaStarred(idea.id);
            notify(idea.starred ? "Unstarred" : "Starred");
          })
        }
        aria-label={idea.starred ? "Unstar" : "Star"}
        className={`mt-0.5 shrink-0 text-lg leading-none transition ${idea.starred ? "text-yellow-500" : "text-mist/50 hover:text-yellow-500"}`}
      >
        ★
      </button>
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap text-sm text-ink">{idea.content}</p>
        <p className="mt-1 text-xs text-slate">{new Date(idea.createdAt).toLocaleDateString()}</p>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("Delete this idea?")) return;
          startTransition(async () => {
            await deleteIdea(idea.id);
            notify("Deleted");
          });
        }}
        className="shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
      >
        Delete
      </button>
    </li>
  );
}
