"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { createClientUpdate } from "@/lib/actions";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Staged = { file: File; previewUrl: string };

// Everything (client, date, task, description, optional proof link, optional screenshots) is
// staged locally and only hits the server on Save — screenshots upload right after the record is
// created, then a toast confirms it actually saved and we jump to the update's page.
export default function NewClientUpdateForm({
  clients,
  defaultLeadId,
}: {
  clients: { id: string; businessName: string }[];
  defaultLeadId: string;
}) {
  const [staged, setStaged] = useState<Staged[]>([]);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const notify = useToast();
  const router = useRouter();

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isEditable) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length === 0) return;

      e.preventDefault();
      addFiles(files);
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  function addFiles(files: File[]) {
    setStaged((prev) => [...prev, ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))]);
  }

  function removeStaged(index: number) {
    setStaged((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleSubmit(formData: FormData) {
    setSaving(true);
    startTransition(async () => {
      try {
        const update = await createClientUpdate(formData);

        for (const { file } of staged) {
          const fd = new FormData();
          fd.set("file", file, file.name || "screenshot.png");
          await fetch(`/api/client-updates/${update.id}/screenshots`, { method: "POST", body: fd });
        }

        notify("Saved");
        router.push("/client-updates");
      } finally {
        setSaving(false);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">
          Client <span className="text-green">*</span>
        </label>
        <select
          name="leadId"
          required
          defaultValue={defaultLeadId}
          className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
        >
          <option value="" disabled>
            Select a client…
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.businessName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">
          Date <span className="text-green">*</span>
        </label>
        <input
          type="date"
          name="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-full max-w-xs rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">
          Task name <span className="text-green">*</span>
        </label>
        <input
          name="taskName"
          required
          placeholder="e.g. Rebuilt homepage hero section"
          className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Description</label>
        <textarea
          name="description"
          rows={4}
          placeholder="What was done, and why it matters to the client"
          className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Proof link (optional)</label>
        <input
          type="url"
          name="proofLink"
          placeholder="https://…"
          className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="block text-sm font-medium text-ink">Proof / screenshots (optional)</label>
          <label className="cursor-pointer rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10">
            Add screenshot
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(Array.from(e.target.files));
                if (inputRef.current) inputRef.current.value = "";
              }}
            />
          </label>
        </div>
        <p className="mb-3 text-xs text-slate">Tip: copy a screenshot, then press Ctrl+V anywhere on this page to add it.</p>

        {staged.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {staged.map((s, i) => (
              <div key={i} className="group relative overflow-hidden rounded-xl border border-mist/30 bg-white">
                <img src={s.previewUrl} alt={s.file.name} className="h-32 w-full object-cover" />
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <span className="truncate text-xs text-slate">{formatSize(s.file.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeStaged(i)}
                    className="shrink-0 text-xs font-semibold text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={saving || isPending}
        className="inline-flex items-center justify-center rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95 disabled:opacity-60"
      >
        {saving || isPending ? "Saving…" : "Save update"}
      </button>
    </form>
  );
}
