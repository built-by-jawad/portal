"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTask, toggleTaskDone, deleteTask } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";

type Media = { id: string; filename: string; url: string; contentType: string };
type Lead = { id: string; businessName: string };
type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  source: string | null;
  leadId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  media: Media[];
};

const field =
  "w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green";

async function uploadFiles(taskId: string, files: File[]) {
  for (const file of files) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/tasks/${taskId}/media`, { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload failed");
  }
}

function MediaThumb({ m, onRemove }: { m: Media; onRemove: () => void }) {
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
        <a
          href={m.url}
          target="_blank"
          rel="noreferrer"
          className="flex h-24 w-24 items-center justify-center rounded-lg border border-mist/30 p-2 text-center text-xs text-slate"
        >
          {m.filename}
        </a>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-red-600 text-xs leading-5 text-white"
      >
        ×
      </button>
    </div>
  );
}

export default function TaskDetailModal({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const [data, setData] = useState<{ task: TaskDetail; leads: Lead[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const notify = useToast();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [leadId, setLeadId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [media, setMedia] = useState<Media[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tasks/${taskId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setTitle(d.task.title);
        setDescription(d.task.description ?? "");
        setSource(d.task.source ?? "");
        setLeadId(d.task.leadId ?? "");
        setDueDate(d.task.dueDate ?? "");
        setMedia(d.task.media);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

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
      await uploadFiles(taskId, files);
      const res = await fetch(`/api/tasks/${taskId}`);
      const d = await res.json();
      setMedia(d.task.media);
    }, "Uploaded");
  }

  function save() {
    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    fd.set("source", source);
    fd.set("leadId", leadId);
    fd.set("dueDate", dueDate);
    run(() => updateTask(taskId, fd), "Saved");
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      onPaste={(e) => {
        const files = Array.from(e.clipboardData.files);
        if (files.length) {
          e.preventDefault();
          addFiles(files);
        }
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-paper p-5 shadow-xl sm:p-6"
      >
        {loading || !data ? (
          <div className="p-10 text-center text-sm text-slate">Loading…</div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Task details</h2>
              <button type="button" onClick={onClose} className="text-sm text-slate hover:underline">
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className={field} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Source</label>
                <input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Where this came from (a sheet, a doc, internal, etc.)"
                  className={field}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">Client</label>
                  <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className={field}>
                    <option value="">No client / general task</option>
                    {data.leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.businessName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">Due date</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={field} />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Images &amp; files</label>
                <div className="flex flex-wrap gap-3">
                  {media.map((m) => (
                    <MediaThumb
                      key={m.id}
                      m={m}
                      onRemove={() =>
                        run(async () => {
                          await fetch(`/api/tasks/${taskId}/media/${m.id}`, { method: "DELETE" });
                          setMedia((p) => p.filter((x) => x.id !== m.id));
                        }, "Removed")
                      }
                    />
                  ))}
                  <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-mist/60 p-2 text-center text-xs text-slate">
                    + Upload or paste
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        addFiles(Array.from(e.target.files ?? []));
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <p className="mt-1 text-xs text-slate">You can also paste an image anywhere in this window.</p>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-mist/20 pt-4">
                <button
                  type="button"
                  disabled={pending}
                  onClick={save}
                  className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-paper disabled:opacity-60"
                >
                  Save changes
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => toggleTaskDone(taskId), data.task.completedAt ? "Reopened" : "Marked done")}
                  className="rounded-lg border border-mist/50 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
                >
                  {data.task.completedAt ? "Reopen" : "Mark done"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Delete "${title}"?`)) return;
                    run(async () => {
                      await deleteTask(taskId);
                      onClose();
                    }, "Deleted");
                  }}
                  className="ml-auto text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
