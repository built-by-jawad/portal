"use client";

import { useEffect, useRef, useState } from "react";
import {
  addChecklistItem,
  deleteChecklistItem,
  getProspectChecklist,
  updateChecklistItem,
} from "@/lib/actions";
import type { ProspectColumnDef } from "@/lib/prospectColumns";
import type { ProspectRow } from "@/components/ProspectsTable";

type ChecklistItem = {
  id: string;
  section: string;
  text: string;
  checked: boolean;
  order: number;
};

const NOTE_PREFIX = "ℹ️ ";

export default function ProspectDrawer({
  prospect,
  columns,
  onClose,
  onFieldChange,
}: {
  prospect: ProspectRow;
  columns: ProspectColumnDef[];
  onClose: () => void;
  onFieldChange: (col: ProspectColumnDef, value: string) => void;
}) {
  const [tab, setTab] = useState<"details" | "checklist">("details");
  const [items, setItems] = useState<ChecklistItem[] | null>(null);
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionText, setNewSectionText] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getProspectChecklist(prospect.id).then((rows) => {
      if (!cancelled) setItems(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [prospect.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sections = items ? Array.from(new Set(items.map((i) => i.section))) : [];

  async function toggleItem(item: ChecklistItem) {
    setItems((prev) => prev!.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)));
    await updateChecklistItem(item.id, { checked: !item.checked });
  }

  async function editItemText(item: ChecklistItem, text: string) {
    if (text === item.text) return;
    setItems((prev) => prev!.map((i) => (i.id === item.id ? { ...i, text } : i)));
    await updateChecklistItem(item.id, { text });
  }

  async function removeItem(item: ChecklistItem) {
    setItems((prev) => prev!.filter((i) => i.id !== item.id));
    await deleteChecklistItem(item.id);
  }

  async function addItem(section: string) {
    const text = (newItemText[section] || "").trim();
    if (!text) return;
    const item = await addChecklistItem(prospect.id, section, text);
    setItems((prev) => [...(prev || []), item]);
    setNewItemText((prev) => ({ ...prev, [section]: "" }));
  }

  async function addSection() {
    const section = newSectionName.trim();
    const text = newSectionText.trim();
    if (!section || !text) return;
    const item = await addChecklistItem(prospect.id, section, text);
    setItems((prev) => [...(prev || []), item]);
    setNewSectionName("");
    setNewSectionText("");
    setAddingSection(false);
  }

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-mist/30 px-5 py-4">
          <h2 className="font-display text-lg font-bold text-ink">
            {prospect.businessName || "Untitled business"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate hover:bg-mist/10"
          >
            Close ✕
          </button>
        </div>

        <div className="flex border-b border-mist/30 px-5">
          {(["details", "checklist"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold capitalize transition ${
                tab === t ? "border-green text-green" : "border-transparent text-slate hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "details" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {columns.map((col) => (
                <label key={col.key} className="flex flex-col gap-1 text-xs text-slate">
                  {col.label}
                  <input
                    defaultValue={
                      col.builtin
                        ? (prospect[col.key as keyof ProspectRow] as string | number | null | undefined)?.toString() ?? ""
                        : (prospect.customFields[col.key] ?? "")
                    }
                    onBlur={(e) => onFieldChange(col, e.target.value)}
                    className="rounded-lg border border-mist/40 px-2 py-1.5 text-sm text-ink focus:border-green focus:outline-none"
                  />
                </label>
              ))}
            </div>
          ) : items === null ? (
            <p className="text-sm text-slate">Loading…</p>
          ) : (
            <div className="flex flex-col gap-5">
              {sections.map((section) => (
                <div key={section}>
                  <p className="mb-1.5 text-sm font-semibold text-ink">{section}</p>
                  <ul className="flex flex-col gap-1.5">
                    {items
                      .filter((i) => i.section === section)
                      .map((item) =>
                        item.text.startsWith(NOTE_PREFIX) ? (
                          <li key={item.id} className="group flex items-start gap-2">
                            <AutoTextarea
                              value={item.text}
                              onCommit={(text) => void editItemText(item, text)}
                              className="flex-1 text-xs italic text-slate"
                            />
                            <button
                              type="button"
                              onClick={() => void removeItem(item)}
                              className="mt-0.5 text-xs text-slate opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                            >
                              ✕
                            </button>
                          </li>
                        ) : (
                          <li key={item.id} className="group flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() => void toggleItem(item)}
                              className="mt-1 shrink-0"
                            />
                            <AutoTextarea
                              value={item.text}
                              onCommit={(text) => void editItemText(item, text)}
                              className={`flex-1 text-sm ${item.checked ? "text-slate line-through" : "text-ink"}`}
                            />
                            <button
                              type="button"
                              onClick={() => void removeItem(item)}
                              className="mt-0.5 text-xs text-slate opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                            >
                              ✕
                            </button>
                          </li>
                        )
                      )}
                  </ul>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      value={newItemText[section] || ""}
                      onChange={(e) => setNewItemText((prev) => ({ ...prev, [section]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void addItem(section);
                      }}
                      placeholder="Add item…"
                      className="flex-1 rounded-md border border-mist/30 px-2 py-1 text-xs text-ink focus:border-green focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void addItem(section)}
                      className="text-xs font-semibold text-green hover:underline"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}

              {addingSection ? (
                <div className="rounded-lg border border-mist/30 p-3">
                  <input
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="Section name"
                    className="mb-2 w-full rounded-md border border-mist/30 px-2 py-1 text-xs text-ink focus:border-green focus:outline-none"
                  />
                  <input
                    value={newSectionText}
                    onChange={(e) => setNewSectionText(e.target.value)}
                    placeholder="First checklist item"
                    className="mb-2 w-full rounded-md border border-mist/30 px-2 py-1 text-xs text-ink focus:border-green focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void addSection()}
                      className="rounded-md bg-green px-2 py-1 text-xs font-semibold text-paper hover:brightness-95"
                    >
                      Add section
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingSection(false)}
                      className="text-xs text-slate hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingSection(true)}
                  className="self-start text-xs font-semibold text-green hover:underline"
                >
                  + Add section
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Textarea that grows to fit its full content (no internal scrollbar, no clipped text) and
// commits on blur only if the value actually changed.
function AutoTextarea({
  value,
  onCommit,
  className,
}: {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(resize, [draft]);

  return (
    <textarea
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      rows={1}
      className={`resize-none overflow-hidden rounded-md border-0 bg-transparent px-1 py-0.5 leading-snug outline-none focus:bg-mist/10 ${className || ""}`}
    />
  );
}
