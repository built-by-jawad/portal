import Link from "next/link";
import { getMonthGridDates, getWeekDates } from "@/lib/scheduling";

export type CalendarGridItem = {
  id: string;
  date: string;
  sortKey: number;
  title: string;
  subtitle?: string;
  href: string;
  accent?: "green" | "ink" | "slate";
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_ITEM_CAP = 3;

const ACCENT_CLASSES: Record<NonNullable<CalendarGridItem["accent"]>, string> = {
  green: "bg-green/15 text-green",
  ink: "bg-ink/10 text-ink",
  slate: "bg-mist/20 text-ink",
};

// Google-Calendar-shaped grid for the "week" and "month" calendar views — a real Sun–Sat week or
// full month grid (not a rolling window), with items rendered as small pills per day. The "today"
// view on each page stays as its own detailed card list; this only covers week/month.
export default function CalendarGrid({
  view,
  todayStr,
  items,
}: {
  view: "week" | "month";
  todayStr: string;
  items: CalendarGridItem[];
}) {
  const dates = view === "week" ? getWeekDates(todayStr) : getMonthGridDates(todayStr);
  const currentMonth = todayStr.slice(0, 7);

  const byDate = new Map<string, CalendarGridItem[]>();
  for (const item of items) {
    const list = byDate.get(item.date) ?? [];
    list.push(item);
    byDate.set(item.date, list);
  }
  for (const list of byDate.values()) list.sort((a, b) => a.sortKey - b.sortKey);

  return (
    <div className="overflow-hidden rounded-xl border border-mist/30 bg-white/60 shadow-sm">
      <div className="grid grid-cols-7 border-b border-mist/20 bg-paper/60">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate"
          >
            {label}
          </div>
        ))}
      </div>
      <div
        className={`grid grid-cols-7 ${view === "month" ? "grid-rows-6" : ""} divide-x divide-y divide-mist/10`}
      >
        {dates.map((date) => {
          const dayItems = byDate.get(date) ?? [];
          const isToday = date === todayStr;
          const inMonth = view === "month" ? date.slice(0, 7) === currentMonth : true;
          const shown = view === "month" ? dayItems.slice(0, MONTH_ITEM_CAP) : dayItems;
          const overflow = dayItems.length - shown.length;

          return (
            <div
              key={date}
              className={`min-h-[88px] p-1.5 ${view === "week" ? "min-h-[220px]" : ""} ${
                inMonth ? "bg-white/40" : "bg-mist/5"
              }`}
            >
              <p
                className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                  isToday ? "bg-green text-paper" : inMonth ? "text-ink" : "text-slate/50"
                }`}
              >
                {Number(date.slice(8, 10))}
              </p>
              <div className="space-y-1">
                {shown.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`block truncate rounded px-1.5 py-0.5 text-xs font-medium ${
                      ACCENT_CLASSES[item.accent ?? "ink"]
                    }`}
                    title={`${item.title}${item.subtitle ? ` · ${item.subtitle}` : ""}`}
                  >
                    {item.title}
                  </Link>
                ))}
                {overflow > 0 && (
                  <p className="px-1.5 text-xs font-medium text-slate">+{overflow} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
