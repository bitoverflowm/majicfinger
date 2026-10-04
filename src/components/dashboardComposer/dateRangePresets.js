import { startOfQuarter, startOfYear, subDays, subMonths } from "date-fns";

export const DATE_RANGE_PRESETS = [
  { id: "past-24h", label: "Past 24 hours", short: "24h" },
  { id: "past-3d", label: "Past 3 days", short: "3d" },
  { id: "past-7d", label: "Past 7 days", short: "7d" },
  { id: "past-month", label: "Past month", short: "1mo" },
  { id: "this-quarter", label: "This quarter", short: "Qtr" },
  { id: "this-year", label: "This year", short: "YTD" },
];

function isoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Inclusive calendar window ending today.
 * Past 24 hours is yesterday through today, because the picker stores whole days.
 * @param {string} id
 * @param {Date} [now]
 * @returns {{ from: string, to: string } | null}
 */
export function dateRangePreset(id, now = new Date()) {
  const today = startOfLocalDay(now);
  const to = isoDate(today);
  if (id === "past-24h") return { from: isoDate(subDays(today, 1)), to };
  if (id === "past-3d") return { from: isoDate(subDays(today, 3)), to };
  if (id === "past-7d") return { from: isoDate(subDays(today, 7)), to };
  if (id === "past-month") return { from: isoDate(subMonths(today, 1)), to };
  if (id === "this-quarter") return { from: isoDate(startOfQuarter(today)), to };
  if (id === "this-year") return { from: isoDate(startOfYear(today)), to };
  return null;
}

function withQuarterShort(preset, now) {
  if (preset.id !== "this-quarter") return preset;
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return { ...preset, short: `Q${quarter}` };
}

/** The shortcut whose window matches these dates, if the range was not edited by hand. */
export function matchingDateRangePreset(from, to, now = new Date()) {
  if (!from || !to) return null;
  for (const preset of DATE_RANGE_PRESETS) {
    const range = dateRangePreset(preset.id, now);
    if (range && range.from === from && range.to === to) return withQuarterShort(preset, now);
  }
  return null;
}

/**
 * Prefer the shortcut the user clicked when two windows share the same dates.
 * A hand-edited range returns null.
 */
export function activeDateRangePreset(from, to, presetId, now = new Date()) {
  if (presetId) {
    const chosen = DATE_RANGE_PRESETS.find((preset) => preset.id === presetId);
    const range = chosen ? dateRangePreset(chosen.id, now) : null;
    if (chosen && range && range.from === from && range.to === to) return withQuarterShort(chosen, now);
  }
  return matchingDateRangePreset(from, to, now);
}
