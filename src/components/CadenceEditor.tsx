"use client";

import { useState, useTransition } from "react";
import { replaceCadence } from "@/lib/outreachActions";

type Step = { day: number; label: string; isDecision: boolean };
const input = "rounded-md border border-mist/40 bg-white px-2 py-1 text-sm text-ink";

export default function CadenceEditor({
  channel,
  title,
  initialSteps,
  initialRepeat,
}: {
  channel: string;
  title: string;
  initialSteps: Step[];
  initialRepeat: number;
}) {
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [repeat, setRepeat] = useState(initialRepeat);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  const patch = (i: number, p: Partial<Step>) => setSteps(steps.map((s, j) => (j === i ? { ...s, ...p } : s)));

  return (
    <section className="rounded-xl border border-mist/30 bg-white p-4">
      <h2 className="mb-3 font-display text-lg font-bold text-ink">{title}</h2>
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate">Day</span>
            <input type="number" min={1} value={s.day} className={`${input} w-20`} onChange={(e) => patch(i, { day: Number(e.target.value) })} />
            <input value={s.label} className={`${input} min-w-[200px] flex-1`} onChange={(e) => patch(i, { label: e.target.value })} />
            <label className="flex items-center gap-1 text-xs text-slate">
              <input type="checkbox" checked={s.isDecision} onChange={(e) => patch(i, { isDecision: e.target.checked })} /> Yes/No check
            </label>
            <button type="button" className="text-xs text-red-600" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-md border border-mist/50 px-3 py-1 text-xs font-semibold text-ink"
          onClick={() => {
            const last = steps[steps.length - 1]?.day ?? 0;
            setSteps([...steps, { day: last + 3, label: `Day ${last + 3}: follow-up`, isDecision: false }]);
          }}
        >
          + Add step
        </button>
        <label className="text-xs text-slate">
          After the last step, repeat every{" "}
          <input type="number" min={1} value={repeat} className={`${input} w-16`} onChange={(e) => setRepeat(Number(e.target.value))} /> days
        </label>
        <button
          type="button"
          disabled={pending}
          className="ml-auto rounded-md bg-green px-3 py-1.5 text-xs font-semibold text-white"
          onClick={() =>
            start(async () => {
              try {
                await replaceCadence(channel, repeat, steps);
                setMsg("Saved");
              } catch (e) {
                setMsg(e instanceof Error ? e.message : "Failed");
              }
            })
          }
        >
          {pending ? "Saving..." : "Save"}
        </button>
        {msg && <span className="text-xs text-slate">{msg}</span>}
      </div>
    </section>
  );
}
