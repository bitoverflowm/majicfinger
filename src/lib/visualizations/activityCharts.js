/**
 * Default charts for a trader activity sheet.
 * The calendar counts actions per day. The stacked bar counts the same
 * actions, split by type and by buy or sell. Cash size is not a weight.
 */
import { activityTypeLabel, buildActivityRichTable } from "@/lib/visualizations/activityRichTable";
import { describeSheet, sheetRecords } from "@/lib/visualizations/datasetDescriptor";
import { TRADER_ACTIVITY_TYPES } from "@/lib/polymarketLive/traderActivityCompose";

export const LYCHEE_RED = "#E63946";

const DAY_MS = 86_400_000;

const TYPE_ORDER = TRADER_ACTIVITY_TYPES.map(([value]) => value);

/** Buy is lychee red. Sell and unsided actions stay in that family so the stack stays readable. */
const STACK_SIDES = [
  { id: "buy", side: "BUY", label: "Buy", color: LYCHEE_RED },
  { id: "sell", side: "SELL", label: "Sell", color: "#9B2330" },
  { id: "none", side: "", label: "No side", color: "#F0999F" },
];

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

function stackBucket(side) {
  const value = String(side || "").toUpperCase();
  if (value === "BUY" || value === "SELL") return value;
  return "";
}

/**
 * One bar per activity type. Segments are buy, sell, and actions with neither.
 * @param {{ ms: number | null, type?: string, side?: string }[]} rows
 */
export function activityStackModel(rows) {
  const dated = datedRows(rows);
  if (!dated.length) return { data: [], series: [] };

  /** @type {Map<string, Record<string, number> & { type: string, total: number }>} */
  const byType = new Map();
  const used = new Set();
  for (const row of dated) {
    const type = String(row.type || "OTHER").toUpperCase();
    const side = stackBucket(row.side);
    const bucket = STACK_SIDES.find((item) => item.side === side) || STACK_SIDES[2];
    used.add(bucket.id);
    if (!byType.has(type)) byType.set(type, { type, total: 0 });
    const point = byType.get(type);
    point[bucket.id] = (point[bucket.id] || 0) + 1;
    point.total += 1;
  }

  const data = [...byType.values()]
    .sort((a, b) => {
      const ai = TYPE_ORDER.indexOf(a.type);
      const bi = TYPE_ORDER.indexOf(b.type);
      const at = ai === -1 ? TYPE_ORDER.length : ai;
      const bt = bi === -1 ? TYPE_ORDER.length : bi;
      if (at !== bt) return at - bt;
      return b.total - a.total || a.type.localeCompare(b.type);
    })
    .map((point) => {
      const row = { label: activityTypeLabel(point.type) || point.type };
      for (const side of STACK_SIDES) row[side.id] = point[side.id] || 0;
      return row;
    });

  const series = STACK_SIDES.filter((side) => used.has(side.id)).map((side) => ({
    id: side.id,
    label: side.label,
    color: side.color,
  }));
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
    { chartView: "activity-stack", title: `${base} · by type`, w: 640, h: 380 },
  ];
}
