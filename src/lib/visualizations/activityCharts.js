/**
 * Default charts for a trader activity sheet.
 * The calendar counts actions per day. The stacked bar is USDC per day,
 * split by activity type and by buy or sell.
 */
import { activityTypeLabel, buildActivityRichTable } from "@/lib/visualizations/activityRichTable";
import { describeSheet, sheetRecords } from "@/lib/visualizations/datasetDescriptor";
import { mixSrgbHex } from "@/components/spectrumui/charts/heatmapColors";
import { TRADER_ACTIVITY_TYPES } from "@/lib/polymarketLive/traderActivityCompose";

export const LYCHEE_RED = "#E63946";

const DAY_MS = 86_400_000;

const TYPE_ORDER = TRADER_ACTIVITY_TYPES.map(([value]) => value);

/** First type's buys are lychee red. Later types and sell slices stay in that family. */
const TYPE_BASES = [
  LYCHEE_RED,
  "#C1121F",
  "#F4A4A8",
  "#6A040F",
  "#E85D4C",
  "#9B2226",
  "#FFB4A2",
  "#370617",
  "#E11D48",
  "#FDA4AF",
  "#881337",
  "#FECACA",
  "#BE123C",
];

const DAY_LABEL = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function dayStart(ms) {
  const date = new Date(ms);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function datedRows(rows) {
  return (rows || []).filter((row) => row?.ms != null);
}

/**
 * One cell per calendar day from the first action through the last.
 * `value` is the number of actions that day.
 * @param {{ ms: number | null }[]} rows
 */
export function activityDailyCounts(rows) {
  const dated = datedRows(rows);
  if (!dated.length) return [];
  const counts = new Map();
  for (const row of dated) {
    const t = dayStart(row.ms);
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  const first = Math.min(...counts.keys());
  const last = Math.max(...counts.keys());
  const days = [];
  for (let t = first; t <= last; t += DAY_MS) {
    days.push({ t, value: counts.get(t) || 0 });
  }
  return days;
}

function stackSide(side) {
  const value = String(side || "").toUpperCase();
  if (value === "BUY" || value === "SELL") return value;
  return "";
}

function dollarsOf(row) {
  const n = Number(row?.usdc);
  if (!Number.isFinite(n) || n === 0) return 0;
  return Math.abs(n);
}

function seriesId(type, side) {
  const base = String(type || "other").toLowerCase().replace(/[^a-z0-9]+/g, "") || "other";
  if (side === "BUY") return `${base}Buy`;
  if (side === "SELL") return `${base}Sell`;
  return base;
}

function seriesLabel(type, side) {
  const name = activityTypeLabel(type) || type;
  if (side === "BUY") return `${name} · Buy`;
  if (side === "SELL") return `${name} · Sell`;
  return name;
}

function seriesColor(type, side) {
  const index = TYPE_ORDER.indexOf(type);
  const base = TYPE_BASES[(index === -1 ? TYPE_ORDER.length : index) % TYPE_BASES.length];
  if (side === "SELL") return mixSrgbHex(base, "#1A0508", 0.62);
  if (side === "BUY") return base;
  return mixSrgbHex(base, "#FFFFFF", 0.55);
}

/**
 * One bar per day that moved cash. Height is USDC.
 * Each slice is an activity type, split again when the row is a buy or a sell.
 * @param {{ ms: number | null, type?: string, side?: string, usdc?: number | null }[]} rows
 */
export function activityStackModel(rows) {
  const dated = datedRows(rows);
  if (!dated.length) return { data: [], series: [] };

  /** @type {Map<string, { id: string, type: string, side: string, label: string, total: number }>} */
  const meta = new Map();
  /** @type {Map<number, { t: number, total: number } & Record<string, number>>} */
  const byDay = new Map();

  for (const row of dated) {
    const dollars = dollarsOf(row);
    if (!dollars) continue;
    const type = String(row.type || "OTHER").toUpperCase();
    const side = stackSide(row.side);
    const id = seriesId(type, side);
    if (!meta.has(id)) meta.set(id, { id, type, side, label: seriesLabel(type, side), total: 0 });
    meta.get(id).total += dollars;
    const t = dayStart(row.ms);
    if (!byDay.has(t)) byDay.set(t, { t, total: 0 });
    const day = byDay.get(t);
    day[id] = (day[id] || 0) + dollars;
    day.total += dollars;
  }

  const series = [...meta.values()]
    .sort((a, b) => {
      const ai = TYPE_ORDER.indexOf(a.type);
      const bi = TYPE_ORDER.indexOf(b.type);
      const at = ai === -1 ? TYPE_ORDER.length : ai;
      const bt = bi === -1 ? TYPE_ORDER.length : bi;
      if (at !== bt) return at - bt;
      const rank = { BUY: 0, SELL: 1, "": 2 };
      return (rank[a.side] ?? 3) - (rank[b.side] ?? 3);
    })
    .map((item) => ({
      id: item.id,
      label: item.label,
      color: seriesColor(item.type, item.side),
    }));

  if (!series.length) return { data: [], series: [] };

  const data = [...byDay.values()]
    .sort((a, b) => a.t - b.t)
    .map((day) => {
      const point = { t: day.t, label: DAY_LABEL.format(day.t) };
      for (const item of series) point[item.id] = day[item.id] || 0;
      return point;
    });

  return { data, series };
}

export function activityChartRows(sheet) {
  const dataset = describeSheet(sheet);
  return buildActivityRichTable(sheetRecords(sheet), dataset).rows;
}

/**
 * The two charts Create chart adds for a trader activity sheet.
 * @param {string} title
 */
export function defaultActivityCharts(title) {
  const base = String(title || "Activity").replace(/\s+chart$/, "").trim() || "Activity";
  return [
    { chartView: "activity-calendar", title: `${base} · daily`, w: 720, h: 300 },
    { chartView: "activity-stack", title: `${base} · dollars`, w: 720, h: 380 },
  ];
}
