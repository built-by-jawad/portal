"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useToast } from "@/components/ToastProvider";

type Screenshot = {
  id: string;
  filename: string;
  url: string;
  size: number;
  contentType: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Upload/paste/list/delete proof screenshots for one ClientUpdate, stored in Vercel Blob via
// /api/client-updates/[id]/screenshots. Same paste-to-upload pattern as LeadFiles.
export default function ClientUpdateScreenshots({
  clientUpdateId,
  screenshots,
}: {
  clientUpdateId: string;
  screenshots: Screenshot[];
}) {
  const [items, setItems] = useState(screenshots);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const notify = useToast();

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isEditable) return;

      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      const files: File[] = [];
      for (const item of clipboardItems) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length === 0) return;

      e.preventDefault();
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      handleFiles(dt.files);
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.set("file", file, file.name || "screenshot.png");
        const res = await fetch(`/api/client-updates/${clientUpdateId}/screenshots`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          notify(`Failed to upload ${file.name || "screenshot"}`);
          continue;
        }
        const { screenshot } = await res.json();
        setItems((prev) => [screenshot, ...prev]);
      }
      notify("Uploaded");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDelete(screenshotId: string, filename: string) {
    if (!confirm(`Delete "${filename}"?`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/client-updates/${clientUpdateId}/screenshots/${screenshotId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((s) => s.id !== screenshotId));
        notify("Deleted");
      } else {
        notify("Failed to delete");
      }
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">Proof / Screenshots</h2>
        <label className="cursor-pointer rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10">
          {uploading ? "Uploading…" : "Upload screenshot"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      <p className="mb-3 text-xs text-slate">Tip: copy a screenshot, then press Ctrl+V anywhere on this page to upload it.</p>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-6 text-center text-sm text-slate">
          No screenshots yet. Upload or paste proof of this task.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((s) => (
            <div key={s.id} className="group relative overflow-hidden rounded-xl border border-mist/30 bg-white/60 shadow-sm">
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.contentType.startsWith("image/") ? (
                  <img src={s.url} alt={s.filename} className="h-32 w-full object-cover" />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center text-xs text-slate">{s.filename}</div>
                )}
              </a>
              <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                <span className="truncate text-xs text-slate" title={s.filename}>
                  {formatSize(s.size)}
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(s.id, s.filename)}
                  className="shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
