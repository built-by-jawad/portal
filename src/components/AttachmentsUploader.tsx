"use client";

import { useRef, useState, useTransition } from "react";
import { deleteAttachment } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";

type Attachment = { id: string; filename: string; url: string; size: number };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentsUploader({
  leadId,
  recordId,
  attachments,
}: {
  leadId: string;
  recordId: string;
  attachments: Attachment[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const notify = useToast();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("recordId", recordId);
        formData.append("leadId", leadId);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Upload failed");
        }
      }
      notify(files.length > 1 ? "Files attached" : "File attached");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {attachments.length > 0 && (
        <ul className="space-y-1.5">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-mist/30 bg-white px-3 py-2 text-xs"
            >
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="truncate font-medium text-ink hover:underline"
              >
                {a.filename}
              </a>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-slate">{formatSize(a.size)}</span>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      await deleteAttachment(leadId, a.id);
                      notify("Attachment removed");
                    })
                  }
                  className="font-semibold text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
          className="text-xs text-slate file:mr-2 file:rounded-lg file:border file:border-mist/40 file:bg-white file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-ink"
        />
        {uploading && <span className="text-xs text-slate">Uploading…</span>}
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
