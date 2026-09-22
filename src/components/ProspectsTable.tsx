"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import {
  convertProspectToLead,
  createProspect,
  deleteProspect,
  updateProspectField,
  updateProspectNumberField,
} from "@/lib/actions";

type Prospect = {
  id: string;
  businessName: string;
  phone: string | null;
  emails: string | null;
  website: string | null;
  category: string | null;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
  notes: string | null;
  source: string | null;
  convertedLeadId: string | null;
};

const TEXT_COLUMNS: { key: keyof Prospect; label: string; width: string }[] = [
  { key: "businessName", label: "Business", width: "min-w-[200px]" },
  { key: "phone", label: "Phone", width: "min-w-[140px]" },
  { key: "emails", label: "Email(s)", width: "min-w-[180px]" },
  { key: "website", label: "Website", width: "min-w-[200px]" },
  { key: "category", label: "Category", width: "min-w-[150px]" },
  { key: "address", label: "Address", width: "min-w-[240px]" },
  { key: "notes", label: "Notes", width: "min-w-[200px]" },
];

// A Google Sheets / Notion-database style grid for raw, unvetted business data. Every cell saves
// on blur (via updateProspectField), no separate save button. Rows here are NOT leads — "Convert"
// copies the row into a real Lead and starts outreach from there.
export default function ProspectsTable({ prospects }: { prospects: Prospect[] }) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notify = useToast();
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prospects;
    return prospects.filter((p) =>
      [p.businessName, p.phone, p.emails, p.website, p.category, p.address, p.notes]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [prospects, query]);

  function saveCell(id: string, field: keyof Prospect, value: string) {
    startTransition(() => {
      void updateProspectField(id, field as string, value);
    });
  }

  function saveNumberCell(id: string, field: "rating" | "reviewCount", value: string) {
    startTransition(() => {
      void updateProspectNumberField(id, field, value);
    });
  }

  function addRow() {
    startTransition(() => {
      void createProspect({ businessName: "Untitled business" });
    });
  }

  function removeRow(id: string, name: string) {
    if (!window.confirm(`Delete "${name}" from prospects? This can't be undone.`)) return;
    startTransition(() => {
      void deleteProspect(id);
    });
  }

  function convert(id: string) {
    startTransition(async () => {
      const leadId = await convertProspectToLead(id);
      notify("Converted to lead");
      router.push(`/leads/${leadId}`);
    });
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/prospects/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      notify(`Imported ${data.created} prospect${data.created === 1 ? "" : "s"}`);
      router.refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search prospects…"
          className="w-full max-w-xs rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm text-ink focus:border-green focus:outline-none"
        />
        <span className="text-xs text-slate">
          {filtered.length} of {prospects.length}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-mist/40 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-mist/10"
          >
            + Add row
          </button>
          <label className="cursor-pointer rounded-lg bg-green px-3 py-2 text-xs font-semibold text-paper transition hover:brightness-95">
            {importing ? "Importing…" : "Import CSV"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
              }}
            />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-mist/30 bg-white/60 shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-mist/30 bg-paper/60 text-left text-xs font-semibold uppercase tracking-wide text-slate">
              {TEXT_COLUMNS.map((c) => (
                <th key={c.key} className={`px-3 py-2 ${c.width}`}>
                  {c.label}
                </th>
              ))}
              <th className="min-w-[80px] px-3 py-2">Rating</th>
              <th className="min-w-[80px] px-3 py-2">Reviews</th>
              <th className="min-w-[160px] px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={TEXT_COLUMNS.length + 3} className="px-3 py-10 text-center text-sm text-slate">
                  No prospects yet. Import a CSV or add a row by hand.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-b border-mist/15 align-top hover:bg-mist/5">
                  {TEXT_COLUMNS.map((c) => (
                    <td key={c.key} className="p-0">
                      <EditableCell
                        value={(p[c.key] as string | null) ?? ""}
                        multiline={c.key === "address" || c.key === "notes"}
                        onSave={(v) => saveCell(p.id, c.key, v)}
                      />
                    </td>
                  ))}
                  <td className="p-0">
                    <EditableCell
                      value={p.rating != null ? String(p.rating) : ""}
                      onSave={(v) => saveNumberCell(p.id, "rating", v)}
                    />
                  </td>
                  <td className="p-0">
                    <EditableCell
                      value={p.reviewCount != null ? String(p.reviewCount) : ""}
                      onSave={(v) => saveNumberCell(p.id, "reviewCount", v)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {p.convertedLeadId ? (
                        <a
                          href={`/leads/${p.convertedLeadId}`}
                          className="rounded-md border border-mist/40 px-2 py-1 text-xs font-semibold text-green hover:bg-mist/10"
                        >
                          View lead ↗
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => convert(p.id)}
                          className="rounded-md bg-green px-2 py-1 text-xs font-semibold text-paper transition hover:brightness-95 disabled:opacity-60"
                        >
                          Convert to lead
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeRow(p.id, p.businessName)}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// One spreadsheet cell: shows plain text, becomes an input/textarea on click, saves on blur (or
// Enter for single-line cells) only if the value actually changed.
function EditableCell({
  value,
  multiline,
  onSave,
}: {
  value: string;
  multiline?: boolean;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  if (!editing) {
    return (
      <div
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className="min-h-[2.25rem] cursor-text whitespace-pre-wrap break-words px-3 py-2 text-ink hover:bg-mist/10"
      >
        {value || <span className="text-slate/50">—</span>}
      </div>
    );
  }

  if (multiline) {
    return (
      <textarea
        autoFocus
        rows={2}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        className="w-full resize-none border-0 bg-white px-3 py-2 text-sm text-ink outline-none ring-1 ring-green"
      />
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="w-full border-0 bg-white px-3 py-2 text-sm text-ink outline-none ring-1 ring-green"
    />
  );
}
