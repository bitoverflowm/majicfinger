import { startOfQuarter, startOfYear, subDays, subMonths } from "date-fns";

export const DATE_RANGE_PRESETS = [
  { id: "past-24h", label: "Past 24 hours" },
  { id: "past-3d", label: "Past 3 days" },
  { id: "past-7d", label: "Past 7 days" },
  { id: "past-month", label: "Past month" },
  { id: "this-quarter", label: "This quarter" },
  { id: "this-year", label: "This year" },
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
