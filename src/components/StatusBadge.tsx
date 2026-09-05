import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/constants";

const STYLES: Record<LeadStatus, string> = {
  NEW: "bg-mist/25 text-ink",
  RESEARCHED: "bg-mist/40 text-ink",
  CONTACTED: "bg-green/15 text-green",
  REPLIED: "bg-ink text-paper",
  BOOKED: "bg-green text-paper",
  DEAD: "bg-slate/20 text-slate",
};

export default function StatusBadge({ status }: { status: string }) {
  const key = (status as LeadStatus) in LEAD_STATUS_LABELS ? (status as LeadStatus) : "NEW";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[key]}`}
    >
      {LEAD_STATUS_LABELS[key]}
    </span>
  );
}
