// Built-in Prospect fields treated as "columns" alongside user-added ProspectColumn rows, so the
// whole grid (built-in + custom) can be reordered/managed as one list. Shared between the server
// page (computing the ordered column list) and the client table (rendering/editing cells).
export type ProspectColumnType = "text" | "number";

export type ProspectColumnDef = {
  key: string;
  label: string;
  type: ProspectColumnType;
  builtin: boolean;
  columnId: string | null; // ProspectColumn.id, for custom columns (rename/delete need this)
  removable: boolean;
};

export const BUILTIN_PROSPECT_COLUMNS: ProspectColumnDef[] = [
  { key: "businessName", label: "Business", type: "text", builtin: true, columnId: null, removable: false },
  { key: "phone", label: "Phone", type: "text", builtin: true, columnId: null, removable: false },
  { key: "emails", label: "Email(s)", type: "text", builtin: true, columnId: null, removable: false },
  { key: "website", label: "Website", type: "text", builtin: true, columnId: null, removable: false },
  { key: "category", label: "Category", type: "text", builtin: true, columnId: null, removable: false },
  { key: "address", label: "Address", type: "text", builtin: true, columnId: null, removable: false },
  { key: "rating", label: "Rating", type: "number", builtin: true, columnId: null, removable: false },
  { key: "reviewCount", label: "Reviews", type: "number", builtin: true, columnId: null, removable: false },
  { key: "notes", label: "Notes", type: "text", builtin: true, columnId: null, removable: false },
];

// Combines the built-ins with custom columns (from ProspectColumn) into one ordered list, per
// ProspectBoardSettings.columnOrder — unknown/new keys are appended at the end so nothing is ever
// silently hidden just because the saved order predates it.
export function buildOrderedColumns(
  customColumns: { id: string; key: string; label: string; type: string }[],
  savedOrder: string[]
): ProspectColumnDef[] {
  const custom: ProspectColumnDef[] = customColumns.map((c) => ({
    key: c.key,
    label: c.label,
    type: c.type === "NUMBER" ? "number" : "text",
    builtin: false,
    columnId: c.id,
    removable: true,
  }));
  const byKey = new Map([...BUILTIN_PROSPECT_COLUMNS, ...custom].map((c) => [c.key, c]));
  const ordered: ProspectColumnDef[] = [];
  for (const key of savedOrder) {
    const col = byKey.get(key);
    if (col) {
      ordered.push(col);
      byKey.delete(key);
    }
  }
  ordered.push(...byKey.values());
  return ordered;
}
