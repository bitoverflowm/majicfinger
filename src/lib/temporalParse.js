/**
 * Parse dashboard time-bucket labels and timestamps to UTC milliseconds for chart scales.
 * Covers Athena compose buckets (month, quarter, year, day), named months, and epoch sec/ms.
 */

export function temporalToMs(value) {
  if (value == null || value === "") return NaN;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) {
    const abs = Math.abs(value);
    if (abs >= 1e11) return value; // epoch ms
    if (abs >= 1e9) return value * 1000; // epoch sec
  }
  const s = String(value).trim();
  const monthMap = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };
  const monthYear = s.match(/^([A-Za-z]+)(?:\s+(\d{1,2}))?(?:,?\s+(\d{4}))?$/);
  if (monthYear) {
    const monthToken = String(monthYear[1]).toLowerCase();
    if (Object.prototype.hasOwnProperty.call(monthMap, monthToken)) {
      const monthIdx = monthMap[monthToken];
      const day = monthYear[2] ? Math.min(31, Math.max(1, Number(monthYear[2]) || 1)) : 1;
      const year = monthYear[3] ? Number(monthYear[3]) : 2000;
      const ms = Date.UTC(year, monthIdx, day);
      if (Number.isFinite(ms)) return ms;
    }
  }
  const isoYearMonth = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (isoYearMonth) {
    const year = Number(isoYearMonth[1]);
    const month = Number(isoYearMonth[2]);
    if (month >= 1 && month <= 12) return Date.UTC(year, month - 1, 1);
  }
  const monthYearNumeric = s.match(/^(\d{1,2})[-/](\d{4})$/);
  if (monthYearNumeric) {
    const month = Number(monthYearNumeric[1]);
    const year = Number(monthYearNumeric[2]);
    if (month >= 1 && month <= 12) return Date.UTC(year, month - 1, 1);
  }
  const quarterMatch = s.match(/^Q([1-4])\s*'?\s*(\d{2})$/i);
  if (quarterMatch) {
    const quarter = Number(quarterMatch[1]);
    const yy = Number(quarterMatch[2]);
    const year = yy >= 70 ? 1900 + yy : 2000 + yy;
    const monthIndex = (quarter - 1) * 3;
    return Date.UTC(year, monthIndex, 1);
  }
  const yearOnly = s.match(/^(\d{4})$/);
  if (yearOnly) {
    const year = Number(yearOnly[1]);
    if (Number.isFinite(year)) return Date.UTC(year, 0, 1);
  }
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    const abs = Math.abs(n);
    if (abs >= 1e11) return n;
    if (abs >= 1e9) return n * 1000;
  }
  return Date.parse(s);
}
