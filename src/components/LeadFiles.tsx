"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useToast } from "@/components/ToastProvider";

type LeadFile = {
  id: string;
  filename: string;
  url: string;
  size: number;
  contentType: string;
  createdAt: Date;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Upload/list/delete files (screenshots, PDFs, etc.) attached directly to a lead, stored in
// Vercel Blob via /api/leads/[id]/files.
export default function LeadFiles({ leadId, files }: { leadId: string; files: LeadFile[] }) {
  const [items, setItems] = useState(files);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const notify = useToast();

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
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
        formData.set("file", file);
        const res = await fetch(`/api/leads/${leadId}/files`, { method: "POST", body: formData });
        if (!res.ok) {
          notify(`Failed to upload ${file.name}`);
          continue;
        }
        const { file: uploaded } = await res.json();
        setItems((prev) => [uploaded, ...prev]);
      }
      notify("Uploaded");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDelete(fileId: string, filename: string) {
    if (!confirm(`Delete "${filename}"?`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/leads/${leadId}/files/${fileId}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((f) => f.id !== fileId));
        notify("Deleted");
      } else {
        notify("Failed to delete");
      }
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">Files</h2>
        <label className="cursor-pointer rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10">
          {uploading ? "Uploading…" : "Upload file"}
          <input
            ref={inputRef}
            type="file"
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
          No files yet. Upload screenshots, PDFs, or other documents for this lead.
        </div>
      ) : (
        <ul className="divide-y divide-mist/20 rounded-xl border border-mist/30 bg-white/60 shadow-sm">
          {items.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:underline"
                title={f.filename}
              >
                {f.filename}
              </a>
              <span className="shrink-0 text-xs text-slate">{formatSize(f.size)}</span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDelete(f.id, f.filename)}
                className="shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
