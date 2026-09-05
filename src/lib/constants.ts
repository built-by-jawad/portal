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
