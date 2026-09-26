"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createClientQuestion,
  deleteClientQuestion,
  toggleClientQuestionResolved,
  updateClientQuestion,
} from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";

type Media = { id: string; filename: string; url: string; contentType: string };
type Question = {
  id: string;
  leadId: string;
  clientName: string;
  question: string;
  answer: string | null;
  resolvedAt: Date | null;
  media: Media[];
};

const field =
  "w-full rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green";

async function uploadFiles(questionId: string, files: File[]) {
  for (const file of files) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/questions/${questionId}/media`, { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload failed");
  }
}

function pastedFiles(e: React.ClipboardEvent): File[] {
  return Array.from(e.clipboardData.files);
}

function MediaThumb({ m, onRemove }: { m: Media; onRemove?: () => void }) {
  return (
    <div className="relative">
      {m.contentType.startsWith("image/") ? (
        <a href={m.url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.url} alt={m.filename} className="h-24 w-24 rounded-lg border border-mist/30 object-cover" />
        </a>
      ) : m.contentType.startsWith("video/") ? (
        <video src={m.url} controls className="h-24 rounded-lg border border-mist/30" />
      ) : (
        <a href={m.url} target="_blank" rel="noreferrer" className="flex h-24 w-24 items-center justify-center rounded-lg border border-mist/30 p-2 text-center text-xs text-slate">
          {m.filename}
        </a>
      )}
      {onRemove && (
        <button type="button" onClick={onRemove} className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-red-600 text-xs leading-5 text-white">
          ×
        </button>
      )}
    </div>
  );
}

export default function ClientQuestions({
  clients,
  questions,
}: {
  clients: { id: string; businessName: string }[];
  questions: Question[];
}) {
  const [isPending, startTransition] = useTransition();
  const notify = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const open = questions.filter((q) => !q.resolvedAt);
  const resolved = questions.filter((q) => q.resolvedAt);
  const selected = questions.find((q) => q.id === selectedId) ?? null;

  function addQuestion(formData: FormData) {
    startTransition(async () => {
      const leadId = String(formData.get("leadId") || "");
      if (!leadId) return;
      try {
        const id = await createClientQuestion(leadId, formData);
        if (newFiles.length) await uploadFiles(id, newFiles);
        notify("Added");
        formRef.current?.reset();
        setNewFiles([]);
        router.refresh();
      } catch {
        notify("Something went wrong");
      }
    });
  }

  const row = (q: Question) => (
    <li
      key={q.id}
      onClick={() => setSelectedId(q.id === selectedId ? null : q.id)}
      className={`cursor-pointer px-4 py-3 transition ${q.id === selectedId ? "bg-green/10" : "hover:bg-mist/10"}`}
    >
      <p className={`text-sm font-medium ${q.resolvedAt ? "text-slate line-through" : "text-ink"}`}>{q.question}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-green">
        {q.clientName}
        {q.media.length > 0 && <span className="ml-2 font-normal normal-case text-slate">{q.media.length} attachment{q.media.length === 1 ? "" : "s"}</span>}
      </p>
    </li>
  );

  return (
    <div>
      <form ref={formRef} action={addQuestion} onPaste={(e) => { const f = pastedFiles(e); if (f.length) setNewFiles((p) => [...p, ...f]); }} className="mb-4 space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <select name="leadId" required className={`${field} sm:w-56`}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.businessName}</option>
            ))}
          </select>
          <input type="text" name="question" required placeholder="What do you need to ask them? (you can paste images here)" className={`${field} flex-1`} />
          <button type="submit" disabled={isPending} className="shrink-0 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-paper hover:brightness-95 disabled:opacity-60">
            Add
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate">
          <label className="cursor-pointer rounded-lg border border-mist/40 bg-white px-3 py-1.5 font-semibold text-ink">
            Attach media
            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => { setNewFiles((p) => [...p, ...Array.from(e.target.files ?? [])]); e.target.value = ""; }} />
          </label>
          {newFiles.map((f, i) => (
            <span key={i} className="rounded-full bg-mist/20 px-2.5 py-1">
              {f.name}{" "}
              <button type="button" onClick={() => setNewFiles(newFiles.filter((_, j) => j !== i))}>×</button>
            </span>
          ))}
        </div>
      </form>

      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-6 text-center text-sm text-slate">
          Nothing to ask yet. Add a question whenever one comes to mind.
        </div>
      ) : (
        <div className="space-y-4">
          {open.length > 0 && (
            <ul className="divide-y divide-mist/20 rounded-xl border border-mist/30 bg-white/60 shadow-sm">{open.map(row)}</ul>
          )}
          {resolved.length > 0 && (
            <details className="rounded-xl border border-mist/30 bg-white/40" open={!!selected?.resolvedAt}>
              <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate">
                Answered ({resolved.length})
              </summary>
              <ul className="divide-y divide-mist/20 border-t border-mist/20">{resolved.map(row)}</ul>
            </details>
          )}
        </div>
      )}

      {selected && (
        <QuestionDetail key={selected.id + String(selected.resolvedAt)} question={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function QuestionDetail({ question, onClose }: { question: Question; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const notify = useToast();
  const router = useRouter();
  const [text, setText] = useState(question.question);
  const [answer, setAnswer] = useState(question.answer ?? "");
  const [media, setMedia] = useState<Media[]>(question.media);

  const run = (fn: () => Promise<void>, done: string) =>
    startTransition(async () => {
      try {
        await fn();
        notify(done);
        router.refresh();
      } catch {
        notify("Something went wrong");
      }
    });

  async function addFiles(files: File[]) {
    if (!files.length) return;
    run(async () => {
      await uploadFiles(question.id, files);
    }, "Uploaded");
  }

  return (
    <div
      className="mt-6 space-y-3 rounded-xl border border-green/40 bg-white p-4 shadow-sm"
      onPaste={(e) => {
        const f = pastedFiles(e);
        if (f.length) { e.preventDefault(); addFiles(f); }
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-green">{question.clientName}</p>
        <button type="button" onClick={onClose} className="text-xs text-slate hover:underline">Close</button>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className={field} />
      <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2} placeholder="Their answer (optional)" className={field} />

      <div className="flex flex-wrap gap-3">
        {media.map((m) => (
          <MediaThumb
            key={m.id}
            m={m}
            onRemove={() =>
              run(async () => {
                await fetch(`/api/questions/${question.id}/media/${m.id}`, { method: "DELETE" });
                setMedia((p) => p.filter((x) => x.id !== m.id));
              }, "Removed")
            }
          />
        ))}
        <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-mist/60 p-2 text-center text-xs text-slate">
          + Upload or paste
          <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-mist/20 pt-3">
        <button type="button" disabled={pending} onClick={() => run(() => updateClientQuestion(question.id, question.leadId, text, answer), "Saved")} className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-paper disabled:opacity-60">
          Save changes
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => toggleClientQuestionResolved(question.id, question.leadId), question.resolvedAt ? "Reopened" : "Marked answered")} className="rounded-lg border border-mist/50 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60">
          {question.resolvedAt ? "Reopen" : "Mark as answered"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Delete this question?")) return;
            run(async () => { await deleteClientQuestion(question.id, question.leadId); onClose(); }, "Deleted");
          }}
          className="ml-auto text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
