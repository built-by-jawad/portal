"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import ProspectDrawer from "@/components/ProspectDrawer";
import {
  bulkDeleteProspects,
  createProspect,
  createProspectColumn,
  createProspectColumnsBulk,
  createProspectsBulk,
  deleteProspect,
  deleteProspectColumn,
  renameProspectColumn,
  reorderProspectColumns,
  updateProspectCustomField,
  updateProspectField,
  updateProspectNumberField,
} from "@/lib/actions";
import type { ProspectColumnDef } from "@/lib/prospectColumns";

export type ProspectRow = {
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
  order: number;
  customFields: Record<string, string>;
};

const NUMBER_FIELDS = new Set(["rating", "reviewCount"]);

type Command = {
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
};

function cellValue(row: ProspectRow, col: ProspectColumnDef): string {
  if (col.builtin) {
    const v = row[col.key as keyof ProspectRow];
    return v === null || v === undefined ? "" : String(v);
  }
  return row.customFields[col.key] ?? "";
}

export default function ProspectsTable({
  prospects,
  columns: initialColumns,
}: {
  prospects: ProspectRow[];
  columns: ProspectColumnDef[];
}) {
  const [rows, setRows] = useState<ProspectRow[]>(prospects);
  const [columns, setColumns] = useState<ProspectColumnDef[]>(initialColumns);
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [openProspectId, setOpenProspectId] = useState<string | null>(null);
  const [managingColumns, setManagingColumns] = useState(false);
  const [anchor, setAnchor] = useState<{ r: number; c: number } | null>(null);
  const [focus, setFocus] = useState<{ r: number; c: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const undoStack = useRef<Command[]>([]);
  const redoStack = useRef<Command[]>([]);
  const notify = useToast();
  const router = useRouter();

  useEffect(() => setRows(prospects), [prospects]);
  useEffect(() => setColumns(initialColumns), [initialColumns]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      columns.some((c) => cellValue(r, c).toLowerCase().includes(q))
    );
  }, [rows, columns, query]);

  function pushCommand(cmd: Command) {
    undoStack.current.push(cmd);
    redoStack.current = [];
  }

  const setCellLocal = useCallback((id: string, col: ProspectColumnDef, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (col.builtin) {
          const numeric = NUMBER_FIELDS.has(col.key);
          return { ...r, [col.key]: numeric ? (value.trim() === "" ? null : Number(value)) : value || null };
        }
        return { ...r, customFields: { ...r.customFields, [col.key]: value } };
      })
    );
  }, []);

  const saveCellRemote = useCallback((id: string, col: ProspectColumnDef, value: string) => {
    if (col.builtin) {
      if (NUMBER_FIELDS.has(col.key)) void updateProspectNumberField(id, col.key, value);
      else void updateProspectField(id, col.key, value);
    } else {
      void updateProspectCustomField(id, col.key, value);
    }
  }, []);

  const applyCell = useCallback(
    (id: string, col: ProspectColumnDef, value: string) => {
      setCellLocal(id, col, value);
      saveCellRemote(id, col, value);
    },
    [setCellLocal, saveCellRemote]
  );

  function commitCellEdit(id: string, col: ProspectColumnDef, value: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const oldValue = cellValue(row, col);
    if (oldValue === value) return;
    applyCell(id, col, value);
    pushCommand({
      undo: () => applyCell(id, col, oldValue),
      redo: () => applyCell(id, col, value),
    });
  }

  async function addRow() {
    const created = await createProspect({ businessName: "Untitled business" });
    const row: ProspectRow = { ...created, customFields: {} } as ProspectRow;
    setRows((prev) => [...prev, row]);
    pushCommand({
      undo: () => {
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        void deleteProspect(row.id);
      },
      redo: () => {
        setRows((prev) => [...prev, row]);
        void createProspect({ businessName: row.businessName });
      },
    });
  }

  async function addRowsBulk() {
    const input = window.prompt("How many rows to add?", "5");
    const n = parseInt(input || "", 10);
    if (!n || n < 1) return;
    const created = await createProspectsBulk(n);
    setRows((prev) => [
      ...prev,
      ...created.map((c, i) => ({
        id: c.id,
        businessName: "Untitled business",
        phone: null,
        emails: null,
        website: null,
        category: null,
        address: null,
        rating: null,
        reviewCount: null,
        notes: null,
        source: null,
        order: prev.length + i,
        customFields: {},
      })),
    ]);
    router.refresh();
  }

  function deleteSelectedRows() {
    if (selectedRowIds.size === 0) return;
    const ids = Array.from(selectedRowIds);
    const deletedRows = rows.filter((r) => ids.includes(r.id));
    setRows((prev) => prev.filter((r) => !ids.includes(r.id)));
    setSelectedRowIds(new Set());
    void bulkDeleteProspects(ids);
    pushCommand({
      undo: () => {
        setRows((prev) => [...prev, ...deletedRows]);
        for (const r of deletedRows) {
          void createProspect({
            businessName: r.businessName,
            phone: r.phone ?? undefined,
            emails: r.emails ?? undefined,
            website: r.website ?? undefined,
            category: r.category ?? undefined,
            address: r.address ?? undefined,
            rating: r.rating,
            reviewCount: r.reviewCount,
            notes: r.notes ?? undefined,
          });
        }
      },
      redo: () => {
        setRows((prev) => prev.filter((r) => !ids.includes(r.id)));
        void bulkDeleteProspects(ids);
      },
    });
  }

  function undo() {
    const cmd = undoStack.current.pop();
    if (!cmd) return;
    void cmd.undo();
    redoStack.current.push(cmd);
  }

  function redo() {
    const cmd = redoStack.current.pop();
    if (!cmd) return;
    void cmd.redo();
    undoStack.current.push(cmd);
  }

  const rowIndexOf = (id: string) => filtered.findIndex((r) => r.id === id);

  function selectionRange() {
    if (!anchor || !focus) return null;
    return {
      r1: Math.min(anchor.r, focus.r),
      r2: Math.max(anchor.r, focus.r),
      c1: Math.min(anchor.c, focus.c),
      c2: Math.max(anchor.c, focus.c),
    };
  }

  function isCellSelected(r: number, c: number) {
    const range = selectionRange();
    if (!range) return false;
    return r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2;
  }

  function startSelect(r: number, c: number, shift: boolean) {
    setEditingCell(null);
    if (shift && anchor) setFocus({ r, c });
    else {
      setAnchor({ r, c });
      setFocus({ r, c });
    }
    setDragging(true);
  }

  useEffect(() => {
    function onMouseUp() {
      setDragging(false);
    }
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      if (!focus) return;
      if (editingCell) return;

      if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        const range = selectionRange();
        if (!range) return;
        const lines: string[] = [];
        for (let r = range.r1; r <= range.r2; r++) {
          const cells: string[] = [];
          for (let c = range.c1; c <= range.c2; c++) {
            cells.push(cellValue(filtered[r], columns[c]));
          }
          lines.push(cells.join("\t"));
        }
        void navigator.clipboard.writeText(lines.join("\n"));
        return;
      }

      if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        void navigator.clipboard.readText().then((text) => {
          const lines = text.replace(/\r/g, "").split("\n");
          const startR = anchor?.r ?? focus.r;
          const startC = anchor?.c ?? focus.c;
          lines.forEach((line, li) => {
            if (line === "" && li === lines.length - 1 && lines.length > 1) return;
            const cells = line.split("\t");
            cells.forEach((val, ci) => {
              const row = filtered[startR + li];
              const col = columns[startC + ci];
              if (row && col) commitCellEdit(row.id, col, val);
            });
          });
        });
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const range = selectionRange();
        if (!range) return;
        e.preventDefault();
        for (let r = range.r1; r <= range.r2; r++) {
          for (let c = range.c1; c <= range.c2; c++) {
            const row = filtered[r];
            const col = columns[c];
            if (row && col) commitCellEdit(row.id, col, "");
          }
        }
        return;
      }

      const dirs: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      if (dirs[e.key]) {
        e.preventDefault();
        const [dr, dc] = dirs[e.key];
        const nr = Math.min(Math.max(focus.r + dr, 0), filtered.length - 1);
        const nc = Math.min(Math.max(focus.c + dc, 0), columns.length - 1);
        if (e.shiftKey) setFocus({ r: nr, c: nc });
        else {
          setAnchor({ r: nr, c: nc });
          setFocus({ r: nr, c: nc });
        }
        return;
      }

      if (e.key === "Enter" && focus) {
        setEditingCell(focus);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [focus, anchor, editingCell, filtered, columns]
  );

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

  const openProspect = rows.find((r) => r.id === openProspectId) || null;

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
          {filtered.length} of {rows.length}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {selectedRowIds.size > 0 && (
            <button
              type="button"
              onClick={deleteSelectedRows}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:brightness-95"
            >
              Delete ({selectedRowIds.size})
            </button>
          )}
          <button
            type="button"
            onClick={undo}
            title="Undo (Ctrl+Z)"
            className="rounded-lg border border-mist/40 px-2 py-2 text-xs font-semibold text-ink transition hover:bg-mist/10"
          >
            ↶ Undo
          </button>
          <button
            type="button"
            onClick={redo}
            title="Redo (Ctrl+Y)"
            className="rounded-lg border border-mist/40 px-2 py-2 text-xs font-semibold text-ink transition hover:bg-mist/10"
          >
            ↷ Redo
          </button>
          <button
            type="button"
            onClick={() => setManagingColumns(true)}
            className="rounded-lg border border-mist/40 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-mist/10"
          >
            Manage columns
          </button>
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-mist/40 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-mist/10"
          >
            + Add row
          </button>
          <button
            type="button"
            onClick={addRowsBulk}
            className="rounded-lg border border-mist/40 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-mist/10"
          >
            + Add rows…
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

      <div
        className="overflow-x-auto rounded-xl border border-mist/30 bg-white/60 shadow-sm"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <table className="w-full select-none border-collapse text-sm">
          <thead>
            <tr className="border-b border-mist/30 bg-paper/60 text-left text-xs font-semibold uppercase tracking-wide text-slate">
              <th className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedRowIds.size === filtered.length}
                  onChange={(e) =>
                    setSelectedRowIds(e.target.checked ? new Set(filtered.map((r) => r.id)) : new Set())
                  }
                />
              </th>
              <th className="w-8 px-2 py-2" />
              {columns.map((c) => (
                <th key={c.key} className="min-w-[160px] px-3 py-2">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-10 text-center text-sm text-slate">
                  No prospects yet. Import a CSV or add a row by hand.
                </td>
              </tr>
            ) : (
              filtered.map((row, r) => (
                <tr key={row.id} className="border-b border-mist/15 align-top hover:bg-mist/5">
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={selectedRowIds.has(row.id)}
                      onChange={(e) =>
                        setSelectedRowIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(row.id);
                          else next.delete(row.id);
                          return next;
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => setOpenProspectId(row.id)}
                      title="Open"
                      className="text-slate hover:text-green"
                    >
                      ⤢
                    </button>
                  </td>
                  {columns.map((col, c) => (
                    <td key={col.key} className="p-0">
                      <Cell
                        value={cellValue(row, col)}
                        selected={isCellSelected(r, c)}
                        editing={editingCell?.r === r && editingCell?.c === c}
                        onMouseDown={(shift) => startSelect(r, c, shift)}
                        onMouseEnter={() => dragging && setFocus({ r, c })}
                        onDoubleClick={() => {
                          setAnchor({ r, c });
                          setFocus({ r, c });
                          setEditingCell({ r, c });
                        }}
                        onCommit={(val) => {
                          setEditingCell(null);
                          commitCellEdit(row.id, col, val);
                        }}
                        onCancel={() => setEditingCell(null)}
                      />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {openProspect && (
        <ProspectDrawer
          prospect={openProspect}
          columns={columns}
          onClose={() => setOpenProspectId(null)}
          onFieldChange={(col, value) => applyCell(openProspect.id, col, value)}
        />
      )}

      {managingColumns && (
        <ManageColumnsPanel
          columns={columns}
          onClose={() => setManagingColumns(false)}
          onReorder={(order) => {
            setColumns(order);
            void reorderProspectColumns(order.map((c) => c.key));
          }}
          onAdd={async (label) => {
            const created = await createProspectColumn(label, "TEXT");
            setColumns((prev) => [
              ...prev,
              { key: created.key, label: created.label, type: "text", builtin: false, columnId: created.id, removable: true },
            ]);
          }}
          onAddBulk={async (labels) => {
            const created = await createProspectColumnsBulk(labels, "TEXT");
            setColumns((prev) => [
              ...prev,
              ...created.map((c) => ({
                key: c.key,
                label: c.label,
                type: "text" as const,
                builtin: false,
                columnId: c.id,
                removable: true,
              })),
            ]);
          }}
          onRename={async (col, label) => {
            if (!col.columnId) return;
            setColumns((prev) => prev.map((c) => (c.key === col.key ? { ...c, label } : c)));
            await renameProspectColumn(col.columnId, label);
          }}
          onDelete={async (col) => {
            if (!col.columnId) return;
            setColumns((prev) => prev.filter((c) => c.key !== col.key));
            await deleteProspectColumn(col.columnId);
          }}
        />
      )}
    </div>
  );
}

function Cell({
  value,
  selected,
  editing,
  onMouseDown,
  onMouseEnter,
  onDoubleClick,
  onCommit,
  onCancel,
}: {
  value: string;
  selected: boolean;
  editing: boolean;
  onMouseDown: (shift: boolean) => void;
  onMouseEnter: () => void;
  onDoubleClick: () => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (editing) setDraft(value);
  }, [editing, value]);

  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    void navigator.clipboard.writeText(value);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit(draft);
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        className="w-full border-0 bg-white px-3 py-2 text-sm text-ink outline-none ring-2 ring-green"
      />
    );
  }

  return (
    <div
      onMouseDown={(e) => onMouseDown(e.shiftKey)}
      onMouseEnter={onMouseEnter}
      onDoubleClick={onDoubleClick}
      className={`group relative min-h-[2.25rem] cursor-cell whitespace-pre-wrap break-words px-3 py-2 text-ink ${
        selected ? "bg-green/10 ring-1 ring-inset ring-green" : ""
      }`}
    >
      {value || <span className="text-slate/50">—</span>}
      {value && (
        <button
          type="button"
          onClick={copy}
          title="Copy"
          className="absolute right-1 top-1 hidden rounded bg-white/90 px-1 text-xs text-slate hover:text-green group-hover:block"
        >
          ⧉
        </button>
      )}
    </div>
  );
}

function ManageColumnsPanel({
  columns,
  onClose,
  onReorder,
  onAdd,
  onAddBulk,
  onRename,
  onDelete,
}: {
  columns: ProspectColumnDef[];
  onClose: () => void;
  onReorder: (order: ProspectColumnDef[]) => void;
  onAdd: (label: string) => Promise<void>;
  onAddBulk: (labels: string[]) => Promise<void>;
  onRename: (col: ProspectColumnDef, label: string) => Promise<void>;
  onDelete: (col: ProspectColumnDef) => Promise<void>;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [bulkLabels, setBulkLabels] = useState("");

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= columns.length) return;
    const next = [...columns];
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/30 px-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-ink">Manage columns</h3>
          <button type="button" onClick={onClose} className="text-sm text-slate hover:text-ink">
            Close ✕
          </button>
        </div>

        <ul className="mb-4 flex flex-col gap-1">
          {columns.map((col, i) => (
            <li key={col.key} className="flex items-center gap-2 rounded-md border border-mist/20 px-2 py-1.5">
              <div className="flex flex-col">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-xs text-slate disabled:opacity-30">
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === columns.length - 1}
                  className="text-xs text-slate disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
              {col.builtin ? (
                <span className="flex-1 text-sm text-ink">{col.label}</span>
              ) : (
                <input
                  defaultValue={col.label}
                  onBlur={(e) => {
                    if (e.target.value !== col.label) void onRename(col, e.target.value);
                  }}
                  className="flex-1 rounded-md border border-mist/30 px-2 py-1 text-sm text-ink focus:border-green focus:outline-none"
                />
              )}
              {col.removable && (
                <button type="button" onClick={() => void onDelete(col)} className="text-xs text-red-600 hover:underline">
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="mb-3 flex items-center gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New column name"
            className="flex-1 rounded-lg border border-mist/40 px-2 py-1.5 text-sm text-ink focus:border-green focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (!newLabel.trim()) return;
              void onAdd(newLabel.trim());
              setNewLabel("");
            }}
            className="rounded-lg bg-green px-3 py-1.5 text-xs font-semibold text-paper hover:brightness-95"
          >
            Add
          </button>
        </div>

        <div>
          <textarea
            value={bulkLabels}
            onChange={(e) => setBulkLabels(e.target.value)}
            placeholder={"Add multiple columns at once — one name per line"}
            rows={3}
            className="mb-2 w-full rounded-lg border border-mist/40 px-2 py-1.5 text-sm text-ink focus:border-green focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              const labels = bulkLabels.split("\n").map((l) => l.trim()).filter(Boolean);
              if (labels.length === 0) return;
              void onAddBulk(labels);
              setBulkLabels("");
            }}
            className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-mist/10"
          >
            Add columns
          </button>
        </div>
      </div>
    </div>
  );
}
