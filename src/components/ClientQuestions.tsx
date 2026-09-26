"use client";

import { useRef, useTransition } from "react";
import {
  createClientQuestion,
  deleteClientQuestion,
  toggleClientQuestionResolved,
  updateClientQuestionAnswer,
} from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";

type Question = {
  id: string;
  leadId: string;
  clientName: string;
  question: string;
  answer: string | null;
  resolvedAt: Date | null;
};

// A running "things to ask clients" list on /questions — jot a question down, tick it
// off (with the answer, if worth keeping) once it's actually been asked and answered.
export default function ClientQuestions({
  clients,
  questions,
}: {
  clients: { id: string; businessName: string }[];
  questions: Question[];
}) {
  const [isPending, startTransition] = useTransition();
  const notify = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const open = questions.filter((q) => !q.resolvedAt);
  const resolved = questions.filter((q) => q.resolvedAt);

  function addQuestion(formData: FormData) {
    startTransition(async () => {
      const leadId = String(formData.get("leadId") || "");
      if (!leadId) return;
      await createClientQuestion(leadId, formData);
      notify("Added");
      formRef.current?.reset();
    });
  }

  return (
    <div>
      <form
        ref={formRef}
        action={addQuestion}
        className="mb-4 flex flex-col gap-2 sm:flex-row"
      >
        <select
          name="leadId"
          required
          className="rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm text-ink focus:border-green focus:outline-none"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.businessName}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="question"
          required
          placeholder="What do you need to ask them?"
          className="flex-1 rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-paper transition hover:brightness-95 disabled:opacity-60"
        >
          Add
        </button>
      </form>

      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-6 text-center text-sm text-slate">
          Nothing to ask yet. Add a question whenever one comes to mind.
        </div>
      ) : (
        <div className="space-y-4">
          {open.length > 0 && (
            <ul className="divide-y divide-mist/20 rounded-xl border border-mist/30 bg-white/60 shadow-sm">
              {open.map((q) => (
                <QuestionRow key={q.id} question={q} isPending={isPending} startTransition={startTransition} notify={notify} />
              ))}
            </ul>
          )}

          {resolved.length > 0 && (
            <details className="rounded-xl border border-mist/30 bg-white/40">
              <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate">
                Answered ({resolved.length})
              </summary>
              <ul className="divide-y divide-mist/20 border-t border-mist/20">
                {resolved.map((q) => (
                  <QuestionRow key={q.id} question={q} isPending={isPending} startTransition={startTransition} notify={notify} />
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionRow({
  question,
  isPending,
  startTransition,
  notify,
}: {
  question: Question;
  isPending: boolean;
  startTransition: (fn: () => Promise<void> | void) => void;
  notify: (message: string) => void;
}) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={!!question.resolvedAt}
          disabled={isPending}
          onChange={() =>
            startTransition(async () => {
              await toggleClientQuestionResolved(question.id, question.leadId);
              notify(question.resolvedAt ? "Reopened" : "Marked answered");
            })
          }
          className="mt-1 h-4 w-4 shrink-0 rounded border-mist/40 accent-green"
        />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${question.resolvedAt ? "text-slate line-through" : "text-ink"}`}>
            {question.question}
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-green">{question.clientName}</p>
          <form
            action={(formData) =>
              startTransition(async () => {
                await updateClientQuestionAnswer(question.id, question.leadId, formData);
                notify("Saved");
              })
            }
            className="mt-1"
          >
            <input
              type="text"
              name="answer"
              defaultValue={question.answer ?? ""}
              placeholder="Their answer (optional)"
              onBlur={(e) => e.currentTarget.form?.requestSubmit()}
              className="w-full rounded-lg border border-mist/30 bg-white px-2.5 py-1.5 text-xs text-ink focus:border-green focus:outline-none"
            />
          </form>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!confirm("Delete this question?")) return;
            startTransition(async () => {
              await deleteClientQuestion(question.id, question.leadId);
              notify("Deleted");
            });
          }}
          className="shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
