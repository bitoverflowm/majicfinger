/**
 * Points for the Spectrum portfolio chart.
 * Value is the all-in economic result. Basis is realized PnL.
 * Drawdown is the decline from the running peak, including a peak below zero.
 */
import { sheetRecords } from "@/lib/visualizations/datasetDescriptor";

const DAY_MS = 86_400_000;

function num(value) {
  if (value == null || value === "") return null;
  const n = Number(String(value).trim().replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function timeMs(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return n < 1e12 ? n * 1000 : n;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Percent below the running peak. A positive peak matches the chart's
 * original formula. A negative peak still shades the decline from the best point.
 * @param {number[]} values
 */
export function portfolioDrawdowns(values) {
  const out = [];
  let peak = -Infinity;
  for (const value of values || []) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      out.push(0);
      continue;
    }
    peak = Math.max(peak, n);
    if (!Number.isFinite(peak) || peak === 0) out.push(0);
    else out.push(((n - peak) / Math.abs(peak)) * 100);
  }
  return out;
}

/**
 * @param {object | null | undefined} sheet
 * @returns {{ t: number, value: number, basis: number }[]}
 */
export function pnlPortfolioPoints(sheet) {
  const points = [];
  for (const record of sheetRecords(sheet)) {
    const t = timeMs(record?.timestamp);
    const value = num(record?.economic_pnl) ?? num(record?.position_pnl) ?? num(record?.trade_pnl);
    if (t == null || value == null) continue;
    const basis = num(record?.realized_pnl);
    points.push({ t, value, basis: basis == null ? value : basis });
  }
  points.sort((a, b) => a.t - b.t);
  return points;
}

/**
 * Range pills count points, so the step of this series decides how many
 * points a week or a year is.
 * @param {{ t: number }[]} points
 */
export function pnlPortfolioRanges(points) {
  const windows = [
    ["1W", 7 * DAY_MS],
    ["1M", 30 * DAY_MS],
    ["3M", 90 * DAY_MS],
    ["6M", 180 * DAY_MS],
    ["1Y", 365 * DAY_MS],
  ];
  const list = Array.isArray(points) ? points : [];
  if (list.length < 2) return [{ label: "ALL", bars: null }];
  const gaps = [];
  for (let i = 1; i < list.length; i += 1) gaps.push(list[i].t - list[i - 1].t);
  gaps.sort((a, b) => a - b);
  const step = gaps[Math.floor(gaps.length / 2)];
  if (!Number.isFinite(step) || step <= 0) return [{ label: "ALL", bars: null }];
  return [
    ...windows.map(([label, ms]) => ({ label, bars: Math.max(2, Math.round(ms / step)) })),
    { label: "ALL", bars: null },
  ];
}
