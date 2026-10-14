import { STATE_NAME_TO_ABBR } from "@/lib/timezone";

const STATE_ABBRS = new Set(Object.values(STATE_NAME_TO_ABBR));

// Best-effort parse of a free-text US address into city/state — same spirit as
// guessTimezoneFromAddress in timezone.ts: a reasonable guess, always overridable by hand.
export function parseCityState(address: string): { city: string | null; state: string | null } {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const zipMatch = last.match(/^([A-Za-z]{2})\s*\d{5}(-\d{4})?$/);
    const abbrMatch = last.match(/^([A-Za-z]{2})$/);
    let state: string | null = null;

    if (zipMatch && STATE_ABBRS.has(zipMatch[1].toUpperCase())) {
      state = zipMatch[1].toUpperCase();
    } else if (abbrMatch && STATE_ABBRS.has(abbrMatch[1].toUpperCase())) {
      state = abbrMatch[1].toUpperCase();
    } else {
      const lower = last.toLowerCase();
      for (const [name, abbr] of Object.entries(STATE_NAME_TO_ABBR)) {
        if (lower.includes(name)) {
          state = abbr;
          break;
        }
      }
    }

    if (state) {
      return { city: parts[parts.length - 2] || null, state };
    }
  }

  // Fallback: no commas (or state not found in the last segment) — look for "CITY ST 12345"
  // or "CITY ST" anywhere in the raw string.
  const inline = address.match(/([A-Za-z][A-Za-z.\s]*?)\s+([A-Za-z]{2})\s*(\d{5}(-\d{4})?)?\s*$/);
  if (inline && STATE_ABBRS.has(inline[2].toUpperCase())) {
    return { city: inline[1].trim() || null, state: inline[2].toUpperCase() };
  }

  return { city: null, state: null };
}
