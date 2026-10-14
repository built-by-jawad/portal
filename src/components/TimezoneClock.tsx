"use client";

import { useEffect, useState } from "react";
import { TIMEZONES } from "@/lib/constants";

const OUR_TZ = "Asia/Karachi";

function timezoneLabel(tz: string): string {
  return TIMEZONES.find((t) => t.value === tz)?.label ?? tz;
}

function formatClock(date: Date, timeZone: string): string {
  return date.toLocaleTimeString("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Live-updating pair of clocks: the lead's detected/selected timezone and ours (Asia/Karachi),
// so it's obvious at a glance what time it is for them right now relative to us.
export default function TimezoneClock({ timezone }: { timezone: string | null }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  return (
    <div className="flex flex-wrap gap-4 rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate">Our time (Karachi)</p>
        <p className="font-semibold text-ink">{formatClock(now, OUR_TZ)}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate">
          {timezone ? `Their time (${timezoneLabel(timezone)})` : "Their time"}
        </p>
        <p className="font-semibold text-ink">
          {timezone ? formatClock(now, timezone) : "Add an address or pick a timezone"}
        </p>
      </div>
    </div>
  );
}
