export const LEAD_STATUSES = [
  "NEW",
  "RESEARCHED",
  "CONTACTED",
  "REPLIED",
  "BOOKED",
  "DEAD",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  RESEARCHED: "Researched",
  CONTACTED: "Contacted",
  REPLIED: "Replied",
  BOOKED: "Booked",
  DEAD: "Dead",
};

export const TRADES = [
  "PLUMBING",
  "ROOFING",
  "REMODELING",
  "GENERAL_CONTRACTING",
  "OTHER",
] as const;

export type Trade = (typeof TRADES)[number];

export const TRADE_LABELS: Record<Trade, string> = {
  PLUMBING: "Plumbing",
  ROOFING: "Roofing",
  REMODELING: "Remodeling",
  GENERAL_CONTRACTING: "General Contracting",
  OTHER: "Other",
};

export function emailStepLabel(order: number): string {
  return order === 0 ? "Initial Email" : `Follow-up ${order}`;
}

// Curated rather than the full IANA list — covers every US timezone (the target audience) plus
// UTC and Karachi (Jawad's own timezone) for reference.
export const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Mountain, no DST (Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
  { value: "Asia/Karachi", label: "Pakistan (Karachi)" },
  { value: "UTC", label: "UTC" },
] as const;
