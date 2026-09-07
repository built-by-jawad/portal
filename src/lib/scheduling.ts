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
