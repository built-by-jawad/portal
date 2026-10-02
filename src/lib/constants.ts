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

export const SOCIAL_PLATFORMS = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN"] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  LINKEDIN: "LinkedIn",
};

export const ENGAGEMENT_DAYS = 7;

// Fixed 7-day warm-up action per day number, same sequence for every platform.
export const ENGAGEMENT_DAY_ACTIONS: Record<number, string> = {
  1: "Follow",
  2: "Like their 2 posts",
  3: "Comment",
  4: "Like 2 more posts",
  5: "Comment again",
  6: "Like 2 more posts",
  7: "Comment again",
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
