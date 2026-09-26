import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import LeadsTab from "@/components/LeadsTab";
import SequenceTable from "@/components/SequenceTable";
import CadenceEditor from "@/components/CadenceEditor";
import { loadSequenceRows } from "@/lib/sequenceRows";
import { loadCadence } from "@/lib/outreachData";
import { CHANNELS, CHANNEL_LABELS } from "@/lib/outreach";
import { todayInTimeZone } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

const TABS = [
  ["leads", "Leads"],
  ["sequences", "Sequences"],
  ["today", "Today"],
  ["cadence", "Cadence"],
] as const;

export default async function OutreachPage({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string }> }) {
  const { tab: rawTab, status } = await searchParams;
  const tab = TABS.some(([k]) => k === rawTab) ? rawTab! : "leads";
  const today = todayInTimeZone("Asia/Karachi");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Outreach" description="Leads, sequences, today's actions and the cadence." />
      <div className="mb-6 flex gap-1 border-b border-mist/30">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/outreach?tab=${key}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === key ? "border-green text-green" : "border-transparent text-slate hover:text-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {tab === "leads" && <LeadsTab status={status} />}
      {tab === "sequences" && <SequenceTable rows={await loadSequenceRows()} today={today} />}
      {tab === "today" && <SequenceTable rows={await loadSequenceRows(today)} today={today} />}
      {tab === "cadence" && <CadenceTab />}
    </div>
  );
}

async function CadenceTab() {
  const cadence = await loadCadence();
  return (
    <div className="space-y-6">
      {CHANNELS.map((ch) => (
        <CadenceEditor
          key={ch}
          channel={ch}
          title={CHANNEL_LABELS[ch]}
          initialRepeat={cadence[ch].repeatEvery}
          initialSteps={cadence[ch].steps.map((s) => ({ day: s.day, label: s.label, isDecision: s.isDecision }))}
        />
      ))}
    </div>
  );
}
