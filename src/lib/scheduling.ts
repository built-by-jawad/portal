// Resolves a wall-clock date/time in a given IANA timezone to a real UTC Date, so scheduled sends
// can be compared against "now" correctly across DST boundaries. There's no date library in this
// project, so this uses Intl's longOffset formatting to read the zone's actual UTC offset at that
// instant rather than assuming a fixed offset.
export function scheduledToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string
): Date | null {
  const guess = new Date(`${dateStr}T${timeStr}:00Z`);
  if (Number.isNaN(guess.getTime())) return null;

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    }).formatToParts(guess);
    const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
    const match = offsetPart.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    if (!match) return guess;

    const sign = match[1] === "-" ? -1 : 1;
    const hours = Number(match[2]);
    const minutes = Number(match[3] ?? "0");
    const offsetMinutes = sign * (hours * 60 + minutes);

    // The guess treated the wall-clock time as if it were UTC. The real UTC instant is that wall
    // clock minus the zone's offset from UTC (wall = UTC + offset  =>  UTC = wall - offset).
    return new Date(guess.getTime() - offsetMinutes * 60 * 1000);
  } catch {
    return guess;
  }
}

// The current date (YYYY-MM-DD) as seen from inside a given timezone — used to decide whether a
// scheduledDate counts as "today" for that record's own timezone rather than the server's.
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" })
    .format(now)
    .split("-");
  return parts.length === 3 ? parts.join("-") : now.toISOString().slice(0, 10);
}

export function isDue(dateStr: string | null, timeStr: string | null, timeZone: string | null, now: Date) {
  if (!dateStr) return false;
  const due = scheduledToUtc(dateStr, timeStr || "09:00", timeZone || "UTC");
  return due !== null && due.getTime() <= now.getTime();
}

// Converts a real UTC instant back to the wall-clock date/time as seen in a given IANA timezone —
// the inverse of scheduledToUtc, used after nudging a scheduled instant forward by a buffer.
function utcToWallClock(date: Date, timeZone: string): { dateStr: string; timeStr: string } {
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" }).format(date);
  const timeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return { dateStr, timeStr };
}

export type ScheduleItem = {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  scheduledTimezone: string;
};

const MIN_GAP_MS = 15 * 60 * 1000;

// Human-like send spacing: given every not-yet-sent scheduled email on one Gmail account, any two
// that land within 15 minutes of each other (as real UTC instants, so timezones are compared
// correctly) get pushed apart by a random 15-30 minute buffer, walking chronologically so a chain
// of near-simultaneous emails cascades apart instead of just fixing the first collision. Emails on
// different accounts are left alone even if they land at the exact same time — overlap across
// accounts is fine, it's only same-account overlap that looks robotic.
export function deconflictSchedule(items: ScheduleItem[]): { id: string; scheduledDate: string; scheduledTime: string }[] {
  const withUtc = items
    .map((item) => ({ ...item, utc: scheduledToUtc(item.scheduledDate, item.scheduledTime, item.scheduledTimezone) }))
    .filter((item): item is ScheduleItem & { utc: Date } => item.utc !== null)
    .sort((a, b) => a.utc.getTime() - b.utc.getTime());

  const changes: { id: string; scheduledDate: string; scheduledTime: string }[] = [];

  for (let i = 1; i < withUtc.length; i++) {
    const prev = withUtc[i - 1];
    const cur = withUtc[i];
    if (cur.utc.getTime() - prev.utc.getTime() < MIN_GAP_MS) {
      const bufferMinutes = 15 + Math.floor(Math.random() * 16); // 15-30 inclusive
      cur.utc = new Date(prev.utc.getTime() + bufferMinutes * 60 * 1000);
      const { dateStr, timeStr } = utcToWallClock(cur.utc, cur.scheduledTimezone || "UTC");
      cur.scheduledDate = dateStr;
      cur.scheduledTime = timeStr;
      changes.push({ id: cur.id, scheduledDate: dateStr, scheduledTime: timeStr });
    }
  }

  return changes;
}

export type CalendarView = "today" | "week" | "month";

// Adds days to a YYYY-MM-DD string, staying in plain calendar-date arithmetic (no timezone
// involved — the date strings this operates on are already "as seen in some zone").
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayOfWeek(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay(); // 0 = Sunday
}

// The 7 dates (Sun–Sat) of the calendar week containing `anchorStr` — a real calendar week, not a
// rolling 7-day window, so the week grid lines up the way Google Calendar's does.
export function getWeekDates(anchorStr: string): string[] {
  const start = addDays(anchorStr, -dayOfWeek(anchorStr));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// The 42 dates (6 full Sun–Sat weeks) that cover the calendar month containing `anchorStr`,
// including the leading/trailing days from adjacent months — the standard month-grid shape.
export function getMonthGridDates(anchorStr: string): string[] {
  const firstOfMonth = `${anchorStr.slice(0, 7)}-01`;
  const gridStart = addDays(firstOfMonth, -dayOfWeek(firstOfMonth));
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

// Whether `dateStr` falls within the given calendar view, anchored on `todayStr`. "week"/"month"
// are real calendar boundaries (Sun–Sat week, full month) matching the grid views.
export function isInView(dateStr: string, todayStr: string, view: CalendarView): boolean {
  if (view === "today") return dateStr === todayStr;
  if (view === "week") {
    const week = getWeekDates(todayStr);
    return dateStr >= week[0] && dateStr <= week[6];
  }
  return dateStr.slice(0, 7) === todayStr.slice(0, 7);
}
