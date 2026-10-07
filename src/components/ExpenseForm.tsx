"use client";

import { useState } from "react";
import { createExpense } from "@/lib/expenseActions";

export default function ExpenseForm({ profiles }: { profiles: { id: string; name: string }[] }) {
  const [adminOnly, setAdminOnly] = useState(false);
  const [splitMode, setSplitMode] = useState<"EQUAL" | "CUSTOM">("EQUAL");
  const [selected, setSelected] = useState<string[]>([]);

  function toggleProfile(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <form action={createExpense} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          name="description"
          placeholder="Description"
          required
          className="rounded-md border border-mist/40 bg-transparent px-3 py-2 text-sm outline-none focus:border-green sm:col-span-1"
        />
        <input
          type="number"
          step="0.01"
          name="amount"
          placeholder="Amount"
          required
          className="rounded-md border border-mist/40 bg-transparent px-3 py-2 text-sm outline-none focus:border-green"
        />
        <input
          type="date"
          name="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="rounded-md border border-mist/40 bg-transparent px-3 py-2 text-sm outline-none focus:border-green"
        />
      </div>

      <select
        name="paidById"
        className="rounded-md border border-mist/40 bg-transparent px-3 py-2 text-sm outline-none focus:border-green"
      >
        <option value="">Paid by (optional)</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-sm text-slate">
        <input
          type="checkbox"
          name="adminOnly"
          checked={adminOnly}
          onChange={(e) => setAdminOnly(e.target.checked)}
        />
        Admin-only (hidden from everyone else)
      </label>

      {!adminOnly && (
        <div className="rounded-lg border border-mist/30 p-3">
          <div className="mb-3 flex items-center gap-4 text-sm">
            <span className="text-slate">Split:</span>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="splitMode"
                value="EQUAL"
                checked={splitMode === "EQUAL"}
                onChange={() => setSplitMode("EQUAL")}
              />
              Equal
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="splitMode"
                value="CUSTOM"
                checked={splitMode === "CUSTOM"}
                onChange={() => setSplitMode("CUSTOM")}
              />
              Custom amounts
            </label>
          </div>

          <div className="flex flex-col gap-2">
            {profiles.map((p) => (
              <div key={p.id} className="flex items-center gap-3 text-sm">
                <label className="flex w-40 items-center gap-2">
                  <input
                    type="checkbox"
                    name="shareProfileIds"
                    value={p.id}
                    checked={selected.includes(p.id)}
                    onChange={() => toggleProfile(p.id)}
                  />
                  {p.name}
                </label>
                {splitMode === "CUSTOM" && selected.includes(p.id) && (
                  <input
                    type="number"
                    step="0.01"
                    name={`customAmount_${p.id}`}
                    placeholder="Amount"
                    className="w-28 rounded-md border border-mist/40 bg-transparent px-2 py-1 text-sm outline-none focus:border-green"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button type="submit" className="self-start rounded-md bg-green px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
        Add expense
      </button>
    </form>
  );
}
