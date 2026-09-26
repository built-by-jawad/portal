"use client";

import Link from "next/link";
import { useTransition } from "react";
import { completeStep, markSequenceReplied, setDecision, updateSequenceFields } from "@/lib/outreachActions";

export type SeqRow = {
  id: string;
  leadId: string;
  business: string;
  channel: string;
  startDate: string;
  stepLabel: string;
  isDecision: boolean;
  decision: string | null;
  nextActionDate: string | null;
  lastTouchDate: string | null;
  notes: string | null;
  done: boolean;
  replied: boolean;
  status: string;
};

const input = "rounded-md border border-mist/40 bg-white px-2 py-1 text-xs text-ink";

export default function SequenceTable({ rows, today }: { rows: SeqRow[]; today: string }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>) =>
    start(async () => {
      try {
        await fn();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Something went wrong");
      }
    });

  if (rows.length === 0) {
    return <div className="rounded-xl border border-dashed border-mist/50 p-10 text-center text-sm text-slate">Nothing here.</div>;
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-mist/30 bg-white ${pending ? "opacity-70" : ""}`}>
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-mist/30 text-xs uppercase text-slate">
          <tr>
            <th className="px-3 py-2">Lead</th>
            <th className="px-3 py-2">Channel</th>
            <th className="px-3 py-2">Start</th>
            <th className="px-3 py-2">Current step</th>
            <th className="px-3 py-2">Next action</th>
            <th className="px-3 py-2">Last touch</th>
            <th className="px-3 py-2">Notes</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const stopped = r.done || !r.nextActionDate;
            const overdue = r.nextActionDate && r.nextActionDate < today;
            return (
              <tr key={r.id} className="border-b border-mist/20 align-top last:border-0">
                <td className="px-3 py-2 font-semibold text-ink">
                  <Link href={`/leads/${r.leadId}`} className="hover:underline">{r.business}</Link>
                </td>
                <td className="px-3 py-2 text-slate">{r.channel}</td>
                <td className="px-3 py-2">
                  <input type="date" defaultValue={r.startDate} className={input}
                    onBlur={(e) => e.target.value !== r.startDate && run(() => updateSequenceFields(r.id, { startDate: e.target.value }))} />
                </td>
                <td className="px-3 py-2 text-ink">
                  {r.stepLabel}
                  {r.isDecision && !r.done && (
                    <select value={r.decision ?? ""} className={`${input} ml-2`}
                      onChange={(e) => run(() => setDecision(r.id, e.target.value))}>
                      <option value="">Interested?</option>
                      <option value="YES">Yes, send audit</option>
                      <option value="NO">No, stop</option>
                    </select>
                  )}
                </td>
                <td className={`px-3 py-2 ${overdue ? "font-semibold text-red-600" : "text-ink"}`}>
                  {stopped ? <span className="text-slate">{r.done ? "Done" : "Stopped"}</span> : r.nextActionDate}
                </td>
                <td className="px-3 py-2 text-slate">{r.lastTouchDate ?? "-"}</td>
                <td className="px-3 py-2">
                  <input defaultValue={r.notes ?? ""} placeholder="Notes" className={`${input} w-40`}
                    onBlur={(e) => e.target.value !== (r.notes ?? "") && run(() => updateSequenceFields(r.id, { notes: e.target.value }))} />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {!stopped && (
                    <button onClick={() => run(() => completeStep(r.id))}
                      className="rounded-md bg-green px-2.5 py-1 text-xs font-semibold text-white">Done</button>
                  )}{" "}
                  {!r.replied && !r.done && (
                    <button onClick={() => run(() => markSequenceReplied(r.id))}
                      className="rounded-md border border-mist/50 px-2.5 py-1 text-xs font-semibold text-ink">Replied</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
