"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { OUTREACH_STATUSES, OUTREACH_STATUS_LABELS, type OutreachStatus } from "@/lib/outreach";
import { TRADE_LABELS, type Trade } from "@/lib/constants";
import { bulkDeleteLeads, bulkUpdateLeadStatus } from "@/lib/actions";

type LeadRow = {
  id: string;
  businessName: string;
  trade: string | null;
  address: string | null;
  contactName: string | null;
  status: string;
  outreachStatus: string;
};

export default function LeadsList({ leads }: { leads: LeadRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const ids = leads.map((l) => l.id);
  const picked = ids.filter((id) => selected.has(id));
  const allSelected = ids.length > 0 && picked.length === ids.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-mist/30 bg-white/60 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-mist/20 px-4 py-2.5">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(ids))}
            className="h-4 w-4 accent-green"
          />
          {picked.length > 0 ? `${picked.length} selected` : "Select all"}
        </label>
        {picked.length > 0 && (
          <>
            <select
              value=""
              disabled={isPending}
              onChange={(e) => {
                const status = e.target.value;
                if (!status) return;
                startTransition(async () => {
                  await bulkUpdateLeadStatus(picked, status);
                  setSelected(new Set());
                });
              }}
              className="rounded-full border border-mist/40 bg-white px-3 py-1.5 text-xs font-semibold text-ink focus:border-green focus:outline-none disabled:opacity-50"
            >
              <option value="">Set status…</option>
              {OUTREACH_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {OUTREACH_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (!confirm(`Delete ${picked.length} lead${picked.length === 1 ? "" : "s"} and all their emails? This can't be undone.`)) return;
                startTransition(async () => {
                  await bulkDeleteLeads(picked);
                  setSelected(new Set());
                });
              }}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              Delete selected
            </button>
          </>
        )}
      </div>
      <ul className="divide-y divide-mist/20">
        {leads.map((lead) => (
          <li key={lead.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-paper">
            <input
              type="checkbox"
              checked={selected.has(lead.id)}
              onChange={() => toggle(lead.id)}
              className="h-4 w-4 shrink-0 accent-green"
            />
            <Link href={`/leads/${lead.id}`} className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{lead.businessName}</p>
              <p className="truncate text-xs text-slate">
                {TRADE_LABELS[(lead.trade as Trade) ?? "OTHER"]}
                {lead.address ? ` · ${lead.address}` : ""}
                {lead.contactName ? ` · ${lead.contactName}` : ""}
              </p>
            </Link>
            <span className="rounded-full bg-mist/20 px-2.5 py-1 text-xs font-semibold text-ink">{OUTREACH_STATUS_LABELS[lead.outreachStatus as OutreachStatus] ?? lead.outreachStatus}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
