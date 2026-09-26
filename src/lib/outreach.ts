// Outreach tracker: statuses, channels, and the cadence math. Pure helpers, no database access.

export const OUTREACH_STATUSES = [
  "NEW",
  "IN_SEQUENCE",
  "REPLIED",
  "CALL_BOOKED",
  "TEARDOWN_SENT",
  "WON",
  "NOT_INTERESTED",
  "BAD_FIT",
] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export const OUTREACH_STATUS_LABELS: Record<OutreachStatus, string> = {
  NEW: "New",
  IN_SEQUENCE: "In sequence",
  REPLIED: "Replied",
  CALL_BOOKED: "Call booked",
  TEARDOWN_SENT: "Teardown sent",
  WON: "Won",
  NOT_INTERESTED: "Not interested",
  BAD_FIT: "Bad fit",
};

// The old single `status` column is still read by older code (clients = BOOKED), so every status
// change also writes the closest legacy value.
export const LEGACY_STATUS: Record<OutreachStatus, string> = {
  NEW: "NEW",
  IN_SEQUENCE: "CONTACTED",
  REPLIED: "REPLIED",
  CALL_BOOKED: "REPLIED",
  TEARDOWN_SENT: "REPLIED",
  WON: "BOOKED",
  NOT_INTERESTED: "DEAD",
  BAD_FIT: "DEAD",
};

// Statuses that stop every sequence (no next action date).
export const STOPPING_STATUSES: OutreachStatus[] = ["REPLIED", "CALL_BOOKED", "NOT_INTERESTED", "BAD_FIT"];
// Statuses that also mean "never contact again".
export const CLOSED_STATUSES: OutreachStatus[] = ["NOT_INTERESTED", "BAD_FIT"];

export function isOutreachStatus(v: string): v is OutreachStatus {
  return (OUTREACH_STATUSES as readonly string[]).includes(v);
}

export const CHANNELS = ["EMAIL", "INSTAGRAM", "FACEBOOK", "LINKEDIN"] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_LABELS: Record<Channel, string> = {
  EMAIL: "Email",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
};

export type CadenceStepLike = { day: number; label: string; isDecision: boolean };

const SOCIAL_DAYS: [number, string, boolean?][] = [
  [1, "Day 1: like 2 to 3 recent posts"],
  [2, "Day 2: leave one genuine comment"],
  [3, "Day 3: follow and reply to a story"],
  [4, "Day 4: check stories, like anything new"],
  [5, "Day 5: check stories, like anything new"],
  [6, "Day 6: check stories, like anything new"],
  [7, "Day 7: check stories, like anything new"],
  [8, "Day 8: video audit and DM", true],
  [11, "Day 11: follow-up"],
  [14, "Day 14: follow-up"],
  [17, "Day 17: follow-up"],
  [20, "Day 20: follow-up"],
  [30, "Day 30: follow-up"],
  [60, "Day 60: follow-up"],
  [90, "Day 90: follow-up"],
];
const EMAIL_DAYS = [1, 4, 7, 10, 13, 30, 60, 90];

export const DEFAULT_CADENCE: Record<Channel, { repeatEvery: number; steps: (CadenceStepLike & { position: number })[] }> = {
  EMAIL: {
    repeatEvery: 30,
    steps: EMAIL_DAYS.map((day, position) => ({
      position,
      day,
      label: day === 1 ? "Day 1: initial email" : `Day ${day}: follow-up email`,
      isDecision: false,
    })),
  },
  INSTAGRAM: socialCadence(),
  FACEBOOK: socialCadence(),
  LINKEDIN: socialCadence(),
};

function socialCadence() {
  return {
    repeatEvery: 30,
    steps: SOCIAL_DAYS.map(([day, label, isDecision], position) => ({
      position,
      day,
      label,
      isDecision: !!isDecision,
    })),
  };
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// The step a sequence is on (0-based). After the last listed step it keeps going every `repeatEvery` days.
export function stepAt(steps: CadenceStepLike[], repeatEvery: number, index: number): CadenceStepLike {
  if (index < steps.length) return steps[index];
  const last = steps[steps.length - 1]?.day ?? 1;
  const day = last + repeatEvery * (index - steps.length + 1);
  return { day, label: `Day ${day}: follow-up`, isDecision: false };
}

// Day 1 is the start date itself.
export function nextActionDate(startDate: string, steps: CadenceStepLike[], repeatEvery: number, stepIndex: number): string {
  return addDays(startDate, stepAt(steps, repeatEvery, stepIndex).day - 1);
}
