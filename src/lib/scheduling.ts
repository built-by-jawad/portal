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

// Minutes since local midnight, as seen in `timeZone`, at `now`.
export function minutesOfDayInTimeZone(timeZone: string, now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

// Whether "now" falls inside the automated outreach send window (8:30am-10:30am) as seen in
// `timeZone` — the window every automated send (regardless of mailbox) must land inside.
export function isWithinSendWindow(timeZone: string, now: Date = new Date()): boolean {
  const minutes = minutesOfDayInTimeZone(timeZone, now);
  return minutes >= 8 * 60 + 30 && minutes <= 10 * 60 + 30;
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

// The 7 dates (Mon–Sun) of the calendar week containing `anchorStr` — used by /client-updates,
// where the work week (and its Sunday review) runs Monday-first rather than the Sun–Sat grid
// getWeekDates above uses for the outreach calendar.
export function getWeekDatesMondayStart(anchorStr: string): string[] {
  const dow = dayOfWeek(anchorStr); // 0 = Sunday .. 6 = Saturday
  const offsetFromMonday = dow === 0 ? 6 : dow - 1;
  const start = addDays(anchorStr, -offsetFromMonday);
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
