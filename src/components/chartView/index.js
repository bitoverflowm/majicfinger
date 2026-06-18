"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  SHADCN_CHART_BASE_ORDER,
  getShadcnChartPaletteArray,
} from '@/components/chartView/panels/shadcnChartPalettes';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Pie, PieChart, ReferenceLine, Scatter, ScatterChart, Treemap, XAxis, YAxis, ZAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { RainbowBarLegendContent } from "@/components/chartView/RainbowBarLegendContent";
import { rainbowBarFillFromPalette } from "@/components/chartView/rainbowBarFill";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Square, Radio } from 'lucide-react';
import { Liveline } from 'liveline';

import { useMyStateV2 } from '@/context/stateContextV2';
import ChartControls from '@/components/chartView/ChartControls';
import { TreemapCategoryRect } from '@/components/chartView/treemapCategoryContent';
import { extrapolateColorsFromPalette } from '@/components/chartView/paletteExtrapolation';
import { toPng, toSvg, toJpeg } from 'html-to-image';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  applyCartesianSeriesNormalization,
  coerceChartPlotNumber,
  sanitizeCartesianRowsForPlotting,
} from "@/lib/chartDataSanitize";
import { isCategoricalLabelColumn, looksLikeProseLabelValue } from "@/lib/chartCategoricalColumns";
import { stripSheetScopedColumnKey } from "@/lib/chartColumnDisplay";
import {
  numericXExtents,
  sampleReferenceEquationCurve,
  validateReferenceEquation,
} from "@/lib/chartReferenceEquation";
import { temporalToMs } from "@/lib/temporalParse";
import { downsampleRowsForChart } from "@/lib/chartRenderCap";
import { pivotBarChartBySeries } from "@/components/chartView/pivotBarChartData";
import { resolveChartSeriesLabel } from "@/lib/chartLineLabels";

const ChartBuilderContext = createContext(null);

/** Open Graph / social previews (Facebook, LinkedIn, X) recommend 1200×630. */
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("OG image load failed"));
    img.src = dataUrl;
  });
}

export function useChartBuilder() {
  const v = useContext(ChartBuilderContext);
  if (!v) throw new Error("useChartBuilder must be used within <ChartBuilderProvider>.");
  return v;
}

export const LIVELINE_WINDOWS = [
  { label: '1m', secs: 60 },
  { label: '5m', secs: 300 },
  { label: '15m', secs: 900 },
];

export const CHART_TIMEFRAME_OPTIONS = [
  { label: "15m", value: "15m", ms: 15 * 60 * 1000 },
  { label: "1h", value: "1h", ms: 60 * 60 * 1000 },
  { label: "1d", value: "1d", ms: 24 * 60 * 60 * 1000 },
  { label: "1w", value: "1w", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "1m", value: "1mo", calendar: "month" },
  { label: "1y", value: "1y", calendar: "year" },
];

export const LIVELINE_COLOR_OPTIONS = [
  { label: 'Palette (auto)', value: '__palette__' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
];

export const dfltChartData = [
  { month: 'January', desktop: 186, mobile: 80, other: 45 },
  { month: 'February', desktop: 305, mobile: 200, other: 100 },
  { month: 'March', desktop: 237, mobile: 120, other: 150 },
  { month: 'April', desktop: 73, mobile: 190, other: 50 },
  { month: 'May', desktop: 209, mobile: 130, other: 100 },
  { month: 'June', desktop: 214, mobile: 140, other: 160 },
];

export const dfltChartConfig = {
  desktop: { label: 'Desktop', color: 'hsl(347 77% 50%)' },
  mobile: { label: 'Mobile', color: 'hsl(212 97% 87%)' },
  other: { label: 'Other', color: 'hsl(142 88% 28%)' },
};

/** Stable ChartContainer `id` → `data-chart="chart-…"` for scoped rules below. */
const CHART_BUILDER_DOM_ID = "mf-chart-builder";
/** Tooltip / legend root class targeted when `chartTextColor` is set (Tailwind tooltip spans otherwise win). */
const CHART_CHROME_TEXT_CLASS = "mf-chart-chrome-text";

/** Recharts Y-axis `width` eats left space; `margin.right` must be larger than `margin.left` so the grid isn’t flush to the SVG edge. */
const CARTESIAN_MARGIN_AREA_LINE = { left: 20, right: 72, top: 0, bottom: 0 };
/** Bar only: extra left margin so the first band doesn’t sit on Y-axis tick labels. */
const CARTESIAN_MARGIN_BAR = { left: 32, right: 76 };
/** Bar only: Recharts insets the X scale range in px so the first/last bars aren’t flush to the plot edge. */
const BAR_X_AXIS_PADDING = { left: 28, right: 28 };

/** Select sentinel: no X axis chosen yet (must not match a real column name). */
export const CHART_X_AXIS_NONE = "__chart_x_axis_none__";

/** Line series sentinel: plot X-axis values as Y (y = x / perfect calibration). */
export const CHART_X_AXIS_IDENTITY_LINE = "__chart_x_axis_identity__";

export function isChartXAxisIdentityLine(value) {
  return String(value || "") === CHART_X_AXIS_IDENTITY_LINE;
}

/** Sheet rows store plain column names; axis keys from the builder are often `sheetId::column`. */
function rowValueForDataKey(row, key) {
  if (!row || key == null || key === "") return undefined;
  if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  const s = String(key);
  const splitIdx = s.indexOf("::");
  if (splitIdx > 0) {
    const col = s.slice(splitIdx + 2);
    if (col && Object.prototype.hasOwnProperty.call(row, col)) return row[col];
  }
  return undefined;
}

export function getAxisType(key, dataTypes, data) {
  const skey = String(key || "");
  const descoped = skey.includes("::") ? skey.slice(skey.indexOf("::") + 2) : null;
  if (isCategoricalLabelColumn(descoped || skey)) return "string";
  const dt = dataTypes && (dataTypes[skey] ?? (descoped ? dataTypes[descoped] : undefined));
  if (dt) {
    const t = dt;
    if (t === "number" || t === "date") return t;
    // Stale/wrong "string" in context — infer from actual rows so charts sort and scale correctly.
    if (data?.length) {
      const v = rowValueForDataKey(data[0], key);
      if (typeof v === "number" && Number.isFinite(v)) return "number";
      if (v instanceof Date) return "date";
      const n = Number(v);
      if (v != null && v !== "" && !Number.isNaN(n) && Number.isFinite(n)) return "number";
      if (typeof v === "string" && !looksLikeProseLabelValue(v) && Number.isFinite(temporalToMs(v))) return "date";
    }
    return "string";
  }
  if (!data || !data.length) return "string";
  const v = rowValueForDataKey(data[0], key);
  if (v instanceof Date) return "date";
  if (typeof v === "number" && Number.isFinite(v)) return "number";
  if (typeof v === "string" && /^\d{4}-\d{2}/.test(v)) return "date";
  const n = Number(v);
  if (v != null && v !== "" && !Number.isNaN(n) && Number.isFinite(n)) return "number";
  return "string";
}

function isLikelyTemporalKey(key, dataTypes, data) {
  if (!key) return false;
  const keyNorm = String(key).toLowerCase();
  const keyTail = keyNorm.includes("::") ? keyNorm.slice(keyNorm.indexOf("::") + 2) : keyNorm;
  if (isCategoricalLabelColumn(keyTail)) return false;
  if (getAxisType(key, dataTypes, data) === "date") return true;
  if (/(time|timestamp|date|datetime|createdat|updatedat|ts)/.test(keyTail)) return true;
  const rows = Array.isArray(data) ? data : [];
  for (let i = 0; i < Math.min(rows.length, 30); i += 1) {
    const raw = rowValueForDataKey(rows[i], key);
    if (looksLikeProseLabelValue(raw)) continue;
    if (raw == null || raw === "") continue;
    if (typeof raw === "string" && Number.isFinite(temporalToMs(raw))) return true;
  }
  let temporalLikeCount = 0;
  let nonEmptyCount = 0;
  for (let i = 0; i < Math.min(rows.length, 50); i += 1) {
    const raw = rowValueForDataKey(rows[i], key);
    if (looksLikeProseLabelValue(raw)) continue;
    if (raw == null || raw === "") continue;
    nonEmptyCount += 1;
    const n = Number(raw);
    if (Number.isFinite(n)) {
      if (Number.isFinite(temporalToMs(n))) return true; // unix epoch sec/ms/us/ns-like
    } else if (typeof raw === "string") {
      const s = raw.trim();
      if (
        /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\w*(\s+\d{1,2})?(,?\s+\d{4})?$/i.test(s) ||
        /^\d{4}[-/]\d{1,2}$/.test(s) ||
        /^\d{1,2}[-/]\d{4}$/.test(s) ||
        /^\d{4}-\d{2}-\d{2}/.test(s)
      ) {
        temporalLikeCount += 1;
      }
    }
    if (nonEmptyCount >= 3 && temporalLikeCount >= 2) return true;
  }
  return false;
}

/** Pick tick label granularity from span so intraday series show time, not only "Apr 13, 2026" on every tick. */
export function temporalIntlFormatOptionsForRange(rangeMs) {
  const MS = 1000;
  const MIN = 60 * MS;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  if (!Number.isFinite(rangeMs) || rangeMs < 0) {
    return { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" };
  }
  if (rangeMs < 2 * MIN) {
    return { hour: "2-digit", minute: "2-digit", second: "2-digit" };
  }
  if (rangeMs < DAY) {
    return { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", year: "numeric" };
  }
  if (rangeMs < 7 * DAY) {
    return { weekday: "short", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", year: "numeric" };
  }
  if (rangeMs < 120 * DAY) {
    return { month: "short", day: "2-digit", year: "numeric" };
  }
  return { year: "numeric", month: "short" };
}

const MONTH_ABBREV_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const X_DATE_FORMAT_PRESETS = [
  { value: "auto", label: "Auto" },
  { value: "dd", label: "DD" },
  { value: "mm", label: "MM" },
  { value: "mmm", label: "MMM" },
  { value: "dd/mm", label: "DD/MM" },
  { value: "mm/dd", label: "MM/DD" },
  { value: "mmm d", label: "MMM D" },
  { value: "dd-mmm", label: "DD-MMM" },
  { value: "d-mm-yy", label: "D-MM-YY" },
  { value: "dd/mm/yy", label: "DD/MM/YY" },
  { value: "mm/dd/yy", label: "MM/DD/YY" },
  { value: "yyyy", label: "YYYY" },
  { value: "yyyy-mm", label: "YYYY-MM" },
  { value: "time_hm", label: "Time (HH:mm)" },
  { value: "datetime_dm", label: "Date & time (DD/MM/YY HH:mm)" },
  { value: "day_hour", label: "Day & hour (DD HH)" },
  { value: "day_hms", label: "Day, hour, minute, second (DD/MM/YY HH:mm:ss)" },
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatEpochMsWithPreset(ms, preset) {
  const p = String(preset || "auto").toLowerCase();
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getUTCFullYear();
  const yy = String(yyyy).slice(-2);
  const mm = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  const mmm = MONTH_ABBREV_EN[d.getUTCMonth()] ?? "";
  const HH = pad2(d.getUTCHours());
  const MI = pad2(d.getUTCMinutes());
  const SS = pad2(d.getUTCSeconds());
  if (p === "dd") return dd;
  if (p === "mm") return mm;
  if (p === "mmm") return mmm;
  if (p === "dd/mm") return `${dd}/${mm}`;
  if (p === "mm/dd") return `${mm}/${dd}`;
  if (p === "mmm d") return `${mmm} ${Number(dd)}`;
  if (p === "dd-mmm") return `${dd}-${mmm}`;
  if (p === "d-mm-yy") return `${Number(dd)}-${mm}-${yy}`;
  if (p === "dd/mm/yy") return `${dd}/${mm}/${yy}`;
  if (p === "mm/dd/yy") return `${mm}/${dd}/${yy}`;
  if (p === "yyyy") return String(yyyy);
  if (p === "yyyy-mm") return `${yyyy}-${mm}`;
  if (p === "time_hm") return `${HH}:${MI}`;
  if (p === "datetime_dm") return `${dd}/${mm}/${yy} ${HH}:${MI}`;
  if (p === "day_hour") return `${dd} ${HH}`;
  if (p === "day_hms") return `${dd}/${mm}/${yy} ${HH}:${MI}:${SS}`;
  return "";
}

/**
 * Local calendar label as dd-mmm (e.g. 08-Apr). Shorter than full datetime so angled ticks fit.
 * @param {number} _rangeMs reserved for future granularity (unused)
 */
export function formatXAxisValue(value, temporal, humanReadable = true, _intlOptions = null, rangeMs = null) {
  if (!temporal || !humanReadable) return value;
  if (value == null || value === "") return "";
  const ms = temporalToMs(value);
  if (!Number.isFinite(ms)) return String(value);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(value);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mmm = MONTH_ABBREV_EN[d.getUTCMonth()] ?? "";
  const span = Number(rangeMs);
  const showYear = Number.isFinite(span) && span > 90 * 24 * 60 * 60 * 1000;
  return showYear ? `${dd}-${mmm}-${d.getUTCFullYear()}` : `${dd}-${mmm}`;
}

function toSortableXAxisValue(value, axisType, isTemporal) {
  if (isTemporal || axisType === "date") {
    const ts = temporalToMs(value);
    return Number.isFinite(ts) ? ts : Number.POSITIVE_INFINITY;
  }
  if (axisType === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
  }
  return String(value ?? "").toLowerCase();
}

/**
 * Recharts line/area/bar need a numeric X scale for time series. Date objects and unix epochs
 * otherwise fall back to category mode and can collapse to a single visible point.
 */
function normalizeCartesianPivotToEpochMs(rows, xKey, xAxisType, lineIsTemporalX, enabled) {
  if (!enabled || !Array.isArray(rows) || !rows.length || !xKey) return rows;
  const should =
    xAxisType === "date" ||
    (xAxisType === "number" && lineIsTemporalX) ||
    (xAxisType === "string" && lineIsTemporalX);
  if (!should) return rows;
  return rows.map((row) => {
    const raw = row?.[xKey];
    let ms = NaN;
    if (raw instanceof Date) ms = raw.getTime();
    else if (raw != null && raw !== "") ms = temporalToMs(raw);
    if (!Number.isFinite(ms)) return { ...row };
    return { ...row, [xKey]: ms };
  });
}

function getChartTimeframeOption(value) {
  const v = String(value || "");
  return CHART_TIMEFRAME_OPTIONS.find((opt) => opt.value === v) || CHART_TIMEFRAME_OPTIONS[0];
}

function bucketStartMs(ms, option) {
  if (!Number.isFinite(ms) || !option) return NaN;
  if (option.calendar === "year") return Date.UTC(new Date(ms).getUTCFullYear(), 0, 1);
  if (option.calendar === "month") {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  }
  const step = Number(option.ms);
  if (!Number.isFinite(step) || step <= 0) return NaN;
  if (option.value === "1w") {
    const dayStart = Math.floor(ms / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);
    const dayOfWeek = new Date(dayStart).getUTCDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    return dayStart - daysSinceMonday * 24 * 60 * 60 * 1000;
  }
  return Math.floor(ms / step) * step;
}

function bucketTemporalRowsForChart(rows, xKey, yKeys, timeframeValue, sortDir = "asc") {
  if (!Array.isArray(rows) || rows.length <= 1 || !xKey) return rows;
  const option = getChartTimeframeOption(timeframeValue);
  const buckets = new Map();
  for (let idx = 0; idx < rows.length; idx += 1) {
    const row = rows[idx];
    const ms = temporalToMs(row?.[xKey]);
    if (!Number.isFinite(ms)) continue;
    const bucketMs = bucketStartMs(ms, option);
    if (!Number.isFinite(bucketMs)) continue;
    const key = String(bucketMs);
    if (!buckets.has(key)) {
      buckets.set(key, {
        bucketMs,
        lastIdx: idx,
        lastRow: row,
        sums: Object.create(null),
        counts: Object.create(null),
      });
    }
    const bucket = buckets.get(key);
    if (idx >= bucket.lastIdx) {
      bucket.lastIdx = idx;
      bucket.lastRow = row;
    }
    for (const yKey of yKeys || []) {
      const rawY = row?.[yKey];
      if (rawY == null || rawY === "") continue;
      const n = Number(rawY);
      if (!Number.isFinite(n)) continue;
      bucket.sums[yKey] = (bucket.sums[yKey] || 0) + n;
      bucket.counts[yKey] = (bucket.counts[yKey] || 0) + 1;
    }
  }
  if (!buckets.size) return rows;
  const ordered = Array.from(buckets.values())
    .sort((a, b) => a.bucketMs - b.bucketMs)
    .map((bucket) => {
      const out = { ...(bucket.lastRow || {}), [xKey]: bucket.bucketMs };
      for (const yKey of yKeys || []) {
        const count = bucket.counts[yKey] || 0;
        out[yKey] = count > 0 ? bucket.sums[yKey] / count : null;
      }
      return out;
    });
  return sortDir === "desc" ? ordered.reverse() : ordered;
}

function normalizeChartLineFilters(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((rule, idx) => {
      if (!rule || typeof rule !== "object") return null;
      const id = String(rule.id || `filter-${idx}-${Date.now()}`);
      const seriesKey = String(rule.seriesKey || "");
      const column = String(rule.column || "");
      const operator = String(rule.operator || "=");
      const next = {
        id,
        seriesKey,
        column,
        operator,
        value: rule.value ?? "",
      };
      return next.seriesKey ? next : null;
    })
    .filter(Boolean);
}

function normalizeReferenceLines(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((line, idx) => {
      if (!line || typeof line !== "object") return null;
      const kind = ["x", "y", "segment", "equation"].includes(line.kind) ? line.kind : "y";
      const color = typeof line.color === "string" && line.color.trim() ? line.color : "#ef4444";
      const style = ["solid", "dashed", "dotted"].includes(line.style) ? line.style : "dashed";
      const strokeWidth = Math.max(1, Math.min(8, Number(line.strokeWidth) || 1));
      return {
        id: String(line.id || `reference-line-${idx}`),
        kind,
        enabled: line.enabled !== false,
        label: line.label == null ? "" : String(line.label),
        color,
        style,
        strokeWidth,
        equation: line.equation == null ? "" : String(line.equation),
        x: line.x == null ? "" : String(line.x),
        y: line.y == null ? "" : String(line.y),
        x1: line.x1 == null ? "" : String(line.x1),
        y1: line.y1 == null ? "" : String(line.y1),
        x2: line.x2 == null ? "" : String(line.x2),
        y2: line.y2 == null ? "" : String(line.y2),
      };
    })
    .filter(Boolean);
}

function coerceReferenceAxisValue(value, axisType, isTemporal = false) {
  if (value == null || value === "") return undefined;
  if (isTemporal || axisType === "date") {
    const ms = temporalToMs(value);
    return Number.isFinite(ms) ? ms : value;
  }
  if (axisType === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return value;
}

function referenceLineDash(style) {
  if (style === "dotted") return "1 4";
  if (style === "dashed") return "4 4";
  return undefined;
}

function coerceComparableValue(value) {
  if (value == null || value === "") return { kind: "empty", value: "" };
  const ms = temporalToMs(value);
  if (Number.isFinite(ms)) return { kind: "number", value: ms };
  const n = Number(value);
  if (Number.isFinite(n)) return { kind: "number", value: n };
  return { kind: "string", value: String(value).toLowerCase() };
}

function chartFilterRuleMatches(row, rule) {
  if (!rule?.column || !rule?.operator) return true;
  const raw = rowValueForDataKey(row, rule.column);
  const op = String(rule.operator || "=");
  if (op === "is_empty") return raw == null || raw === "";
  if (op === "is_not_empty") return raw != null && raw !== "";
  const expected = rule.value;
  if (op === "date_range" || (expected && typeof expected === "object" && ("from" in expected || "to" in expected))) {
    const hasFrom = Boolean(expected?.from);
    const hasTo = Boolean(expected?.to);
    if (!hasFrom && !hasTo) return true;
    const rawMs = temporalToMs(raw);
    if (!Number.isFinite(rawMs)) return false;
    const fromMs = expected?.from ? temporalToMs(expected.from) : NaN;
    const toBaseMs = expected?.to ? temporalToMs(expected.to) : NaN;
    const toMs = Number.isFinite(toBaseMs) ? toBaseMs + 24 * 60 * 60 * 1000 - 1 : NaN;
    if (Number.isFinite(fromMs) && rawMs < fromMs) return false;
    if (Number.isFinite(toMs) && rawMs > toMs) return false;
    return Number.isFinite(fromMs) || Number.isFinite(toMs);
  }
  if (expected == null || expected === "") return true;
  if (op === "contains" || op === "not_contains") {
    const hit = String(raw ?? "").toLowerCase().includes(String(expected).toLowerCase());
    return op === "not_contains" ? !hit : hit;
  }
  const left = coerceComparableValue(raw);
  const right = coerceComparableValue(expected);
  const comparable = left.kind === "number" && right.kind === "number";
  const a = comparable ? left.value : String(raw ?? "").toLowerCase();
  const b = comparable ? right.value : String(expected ?? "").toLowerCase();
  if (op === "=" || op === "eq") return a === b;
  if (op === "!=" || op === "ne") return a !== b;
  if (op === ">" || op === "gt") return comparable ? a > b : String(a).localeCompare(String(b)) > 0;
  if (op === ">=" || op === "gte") return comparable ? a >= b : String(a).localeCompare(String(b)) >= 0;
  if (op === "<" || op === "lt") return comparable ? a < b : String(a).localeCompare(String(b)) < 0;
  if (op === "<=" || op === "lte") return comparable ? a <= b : String(a).localeCompare(String(b)) <= 0;
  return true;
}

function materializeChartSeriesRows(rows, ySeries, filters, xKey) {
  if (!Array.isArray(rows) || !rows.length || !Array.isArray(ySeries) || !ySeries.length) return rows;
  const seriesById = new Map(ySeries.map((series) => [series.id, series]));
  const firstSeriesBySource = new Map();
  for (const series of ySeries) {
    if (!firstSeriesBySource.has(series.sourceKey)) firstSeriesBySource.set(series.sourceKey, series);
  }
  const normalized = normalizeChartLineFilters(filters)
    .map((rule) => {
      const target = seriesById.get(rule.seriesKey) || firstSeriesBySource.get(rule.seriesKey);
      return target ? { ...rule, seriesKey: target.id } : null;
    })
    .filter((rule) => rule?.column);
  const bySeries = new Map();
  for (const rule of normalized) {
    if (!bySeries.has(rule.seriesKey)) bySeries.set(rule.seriesKey, []);
    bySeries.get(rule.seriesKey).push(rule);
  }
  return rows.map((row) => {
    const next = { ...row };
    for (const series of ySeries) {
      const rules = bySeries.get(series.id);
      const keep = !rules?.length || rules.every((rule) => chartFilterRuleMatches(row, rule));
      const valueKey = series.usesXAxisValues ? xKey : series.sourceKey;
      const rawY = keep ? rowValueForDataKey(row, valueKey) : null;
      const coercedY = rawY == null || rawY === "" ? null : coerceChartPlotNumber(rawY);
      next[series.renderKey] = coercedY == null && rawY !== null && rawY !== "" ? rawY : coercedY;
    }
    return next;
  }).filter((row) => ySeries.some((series) => row?.[series.renderKey] != null && row?.[series.renderKey] !== ""));
}

function getDistinctValues(data, colKey) {
  const set = new Set();
  (data || []).forEach((row) => {
    const v = row?.[colKey];
    if (v != null && v !== "") set.add(String(v));
  });
  return Array.from(set).sort();
}

function formatCompactNumber(value) {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(abs >= 1e13 ? 0 : 1).replace(/\.0$/, "")}t`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(abs >= 1e10 ? 0 : 1).replace(/\.0$/, "")}b`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(abs >= 1e7 ? 0 : 1).replace(/\.0$/, "")}m`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(abs >= 1e4 ? 0 : 1).replace(/\.0$/, "")}k`;
  return `${Math.round(value * 100) / 100}`;
}

function stableHashIndex(value, modulo) {
  const n = Math.max(1, Number(modulo) || 1);
  const s = String(value ?? "");
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % n;
}

function parseScopedColumnKey(value, fallbackSheetId) {
  const raw = String(value || "");
  const splitIdx = raw.indexOf("::");
  if (splitIdx > 0) {
    return {
      raw,
      sheetId: raw.slice(0, splitIdx),
      column: raw.slice(splitIdx + 2),
      isScoped: true,
    };
  }
  return {
    raw,
    sheetId: fallbackSheetId || null,
    column: raw,
    isScoped: false,
  };
}

export function ChartBuilderProvider({ demo, children, initialBuilderSnapshot, embedCompact = false, onSnapshotGetterReady = null }) {
  const contextStateV2 = useMyStateV2();
  const chartRef = useRef(null);

  const connectedCols = contextStateV2?.connectedCols;
  const connectedData = contextStateV2?.connectedData;
  const setViewing = contextStateV2?.setViewing;
  const dataTypes = contextStateV2?.dataTypes;

  const chartDataOverride = contextStateV2?.chartDataOverride;
  const setChartDataOverride = contextStateV2?.setChartDataOverride;
  const chartDataOverrideMeta = contextStateV2?.chartDataOverrideMeta;
  const setChartDataOverrideMeta = contextStateV2?.setChartDataOverrideMeta;

  const polymarketWsState = contextStateV2?.polymarketWsState;
  const chainlinkWsState = contextStateV2?.chainlinkWsState;

  const effectiveData = (chartDataOverride && Array.isArray(chartDataOverride) && chartDataOverride.length) ? chartDataOverride : connectedData;
  const effectiveCols = (chartDataOverride && Array.isArray(chartDataOverride) && chartDataOverride.length) ? Object.keys(chartDataOverride[0] || {}).map((field) => ({ field })) : connectedCols;
  const activeSheetId = contextStateV2?.activeSheetId;
  const activeChartSheetId = contextStateV2?.activeChartSheetId;
  const chartSheets = contextStateV2?.chartSheets || {};
  const setChartSheets = contextStateV2?.setChartSheets;
  const activeChartSheet = activeChartSheetId ? chartSheets[activeChartSheetId] : null;
  const resolvedChartName = (
    activeChartSheet?.chartMeta?.chart_name ||
    activeChartSheet?.name ||
    ""
  ).trim();

  const [chartName, setChartNameState] = useState("");

  useEffect(() => {
    setChartNameState(resolvedChartName);
  }, [activeChartSheetId, resolvedChartName]);

  const setChartName = useCallback(
    (next) => {
      const value = String(next ?? "");
      setChartNameState(value);
      if (!activeChartSheetId) return;
      setChartSheets?.((prev) => {
        const cur = prev?.[activeChartSheetId] || { name: "Chart", snapshot: null, chartMeta: null };
        const displayName = value.trim() || cur.name || "Chart";
        return {
          ...(prev || {}),
          [activeChartSheetId]: {
            ...cur,
            name: displayName,
            chartMeta: cur.chartMeta ? { ...cur.chartMeta, chart_name: displayName } : cur.chartMeta,
          },
        };
      });
    },
    [activeChartSheetId, setChartSheets],
  );

  const [selChartType, setSelChartType] = useState('area');

  useEffect(() => {
    setSelChartType((prev) => (prev === "heatmap" ? "treemap" : prev));
  }, []);
  const [selX, setSelX] = useState(undefined);
  const [selY, setSelY] = useState([]);
  const [xOptions, setXOptions] = useState([]);
  const [availableYOptions, setAvailableYOptons] = useState([]);
  const [lineStyle, setLineStyle] = useState("natural");
  const [lineAliasing, setLineAliasing] = useState(false);
  /** Line chart series stroke width (1–8 px). */
  const [lineStrokeWidth, setLineStrokeWidth] = useState(2);
  const [lineStrokeStyle, setLineStrokeStyle] = useState("solid");
  const [lineHumanReadableTime, setLineHumanReadableTime] = useState(false);
  /** When on, pivot X is coerced to epoch ms and drawn on a numeric time scale (line/area/bar). */
  const [xTimeScale, setXTimeScale] = useState(false);
  /** Display-only formatting override for temporal X axes (ticks + tooltip). */
  const [xDateFormatPreset, setXDateFormatPreset] = useState("auto");
  /** Chart-only temporal bucketing; does not mutate or persist sheet rows. */
  const [chartTimeframesEnabled, setChartTimeframesEnabled] = useState(false);
  const [chartTimeframe, setChartTimeframe] = useState("15m");
  const [scaleX, setScaleX] = useState("linear");
  const [scaleY, setScaleY] = useState("linear");
  const [selZ, setSelZ] = useState(null);
  const [selColorCol, setSelColorCol] = useState(null);
  const [scaleZ, setScaleZ] = useState("linear");
  const [scatterZEnabled, setScatterZEnabled] = useState(false);
  const [scatterColorEnabled, setScatterColorEnabled] = useState(false);
  const [yAxisDivisor, setYAxisDivisor] = useState(1);
  const [yAxisCompact, setYAxisCompact] = useState(true);
  /** Line/area/bar: null = off; "basic" = baseline index; "min-max" = min-max scale to 0–100. */
  const [normalizeMode, setNormalizeMode] = useState(null);
  const [sortXDir, setSortXDir] = useState("asc");
  const [sortYDir, setSortYDir] = useState(null);

  const [selectedShadBaseId, setSelectedShadBaseId] = useState(SHADCN_CHART_BASE_ORDER[0]);
  const [selectedPalette, setSelectedPalette] = useState([]);

  /** Explicit per-line series colors (decoupled from the global palette ramp). Keyed by Y column name. */
  const [lineColorOverrides, setLineColorOverrides] = useState({});
  /** Chart-only display names for series (legend / tooltip); keyed by `line:{index}`. */
  const [lineLabelOverrides, setLineLabelOverrides] = useState({});

  const [expanded, setExpanded] = useState(false);
  const [legendVisible, setLegendVisible] = useState(false);
  const [stackedBar, setStackedBar] = useState(false);
  /** When set (bar charts), pivot long rows by this column into stacked/grouped series (e.g. outcome). */
  const [barSeriesColumn, setBarSeriesColumn] = useState(null);
  /** Bar chart only: "date" = value-scaled X (calendar time or numeric position); "categorical" = equidistant bars. */
  const [barXAxisMode, setBarXAxisMode] = useState("date");
  /** Recharts `layout="vertical"` — bars extend horizontally; category axis moves to Y. */
  const [horizontal, setHorizontal] = useState(false);
  /** Bar chart: each bar (per Y series) picks from the active Shadcn palette via a stable hash. */
  const [rainbowBar, setRainbowBar] = useState(false);
  /** Bump to reshuffle rainbow bar colors (same palette, new pseudo-random assignment). */
  const [rainbowBarShuffleNonce, setRainbowBarShuffleNonce] = useState(0);
  /** Rainbow legend: show this sheet column next to each color; null = use X axis (with tick formatter). */
  const [rainbowLegendLabelColumn, setRainbowLegendLabelColumn] = useState(null);
  /** Rainbow legend: centered wrap vs equal-width newspaper columns. */
  const [rainbowLegendLayout, setRainbowLegendLayout] = useState("center");
  const [dots, setDots] = useState(true);
  const [labelLine, setLabelLine] = useState(false);
  const [donut, setDonut] = useState(false);

  const [dark, setDark] = useState(false);

  const [titleHidden, setTitleHidden] = useState(true);
  const [title, setTitle] = useState('Your Amazing Title');
  const [subTitleHidden, setSubTitleHidden] = useState(true);
  const [subTitle, setSubTitle] = useState('Some interesting Discovery');
  const [bodyHeadingHidden, setHeadingHidden] = useState(true);
  const [bodyHeading, setBodyHeading] = useState('Closing 30X More Deals');
  const [bodyContentHidden, setBodyContentHidden] = useState(true);
  const [bodyContent, setBodyContent] = useState('...');

  const [titleColor, setTitleColor] = useState(null);
  const [subTitleColor, setSubTitleColor] = useState(null);
  const [bodyHeadingColor, setBodyHeadingColor] = useState(null);
  const [bodyContentColor, setBodyContentColor] = useState(null);
  const [innerBoxColor, setInnerBoxColor] = useState(null);

  const [gridVisible, setGridVisible] = useState(true);
  const [yAxisLineVisible, setYAxisLineVisible] = useState(false);
  /** When true, category / time tick text on the X dimension is not drawn (area, line, bar). */
  const [hideXAxisLabels, setHideXAxisLabels] = useState(false);
  const [gridLineColor, setGridLineColor] = useState(null);
  const [chartTextColor, setChartTextColor] = useState(null);
  const [xAxisTickColor, setXAxisTickColor] = useState(null);
  const [yAxisTickColor, setYAxisTickColor] = useState(null);
  /** Slanted X tick labels (Recharts `angle`, degrees; −45 is typical for bottom axis). */
  const [xAxisTicksAngled, setXAxisTicksAngled] = useState(false);
  /** Additional px spacing between X axis line and tick labels (adds to the base margin). */
  const [xAxisLabelGapPx, setXAxisLabelGapPx] = useState(0);

  const [chartConfig, setChartConfig] = useState({});
  const [lineSeriesColumn, setLineSeriesColumn] = useState(null);
  const [lineSeriesValues, setLineSeriesValues] = useState([]);

  // Liveline is modeled as a chart type (selChartType === "liveline")
  const [livelineMomentum, setLivelineMomentum] = useState(true);
  const [livelineShowValue, setLivelineShowValue] = useState(false);
  const [livelineValueMomentumColor, setLivelineValueMomentumColor] = useState(false);
  const [livelineWindowsEnabled, setLivelineWindowsEnabled] = useState(false);
  const [livelineExaggerate, setLivelineExaggerate] = useState(false);
  const [livelineScrub, setLivelineScrub] = useState(true);
  const [livelineDegen, setLivelineDegen] = useState(false);
  const [livelineBadge, setLivelineBadge] = useState(true);
  const [livelineBadgeVariant, setLivelineBadgeVariant] = useState('default');
  const [livelineColorChoice, setLivelineColorChoice] = useState('__palette__');

  const [chartFilterColumn, setChartFilterColumn] = useState(null);
  const [chartFilterConfig, setChartFilterConfig] = useState({});
  const [chartLineFilters, setChartLineFilters] = useState([]);
  const [referenceLines, setReferenceLines] = useState([]);
  /** Hover tooltip: optional X / Y / extra sheet columns from the hovered data row (not plotted). */
  const [tooltipShowXValue, setTooltipShowXValue] = useState(true);
  const [tooltipExtraColumns, setTooltipExtraColumns] = useState([]);

  const snapshotAppliedRef = useRef(false);
  const paletteAppliedRef = useRef(false);
  const snapshotPayloadRef = useRef(null);

  useEffect(() => {
    snapshotAppliedRef.current = false;
    paletteAppliedRef.current = false;
    snapshotPayloadRef.current = initialBuilderSnapshot ?? null;
  }, [initialBuilderSnapshot]);

  // Restore line filters as soon as the snapshot is available — do not wait for active-sheet rows.
  useEffect(() => {
    if (demo) return;
    const snap = initialBuilderSnapshot;
    if (!snap || snap.v !== 1) return;
    if (Array.isArray(snap.chartLineFilters)) {
      setChartLineFilters(normalizeChartLineFilters(snap.chartLineFilters));
    }
    if (Array.isArray(snap.referenceLines)) {
      setReferenceLines(normalizeReferenceLines(snap.referenceLines));
    }
  }, [demo, initialBuilderSnapshot]);

  useEffect(() => {
    if (demo) return;
    const snap = snapshotPayloadRef.current;
    if (!snap || snap.v !== 1) {
      return;
    }
    const s = snap;
    if (!paletteAppliedRef.current) {
      paletteAppliedRef.current = true;
      if (s.selectedShadBaseId != null) setSelectedShadBaseId(s.selectedShadBaseId);
      if (Array.isArray(s.selectedPalette) && s.selectedPalette.length) setSelectedPalette(s.selectedPalette);
      if (s.lineColorOverrides && typeof s.lineColorOverrides === "object") {
        setLineColorOverrides(s.lineColorOverrides);
      }
      if (s.lineLabelOverrides && typeof s.lineLabelOverrides === "object") {
        setLineLabelOverrides(s.lineLabelOverrides);
      }
      if (s.dark !== undefined) setDark(!!s.dark);
      if (s.titleColor !== undefined) setTitleColor(s.titleColor);
      if (s.subTitleColor !== undefined) setSubTitleColor(s.subTitleColor);
      if (s.bodyHeadingColor !== undefined) setBodyHeadingColor(s.bodyHeadingColor);
      if (s.bodyContentColor !== undefined) setBodyContentColor(s.bodyContentColor);
      if (s.innerBoxColor !== undefined) setInnerBoxColor(s.innerBoxColor);
      if (s.gridLineColor !== undefined) setGridLineColor(s.gridLineColor);
      if (s.chartTextColor !== undefined) setChartTextColor(s.chartTextColor);
      if (s.xAxisTickColor !== undefined) setXAxisTickColor(s.xAxisTickColor);
      if (s.yAxisTickColor !== undefined) setYAxisTickColor(s.yAxisTickColor);
      if (s.chartConfig && typeof s.chartConfig === "object") setChartConfig(s.chartConfig);
      if (s.livelineColorChoice != null) setLivelineColorChoice(s.livelineColorChoice);
    }
    const rows = Array.isArray(effectiveData) ? effectiveData : [];
    const anySheetRows = Object.values(contextStateV2?.dataSheets || {}).some(
      (sheet) => Array.isArray(sheet?.data) && sheet.data.length > 0,
    );
    if (!rows.length && !anySheetRows) return;
    if (snapshotAppliedRef.current) return;
    snapshotAppliedRef.current = true;
    if (s.selChartType != null) setSelChartType(s.selChartType);
    if (s.selX !== undefined) setSelX(s.selX);
    if (Array.isArray(s.selY)) setSelY(s.selY);
    if (s.lineStyle != null) setLineStyle(s.lineStyle);
    if (s.lineAliasing !== undefined) setLineAliasing(!!s.lineAliasing);
    if (s.lineStrokeWidth !== undefined && Number.isFinite(Number(s.lineStrokeWidth))) {
      setLineStrokeWidth(Math.max(1, Math.min(8, Math.round(Number(s.lineStrokeWidth)))));
    }
    if (["solid", "dashed", "dotted"].includes(s.lineStrokeStyle)) {
      setLineStrokeStyle(s.lineStrokeStyle);
    }
    if (s.lineHumanReadableTime !== undefined) setLineHumanReadableTime(!!s.lineHumanReadableTime);
    if (s.xTimeScale !== undefined) setXTimeScale(!!s.xTimeScale);
    if (s.xDateFormatPreset != null) setXDateFormatPreset(String(s.xDateFormatPreset || "auto"));
    if (s.chartTimeframesEnabled !== undefined) setChartTimeframesEnabled(!!s.chartTimeframesEnabled);
    if (s.chartTimeframe != null && CHART_TIMEFRAME_OPTIONS.some((opt) => opt.value === s.chartTimeframe)) {
      setChartTimeframe(s.chartTimeframe);
    }
    if (s.scaleX != null) setScaleX(s.scaleX);
    if (s.scaleY != null) setScaleY(s.scaleY);
    if (s.selZ !== undefined) setSelZ(s.selZ);
    if (s.selColorCol !== undefined) setSelColorCol(s.selColorCol);
    if (s.scaleZ === "log" || s.scaleZ === "linear") setScaleZ(s.scaleZ);
    if (s.scatterZEnabled !== undefined) setScatterZEnabled(!!s.scatterZEnabled);
    else if (s.selZ) setScatterZEnabled(true);
    if (s.scatterColorEnabled !== undefined) setScatterColorEnabled(!!s.scatterColorEnabled);
    else if (s.selColorCol) setScatterColorEnabled(true);
    if (s.yAxisDivisor != null) setYAxisDivisor(s.yAxisDivisor);
    if (s.yAxisCompact !== undefined) setYAxisCompact(!!s.yAxisCompact);
    if (s.normalizeMode === "basic" || s.normalizeMode === "min-max") {
      setNormalizeMode(s.normalizeMode);
    } else if (s.valuesNormalized) {
      setNormalizeMode("basic");
    } else if (s.normalizeMode === null || s.normalizeMode === false || s.normalizeMode === "off") {
      setNormalizeMode(null);
    }
    if (s.sortXDir != null) setSortXDir(s.sortXDir);
    if (s.sortYDir !== undefined) setSortYDir(s.sortYDir);
    if (s.selectedShadBaseId != null) setSelectedShadBaseId(s.selectedShadBaseId);
    if (Array.isArray(s.selectedPalette) && s.selectedPalette.length) setSelectedPalette(s.selectedPalette);
    if (s.lineColorOverrides && typeof s.lineColorOverrides === "object") setLineColorOverrides(s.lineColorOverrides);
    if (s.lineLabelOverrides && typeof s.lineLabelOverrides === "object") setLineLabelOverrides(s.lineLabelOverrides);
    if (s.expanded !== undefined) setExpanded(!!s.expanded);
    if (s.legendVisible !== undefined) setLegendVisible(!!s.legendVisible);
    if (s.stackedBar !== undefined) setStackedBar(!!s.stackedBar);
    if (s.barSeriesColumn !== undefined) setBarSeriesColumn(s.barSeriesColumn || null);
    if (s.barXAxisMode === "date" || s.barXAxisMode === "categorical") setBarXAxisMode(s.barXAxisMode);
    if (s.horizontal !== undefined) setHorizontal(!!s.horizontal);
    if (s.rainbowBar !== undefined) setRainbowBar(!!s.rainbowBar);
    if (s.rainbowBarShuffleNonce != null && Number.isFinite(Number(s.rainbowBarShuffleNonce))) {
      setRainbowBarShuffleNonce(Math.max(0, Math.floor(Number(s.rainbowBarShuffleNonce))));
    }
    if (s.rainbowLegendLabelColumn !== undefined) setRainbowLegendLabelColumn(s.rainbowLegendLabelColumn);
    if (s.rainbowLegendLayout === "center" || s.rainbowLegendLayout === "columns") {
      setRainbowLegendLayout(s.rainbowLegendLayout);
    }
    if (s.dots !== undefined) setDots(!!s.dots);
    if (s.labelLine !== undefined) setLabelLine(!!s.labelLine);
    if (s.donut !== undefined) setDonut(!!s.donut);
    if (s.dark !== undefined) setDark(!!s.dark);
    if (s.titleHidden !== undefined) setTitleHidden(!!s.titleHidden);
    if (s.title != null) setTitle(s.title);
    if (s.subTitleHidden !== undefined) setSubTitleHidden(!!s.subTitleHidden);
    if (s.subTitle != null) setSubTitle(s.subTitle);
    if (s.bodyHeadingHidden !== undefined) setHeadingHidden(!!s.bodyHeadingHidden);
    if (s.bodyHeading != null) setBodyHeading(s.bodyHeading);
    if (s.bodyContentHidden !== undefined) setBodyContentHidden(!!s.bodyContentHidden);
    if (s.bodyContent != null) setBodyContent(s.bodyContent);
    if (s.titleColor !== undefined) setTitleColor(s.titleColor);
    if (s.subTitleColor !== undefined) setSubTitleColor(s.subTitleColor);
    if (s.bodyHeadingColor !== undefined) setBodyHeadingColor(s.bodyHeadingColor);
    if (s.bodyContentColor !== undefined) setBodyContentColor(s.bodyContentColor);
    if (s.innerBoxColor !== undefined) setInnerBoxColor(s.innerBoxColor);
    if (s.gridVisible !== undefined) setGridVisible(!!s.gridVisible);
    if (s.yAxisLineVisible !== undefined) setYAxisLineVisible(!!s.yAxisLineVisible);
    if (s.hideXAxisLabels !== undefined) setHideXAxisLabels(!!s.hideXAxisLabels);
    if (s.gridLineColor !== undefined) setGridLineColor(s.gridLineColor);
    if (s.chartTextColor !== undefined) setChartTextColor(s.chartTextColor);
    if (s.xAxisTickColor !== undefined) setXAxisTickColor(s.xAxisTickColor);
    if (s.yAxisTickColor !== undefined) setYAxisTickColor(s.yAxisTickColor);
    if (s.xAxisTicksAngled !== undefined) setXAxisTicksAngled(!!s.xAxisTicksAngled);
    if (s.xAxisLabelGapPx !== undefined && Number.isFinite(Number(s.xAxisLabelGapPx))) {
      setXAxisLabelGapPx(Math.max(0, Math.min(60, Math.round(Number(s.xAxisLabelGapPx)))));
    }
    if (s.chartConfig && typeof s.chartConfig === "object") setChartConfig(s.chartConfig);
    if (s.lineSeriesColumn !== undefined) setLineSeriesColumn(s.lineSeriesColumn);
    if (Array.isArray(s.lineSeriesValues)) setLineSeriesValues(s.lineSeriesValues);
    if (s.livelineMomentum !== undefined) setLivelineMomentum(!!s.livelineMomentum);
    if (s.livelineShowValue !== undefined) setLivelineShowValue(!!s.livelineShowValue);
    if (s.livelineValueMomentumColor !== undefined) setLivelineValueMomentumColor(!!s.livelineValueMomentumColor);
    if (s.livelineWindowsEnabled !== undefined) setLivelineWindowsEnabled(!!s.livelineWindowsEnabled);
    if (s.livelineExaggerate !== undefined) setLivelineExaggerate(!!s.livelineExaggerate);
    if (s.livelineScrub !== undefined) setLivelineScrub(!!s.livelineScrub);
    if (s.livelineDegen !== undefined) setLivelineDegen(!!s.livelineDegen);
    if (s.livelineBadge !== undefined) setLivelineBadge(!!s.livelineBadge);
    if (s.livelineBadgeVariant != null) setLivelineBadgeVariant(s.livelineBadgeVariant);
    if (s.livelineColorChoice != null) setLivelineColorChoice(s.livelineColorChoice);
    if (s.chartFilterColumn !== undefined) setChartFilterColumn(s.chartFilterColumn);
    if (s.chartFilterConfig && typeof s.chartFilterConfig === "object") setChartFilterConfig(s.chartFilterConfig);
    if (s.tooltipShowXValue !== undefined) setTooltipShowXValue(!!s.tooltipShowXValue);
    else if (s.legendShowXValue !== undefined) setTooltipShowXValue(!!s.legendShowXValue);
    if (Array.isArray(s.tooltipExtraColumns)) setTooltipExtraColumns(s.tooltipExtraColumns);
    else if (Array.isArray(s.legendExtraColumns)) setTooltipExtraColumns(s.legendExtraColumns);
    else if (s.legendLabelColumn) setTooltipExtraColumns([s.legendLabelColumn]);
  }, [demo, effectiveData, initialBuilderSnapshot, contextStateV2?.dataSheets]);

  useEffect(() => {
    if (selectedPalette?.length) return;
    const firstPalette = getShadcnChartPaletteArray(SHADCN_CHART_BASE_ORDER[0]);
    if (Array.isArray(firstPalette) && firstPalette.length) {
      setSelectedPalette(firstPalette);
    }
  }, [selectedPalette]);

  const areArraysEqual = (a, b) =>
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((v, i) => v === b[i]);

  const globalSheetColumnGroups = useMemo(() => {
    const groups = [];
    const dataSheets = contextStateV2?.dataSheets || {};
    let entries = Object.entries(dataSheets);
    if (activeSheetId) {
      entries = [...entries].sort(([a], [b]) => {
        if (a === activeSheetId) return -1;
        if (b === activeSheetId) return 1;
        return 0;
      });
    }
    for (const [sheetId, sheet] of entries) {
      const rows = Array.isArray(sheet?.data) ? sheet.data : [];
      const first = rows[0] || {};
      let cols = rows.length ? Object.keys(first) : [];
      if (!cols.length && Array.isArray(sheet?.columns)) {
        cols = sheet.columns
          .map((c) => (typeof c === "string" ? c : c?.field || c?.name || ""))
          .filter(Boolean);
      }
      if (!cols.length) continue;
      groups.push({
        sheetId,
        sheetName: sheet?.name || sheetId,
        options: cols.map((column) => ({
          value: `${sheetId}::${column}`,
          column,
          sheetId,
          sheetName: sheet?.name || sheetId,
        })),
      });
    }
    if (!groups.length) {
      const cols = (effectiveCols || []).map((c) => c.field).filter(Boolean);
      if (cols.length) {
        groups.push({
          sheetId: "__inline__",
          sheetName: "Data",
          options: cols.map((column) => ({
            value: column,
            column,
            sheetId: "__inline__",
            sheetName: "Data",
          })),
        });
      }
    }
    return groups;
  }, [contextStateV2?.dataSheets, effectiveCols, activeSheetId]);

  const globalColumnOptions = useMemo(
    () => globalSheetColumnGroups.flatMap((g) => g.options.map((o) => o.value)),
    [globalSheetColumnGroups],
  );

  useEffect(() => {
    if (!globalColumnOptions?.length) return;
    setXOptions((prev) => (areArraysEqual(prev, globalColumnOptions) ? prev : globalColumnOptions));
    const yOpts = selX ? globalColumnOptions.filter((c) => c !== selX) : globalColumnOptions;
    setAvailableYOptons((prev) => (areArraysEqual(prev, yOpts) ? prev : yOpts));
  }, [globalColumnOptions, selX]);

  // Drop axis selections that no longer exist on the sheet (do not auto-pick replacements).
  // In demo, only enforce this when the sheet has real rows; sample fallback uses synthetic columns.
  useEffect(() => {
    if (demo) {
      const live = Array.isArray(effectiveData) ? effectiveData : [];
      if (!live.length) return;
    }
    const cols = globalColumnOptions || [];
    if (!cols.length) return;
    const colSet = new Set(cols);
    const deScope = (value) => {
      const raw = String(value || "");
      const idx = raw.indexOf("::");
      return idx > -1 ? raw.slice(idx + 2) : raw;
    };
    const plotPlainCols = new Set(
      [selX, ...(Array.isArray(selY) ? selY : []), barSeriesColumn]
        .filter(Boolean)
        .map((k) => deScope(k))
        .filter(Boolean),
    );
    const sheetPlotScore = (sheetId) => {
      const group = globalSheetColumnGroups.find((g) => g.sheetId === sheetId);
      if (!group) return 0;
      const sheetCols = new Set(group.options.map((o) => o.column));
      let score = 0;
      for (const col of plotPlainCols) {
        if (sheetCols.has(col)) score += 1;
      }
      return score;
    };
    const resolveToExistingKey = (value) => {
      if (!value) return null;
      if (colSet.has(value)) return value;
      const plain = deScope(value);
      if (plain && colSet.has(plain)) return plain;
      if (!plain) return null;
      // Back-compat: legacy snapshots stored unscoped keys but options are scoped (`sheet-1::col`).
      const matches = cols.filter((k) => deScope(k) === plain);
      if (!matches.length) return null;
      if (matches.length === 1) return matches[0];
      const ranked = matches
        .map((k) => {
          const sid = k.includes("::") ? k.slice(0, k.indexOf("::")) : activeSheetId;
          return { k, score: sheetPlotScore(sid) };
        })
        .sort((a, b) => b.score - a.score);
      if (ranked[0]?.score > 0) return ranked[0].k;
      if (activeSheetId) {
        const onActive = matches.find((k) => k.startsWith(`${activeSheetId}::`));
        if (onActive) return onActive;
      }
      return matches[0];
    };
    setSelX((x) => {
      if (!x) return x;
      const resolved = resolveToExistingKey(x);
      if (!resolved) return undefined;
      return resolved;
    });
    setSelY((prev) => {
      const curr = Array.isArray(prev) ? prev : [];
      const next = curr
        .map((y) => ({ raw: y, resolved: resolveToExistingKey(y) }))
        .filter((p) => !!p.resolved)
        .map((p) => p.resolved);
      const stable =
        next.length === curr.length &&
        next.every((v, i) => v === curr[i]);
      return stable ? curr : next;
    });
    setSelZ((z) => (z ? resolveToExistingKey(z) : z));
    setSelColorCol((c) => (c ? resolveToExistingKey(c) : c));
    setBarSeriesColumn((col) => {
      if (!col) return col;
      const resolved = resolveToExistingKey(col);
      if (!resolved) return null;
      return resolved === col ? col : resolved;
    });
  }, [demo, effectiveData, globalColumnOptions, globalSheetColumnGroups, activeSheetId, selX, selY]);

  useEffect(() => {
    if (!rainbowLegendLabelColumn) return;
    const cols = globalColumnOptions || [];
    if (!cols.length) return;
    if (!new Set(cols).has(rainbowLegendLabelColumn)) setRainbowLegendLabelColumn(null);
  }, [globalColumnOptions, rainbowLegendLabelColumn]);

  // Auto-trim Y for single-series chart types (keeps filters/sorts intact).
  useEffect(() => {
    const singleSeries =
      selChartType === "pie" || selChartType === "radar" || selChartType === "liveline" || selChartType === "treemap";
    if (!singleSeries) return;
    setSelY((prev) => {
      const curr = Array.isArray(prev) ? prev : [];
      if (curr.length <= 1) return curr;
      return curr.slice(0, 1);
    });
  }, [selChartType]);

  // For line charts, never plot the pivot column as a Y series; do not auto-add a replacement Y.
  useEffect(() => {
    if (selChartType !== "line") return;
    if (!selX || !Array.isArray(xOptions) || !xOptions.length) return;
    setSelY((prev) => {
      const curr = Array.isArray(prev) ? prev : [];
      const filtered = curr.filter((v) => v !== selX);
      if (filtered.length === curr.length && filtered.every((v, i) => v === curr[i])) return curr;
      return filtered;
    });
  }, [selChartType, selX, xOptions]);

  useEffect(() => {
    if (!demo) return;
    const live = Array.isArray(effectiveData) ? effectiveData : [];
    if (live.length) return;
    setSelX('month');
    setSelY(['desktop']);
    setSelChartType('area');
    setXOptions(["month","desktop","mobile","other"]);
    setAvailableYOptons(["desktop","mobile","other"]);
    setChartConfig(dfltChartConfig);
  }, [demo, effectiveData]);

  /** Demo with an empty sheet uses baked-in sample data; otherwise chart the same rows as the grid. */
  const usingSampleFallback = useMemo(
    () => demo && !(Array.isArray(effectiveData) && effectiveData.length > 0),
    [demo, effectiveData],
  );

  const chartData = useMemo(() => {
    if (demo) {
      const live = Array.isArray(effectiveData) ? effectiveData : [];
      if (live.length) return live;
      return dfltChartData;
    }
    return Array.isArray(effectiveData) ? effectiveData : [];
  }, [demo, effectiveData]);

  const lineSeriesColumnOptions = useMemo(() => {
    if (!xOptions?.length) return [];
    return xOptions.filter((k) => k !== selX && k !== selY?.[0]);
  }, [xOptions, selX, selY]);

  /** Sheets referenced by X / Y. Line-series split must stay on these sheets or row-merge uses min(lengths) and truncates (e.g. 1600 vs 90 rows). */
  const axisSheetIdsForLineSeries = useMemo(() => {
    const keys = [selX, ...(Array.isArray(selY) ? selY : [])].filter(Boolean);
    const ids = new Set();
    for (const k of keys) {
      const parsed = parseScopedColumnKey(k, activeSheetId);
      const sid = parsed.sheetId || activeSheetId;
      if (sid) ids.add(sid);
    }
    return ids;
  }, [selX, selY, activeSheetId]);

  const inferredLineSeriesColumn = useMemo(() => {
    if (!lineSeriesColumnOptions.length) return null;
    if (!selX || !Array.isArray(selY) || selY.length === 0) return null;
    let pool = lineSeriesColumnOptions;
    if (axisSheetIdsForLineSeries.size > 0) {
      const filtered = lineSeriesColumnOptions.filter((k) => {
        const p = parseScopedColumnKey(k, activeSheetId);
        const sid = p.sheetId || activeSheetId;
        return axisSheetIdsForLineSeries.has(sid);
      });
      if (!filtered.length) return null;
      pool = filtered;
    }
    const byType = pool.find((k) => getAxisType(k, dataTypes, chartData) === "string");
    return byType || pool[0];
  }, [lineSeriesColumnOptions, dataTypes, chartData, axisSheetIdsForLineSeries, activeSheetId, selX, selY]);

  useEffect(() => {
    if (!lineSeriesColumn && inferredLineSeriesColumn) setLineSeriesColumn(inferredLineSeriesColumn);
  }, [lineSeriesColumn, inferredLineSeriesColumn]);

  useEffect(() => {
    if (!lineSeriesColumn) return;
    if (axisSheetIdsForLineSeries.size === 0) return;
    const p = parseScopedColumnKey(lineSeriesColumn, activeSheetId);
    const sid = p.sheetId || activeSheetId;
    if (!axisSheetIdsForLineSeries.has(sid)) setLineSeriesColumn(null);
  }, [lineSeriesColumn, axisSheetIdsForLineSeries, activeSheetId]);

  const lineSeriesCandidates = useMemo(() => {
    if (!lineSeriesColumn || !chartData?.length) return [];
    return getDistinctValues(chartData, lineSeriesColumn);
  }, [lineSeriesColumn, chartData]);

  useEffect(() => {
    setLineSeriesValues((prev) => {
      const allowed = new Set(lineSeriesCandidates);
      const kept = (prev || []).filter((v) => allowed.has(v));
      if (kept.length) return kept;
      if (lineSeriesCandidates.length) return [lineSeriesCandidates[0]];
      return [];
    });
  }, [lineSeriesCandidates]);

  const chartFilterType = useMemo(() => {
    if (!chartFilterColumn || !chartData?.length) return null;
    return getAxisType(chartFilterColumn, dataTypes, chartData);
  }, [chartFilterColumn, chartData, dataTypes]);

  const chartFilterDistinct = useMemo(() => {
    if (!chartFilterColumn || !chartData?.length || chartFilterType !== "string") return [];
    return getDistinctValues(chartData, chartFilterColumn);
  }, [chartFilterColumn, chartData, chartFilterType]);

  useEffect(() => {
    // Sheet columns load async on public embed; stripping filters before they arrive drops saved rules.
    if (!globalColumnOptions?.length) return;
    const selectedY = Array.isArray(selY) ? selY.filter(Boolean) : [];
    const allowedSeries = new Set([
      ...selectedY.map((_, idx) => `line:${idx}`),
      ...selectedY,
    ]);
    const seriesAllowed = (seriesKey) => {
      const raw = String(seriesKey || "");
      const lineMatch = /^line:(\d+)$/.exec(raw);
      if (lineMatch) {
        const idx = Number(lineMatch[1]);
        if (!selectedY.length) return true;
        return idx >= 0 && idx < selectedY.length;
      }
      return allowedSeries.has(raw);
    };
    const colSet = new Set(globalColumnOptions);
    const deScopeColumn = (value) => {
      const raw = String(value || "");
      const idx = raw.indexOf("::");
      return idx > -1 ? raw.slice(idx + 2) : raw;
    };
    const columnExists = (column) => {
      if (!column) return false;
      if (colSet.has(column)) return true;
      const plain = deScopeColumn(column);
      return globalColumnOptions.some((k) => deScopeColumn(k) === plain);
    };
    const resolveColumnKey = (column) => {
      if (!column) return column;
      if (colSet.has(column)) return column;
      const plain = deScopeColumn(column);
      const matches = globalColumnOptions.filter((k) => deScopeColumn(k) === plain);
      if (matches.length === 1) return matches[0];
      if (matches.length > 1 && activeSheetId) {
        const onActive = matches.find((k) => k.startsWith(`${activeSheetId}::`));
        if (onActive) return onActive;
      }
      return matches[0] || column;
    };
    setChartLineFilters((prev) => {
      const curr = normalizeChartLineFilters(prev);
      let changed = false;
      const next = curr
        .map((rule) => {
          if (!seriesAllowed(rule.seriesKey)) {
            changed = true;
            return null;
          }
          if (rule.column && !columnExists(rule.column)) {
            changed = true;
            return null;
          }
          const resolvedColumn = resolveColumnKey(rule.column);
          if (resolvedColumn !== rule.column) {
            changed = true;
            return { ...rule, column: resolvedColumn };
          }
          return rule;
        })
        .filter(Boolean);
      return changed ? next : prev;
    });
  }, [selY, globalColumnOptions, activeSheetId]);

  const livelineData = useMemo(() => {
    if (!chartData?.length || !selX || !selY?.length) return [];
    const valueKey = selY[0];
    return chartData
      .map((row, idx) => {
        const rawT = row?.[selX];
        const ms = temporalToMs(rawT);
        const timeSec = Number.isFinite(ms) ? ms / 1000 : idx;
        const vNum = Number(row?.[valueKey]);
        const value = Number.isFinite(vNum) ? vNum : null;
        return { time: timeSec, value };
      })
      .filter((p) => p.value != null && Number.isFinite(p.value));
  }, [chartData, selX, selY]);

  /**
   * IMPORTANT: when X is sheet-scoped (e.g. `sheet-3::day`), `chartData` may point at the *active*
   * (unscoped) sheet while the plotted rows come from another sheet. If we infer temporality from
   * the wrong sheet, tooltips fall back to raw epoch (e.g. `1635704000000`).
   */
  const lineIsTemporalX = useMemo(() => {
    if (!selX) return false;
    const rawKey = String(selX || "");
    const splitIdx = rawKey.indexOf("::");
    const col = splitIdx > 0 ? rawKey.slice(splitIdx + 2) : rawKey;
    if (isCategoricalLabelColumn(col)) return false;
    if (splitIdx > 0) {
      const sheetId = rawKey.slice(0, splitIdx);
      const rows = Array.isArray(contextStateV2?.dataSheets?.[sheetId]?.data)
        ? contextStateV2.dataSheets[sheetId].data
        : [];
      // Use the actual column name for inference against raw sheet rows.
      if (col && rows.length) {
        // Fast path: unix-like epochs, including raw trade timestamps in micro/nanoseconds.
        for (let i = 0; i < Math.min(rows.length, 30); i += 1) {
          const v = rows[i]?.[col];
          if (looksLikeProseLabelValue(v)) continue;
          const n = typeof v === "number" ? v : Number(v);
          if (Number.isFinite(n) && Number.isFinite(temporalToMs(n))) return true;
        }
        // General path: anything parseable by our temporal parser.
        for (let i = 0; i < Math.min(rows.length, 30); i += 1) {
          const v = rows[i]?.[col];
          if (v == null || v === "" || looksLikeProseLabelValue(v)) continue;
          if (Number.isFinite(temporalToMs(v))) return true;
        }
      }
    }
    return isLikelyTemporalKey(selX, dataTypes, chartData);
  }, [selX, dataTypes, chartData, contextStateV2?.dataSheets]);

  useEffect(() => {
    if (!selX || !lineIsTemporalX) {
      setXTimeScale(false);
      setLineHumanReadableTime(false);
      return;
    }
    setXTimeScale(true);
    setLineHumanReadableTime(true);
  }, [selX, lineIsTemporalX]);

  const scopedKeysInUse = useMemo(() => {
    const filterColumns = normalizeChartLineFilters(chartLineFilters)
      .map((rule) => rule.column)
      .filter(Boolean);
    const keys = [
      selX,
      ...(selY || []),
      selZ,
      selColorCol,
      lineSeriesColumn,
      chartFilterColumn,
      ...filterColumns,
      ...tooltipExtraColumns,
      rainbowLegendLabelColumn,
      barSeriesColumn,
    ].filter(Boolean);
    return keys.some((k) => String(k).includes("::"));
  }, [selX, selY, selZ, selColorCol, lineSeriesColumn, chartFilterColumn, chartLineFilters, tooltipExtraColumns, rainbowLegendLabelColumn, barSeriesColumn]);

  const crossSheetChartData = useMemo(() => {
    const sheetEntries = Object.entries(contextStateV2?.dataSheets || {}).filter(([, sheet]) => Array.isArray(sheet?.data) && sheet.data.length);
    if (!sheetEntries.length) return chartData?.length ? chartData : (demo ? dfltChartData : []);
    const activeSheetId = contextStateV2?.activeSheetId;
    const dataSheets = contextStateV2?.dataSheets || {};
    const activeRows = Array.isArray(dataSheets?.[activeSheetId]?.data) ? dataSheets[activeSheetId].data : [];
    const plotKeyList = [
      selX,
      ...(selY || []),
      selZ,
      selColorCol,
      lineSeriesColumn,
      chartFilterColumn,
      rainbowLegendLabelColumn,
      barSeriesColumn,
    ].filter(Boolean);
    const tooltipKeys = Array.isArray(tooltipExtraColumns) ? tooltipExtraColumns.filter(Boolean) : [];
    const filterKeys = normalizeChartLineFilters(chartLineFilters)
      .map((rule) => rule.column)
      .filter(Boolean);
    const neededKeys = new Set([...plotKeyList, ...tooltipKeys, ...filterKeys]);
    if (!neededKeys.size) return chartData?.length ? chartData : (demo ? dfltChartData : []);
    /** Only X/Y (and other plot keys) determine row count. Tooltip-only scoped columns must not truncate the series. */
    const sheetRowCount = (sheetId) => {
      const d = dataSheets?.[sheetId]?.data;
      return Array.isArray(d) ? d.length : 0;
    };
    const plotSheetLengths = [];
    const seenPlotSheets = new Set();
    for (const key of plotKeyList) {
      const parsed = parseScopedColumnKey(key, activeSheetId);
      const sid = parsed.sheetId || activeSheetId;
      if (!sid || seenPlotSheets.has(sid)) continue;
      seenPlotSheets.add(sid);
      plotSheetLengths.push(sheetRowCount(sid));
    }
    const alignedRowCount =
      plotSheetLengths.length > 0 ? Math.max(0, Math.min(...plotSheetLengths)) : Math.max(0, activeRows.length);
    const rows = [];
    for (let idx = 0; idx < alignedRowCount; idx += 1) {
      const row = {};
      for (const key of neededKeys) {
        const parsed = parseScopedColumnKey(key, activeSheetId);
        const sourceRows =
          parsed.sheetId && Array.isArray(dataSheets?.[parsed.sheetId]?.data)
            ? dataSheets[parsed.sheetId].data
            : activeRows;
        row[key] = sourceRows[idx]?.[parsed.column] ?? null;
      }
      if (selX && row[selX] == null && !lineIsTemporalX) {
        row[selX] = idx;
      }
      rows.push(row);
    }
    return rows.length ? rows : (chartData?.length ? chartData : (demo ? dfltChartData : []));
  }, [
    demo,
    chartData,
    chartFilterColumn,
    chartLineFilters,
    contextStateV2?.activeSheetId,
    contextStateV2?.dataSheets,
    lineIsTemporalX,
    lineSeriesColumn,
    tooltipExtraColumns,
    rainbowLegendLabelColumn,
    barSeriesColumn,
    selColorCol,
    selX,
    selY,
    selZ,
  ]);

  const barUsesCrossSheetData =
    selChartType === "bar" && (!!barSeriesColumn || scopedKeysInUse);

  const lineChartData = useMemo(() => {
    const base =
      selChartType === "line" || scopedKeysInUse || barUsesCrossSheetData
        ? crossSheetChartData
        : chartData;
    return downsampleRowsForChart(base);
  }, [selChartType, scopedKeysInUse, barUsesCrossSheetData, crossSheetChartData, chartData]);

  const chartTimeframesAvailable = useMemo(() => {
    const rows = ((selChartType === "line" || scopedKeysInUse) ? lineChartData : chartData) || [];
    const axisType = selX ? getAxisType(selX, dataTypes, rows) : "string";
    const cartesian = selChartType === "line" || selChartType === "area" || selChartType === "bar";
    return cartesian && !!selX && (lineIsTemporalX || axisType === "date");
  }, [selChartType, scopedKeysInUse, lineChartData, chartData, selX, dataTypes, lineIsTemporalX]);

  const selectedPaletteHandler = (baseId) => {
    const id = String(baseId || "").trim();
    if (!id) return;
    setSelectedShadBaseId(id);
    const pal = getShadcnChartPaletteArray(id);
    if (pal && pal.length) setSelectedPalette(pal);
  };

  /** Rotate palette stops (cycle) so series colors shift without changing the base ramp. */
  const shufflePalette = () =>
    setSelectedPalette((p) => {
      if (!p?.length) return p;
      const next = [...p];
      const first = next.shift();
      if (first == null) return p;
      next.push(first);
      return next;
    });

  const handleSelectY = (value, index = -1) => {
    if (!value) return;
    setSelY((prev) => {
      const curr = Array.isArray(prev) ? prev : [];
      if (index >= 0) return curr.map((v, i) => (i === index ? value : v));
      if (isChartXAxisIdentityLine(value) && curr.some((v) => isChartXAxisIdentityLine(v))) return curr;
      return [...curr, value];
    });
    setChartConfig((prev) => ({
      ...(prev || {}),
      [value]: {
        label: isChartXAxisIdentityLine(value) ? "X-axis (y = x)" : stripSheetScopedColumnKey(value),
      },
    }));
  };

  const removeY = (_val, index) => setSelY((prev) => (prev || []).filter((_, i) => i !== index));

  const handleToggleDark = (pressed) => setDark(!!pressed);

  const builderStateRef = useRef({});
  builderStateRef.current = {
    selChartType,
    selX,
    selY,
    lineStyle,
    lineAliasing,
    lineStrokeWidth,
    lineStrokeStyle,
    lineHumanReadableTime,
    xTimeScale,
    xDateFormatPreset,
    chartTimeframesEnabled,
    chartTimeframe,
    scaleX,
    scaleY,
    selZ,
    selColorCol,
    scaleZ,
    scatterZEnabled,
    scatterColorEnabled,
    yAxisDivisor,
    yAxisCompact,
    normalizeMode,
    sortXDir,
    sortYDir,
    selectedShadBaseId,
    selectedPalette,
    lineColorOverrides,
    lineLabelOverrides,
    expanded,
    legendVisible,
    stackedBar,
    barSeriesColumn,
    barXAxisMode,
    horizontal,
    rainbowBar,
    rainbowBarShuffleNonce,
    rainbowLegendLabelColumn,
    rainbowLegendLayout,
    dots,
    labelLine,
    donut,
    dark,
    titleHidden,
    title,
    subTitleHidden,
    subTitle,
    bodyHeadingHidden,
    bodyHeading,
    bodyContentHidden,
    bodyContent,
    titleColor,
    subTitleColor,
    bodyHeadingColor,
    bodyContentColor,
    innerBoxColor,
    gridVisible,
    yAxisLineVisible,
    hideXAxisLabels,
    gridLineColor,
    chartTextColor,
    xAxisTickColor,
    yAxisTickColor,
    xAxisTicksAngled,
    xAxisLabelGapPx,
    chartConfig,
    lineSeriesColumn,
    lineSeriesValues,
    livelineMomentum,
    livelineShowValue,
    livelineValueMomentumColor,
    livelineWindowsEnabled,
    livelineExaggerate,
    livelineScrub,
    livelineDegen,
    livelineBadge,
    livelineBadgeVariant,
    livelineColorChoice,
    chartFilterColumn,
    chartFilterConfig,
    chartLineFilters,
    referenceLines,
    tooltipShowXValue,
    tooltipExtraColumns,
  };

  const getBuilderSnapshot = useCallback(
    () => ({
      v: 1,
      ...builderStateRef.current,
      chartLineFilters: normalizeChartLineFilters(chartLineFilters),
      referenceLines: normalizeReferenceLines(referenceLines),
    }),
    [chartLineFilters, referenceLines],
  );
  useEffect(() => {
    if (typeof onSnapshotGetterReady !== "function") return;
    onSnapshotGetterReady(getBuilderSnapshot);
  }, [onSnapshotGetterReady, getBuilderSnapshot]);

  const downloadChart = (format) => {
    const el = chartRef.current;
    if (!el) {
      toast.error('Chart not ready to export');
      return;
    }
    const opts = { cacheBust: true, pixelRatio: 2 };
    const filename = `chart-${Date.now()}`;
    if (format === 'png') {
      toPng(el, opts)
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = `${filename}.png`;
          link.href = dataUrl;
          link.click();
          toast.success('Chart exported as PNG');
        })
        .catch((err) => {
          console.error('Export error:', err);
          toast.error('Failed to export chart');
        });
    } else if (format === 'svg') {
      toSvg(el, opts)
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = `${filename}.svg`;
          link.href = dataUrl;
          link.click();
          toast.success('Chart exported as SVG');
        })
        .catch((err) => {
          console.error('Export error:', err);
          toast.error('Failed to export chart');
        });
    } else if (format === 'jpg' || format === 'jpeg') {
      toJpeg(el, { ...opts, quality: 0.95 })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = `${filename}.jpg`;
          link.href = dataUrl;
          link.click();
          toast.success('Chart exported as JPEG');
        })
        .catch((err) => {
          console.error('Export error:', err);
          toast.error('Failed to export chart');
        });
    }
  };

  const getChartPngDataUrl = useCallback(async () => {
    const el = chartRef.current;
    if (!el) return null;
    try {
      return await toPng(el, { cacheBust: true, pixelRatio: 2 });
    } catch {
      return null;
    }
  }, []);

  /** Rasterize the chart card, then letterbox into 1200×630 so the full chart fits social previews. */
  const getChartOgImageDataUrl = useCallback(async () => {
    const el = chartRef.current;
    if (!el || typeof document === "undefined") return null;
    try {
      const sourceDataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 });
      const img = await loadImageFromDataUrl(sourceDataUrl);
      const canvas = document.createElement("canvas");
      canvas.width = OG_IMAGE_WIDTH;
      canvas.height = OG_IMAGE_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const paletteChrome = Array.isArray(selectedPalette) && selectedPalette.length > 0 ? selectedPalette : null;
      const padColor =
        innerBoxColor ||
        (paletteChrome && paletteChrome.length > 2 ? paletteChrome[2] : null) ||
        (dark ? "#000000" : "#ffffff");

      ctx.fillStyle = padColor;
      ctx.fillRect(0, 0, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT);

      const sw = img.naturalWidth;
      const sh = img.naturalHeight;
      if (!sw || !sh) return null;

      const scale = Math.min(OG_IMAGE_WIDTH / sw, OG_IMAGE_HEIGHT / sh);
      const dw = Math.round(sw * scale);
      const dh = Math.round(sh * scale);
      const dx = Math.round((OG_IMAGE_WIDTH - dw) / 2);
      const dy = Math.round((OG_IMAGE_HEIGHT - dh) / 2);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, sw, sh, dx, dy, dw, dh);

      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  }, [innerBoxColor, dark, selectedPalette]);

  const wsStop = polymarketWsState?.stop ?? chainlinkWsState?.stop;
  const wsStart = polymarketWsState?.start ?? chainlinkWsState?.start;
  const wsRunning = polymarketWsState?.isRunning || chainlinkWsState?.isRunning;
  const showWsFeedControl = !!(wsStop || wsStart) && !!effectiveData?.length;

  const value = {
    demo,
    embedCompact,
    effectiveData,
    usingSampleFallback,
    setViewing,
    dataTypes,

    chartDataOverride,
    chartDataOverrideMeta,
    setChartDataOverride,
    setChartDataOverrideMeta,

    dark,
    downloadChart,
    getChartPngDataUrl,
    getChartOgImageDataUrl,
    getBuilderSnapshot,

    chartName,
    setChartName,

    selChartType,
    setSelChartType,
    selX,
    setSelX,
    xOptions,

    selY,
    setSelY,
    availableYOptions,
    handleSelectY,
    removeY,

    selZ,
    setSelZ,
    selColorCol,
    setSelColorCol,
    scaleZ,
    setScaleZ,
    scatterZEnabled,
    setScatterZEnabled,
    scatterColorEnabled,
    setScatterColorEnabled,

    livelineMomentum,
    setLivelineMomentum,
    livelineShowValue,
    setLivelineShowValue,
    livelineValueMomentumColor,
    setLivelineValueMomentumColor,
    livelineWindowsEnabled,
    setLivelineWindowsEnabled,
    livelineExaggerate,
    setLivelineExaggerate,
    livelineScrub,
    setLivelineScrub,
    livelineDegen,
    setLivelineDegen,
    livelineBadge,
    setLivelineBadge,
    livelineBadgeVariant,
    setLivelineBadgeVariant,
    livelineColorChoice,
    setLivelineColorChoice,
    LIVELINE_COLOR_OPTIONS,

    chartFilterColumn,
    setChartFilterColumn,
    chartFilterType,
    chartFilterDistinct,
    chartFilterConfig,
    setChartFilterConfig,
    chartLineFilters,
    setChartLineFilters,
    referenceLines,
    setReferenceLines,
    tooltipShowXValue,
    setTooltipShowXValue,
    tooltipExtraColumns,
    setTooltipExtraColumns,

    sortXDir,
    setSortXDir,
    sortYDir,
    setSortYDir,
    scaleX,
    setScaleX,
    scaleY,
    setScaleY,
    yAxisDivisor,
    setYAxisDivisor,
    yAxisCompact,
    setYAxisCompact,
    normalizeMode,
    setNormalizeMode,

    chartData: scopedKeysInUse ? crossSheetChartData : chartData,
    getAxisType,

    selectedPalette,
    shufflePalette,
    shadcnChartBases: SHADCN_CHART_BASE_ORDER,
    selectedShadBaseId,
    setSelectedShadBaseId,
    selectedPaletteHandler,
    titleColor,
    setTitleColor,
    subTitleColor,
    setSubTitleColor,
    bodyHeadingColor,
    setBodyHeadingColor,
    bodyContentColor,
    setBodyContentColor,
    innerBoxColor,
    setInnerBoxColor,
    gridVisible,
    setGridVisible,
    yAxisLineVisible,
    setYAxisLineVisible,
    hideXAxisLabels,
    setHideXAxisLabels,
    gridLineColor,
    setGridLineColor,
    chartTextColor,
    setChartTextColor,
    xAxisTickColor,
    setXAxisTickColor,
    yAxisTickColor,
    setYAxisTickColor,
    xAxisTicksAngled,
    setXAxisTicksAngled,
    xAxisLabelGapPx,
    setXAxisLabelGapPx,
    lineColorOverrides,
    lineLabelOverrides,
    setLineColorOverrides,
    setLineLabelOverrides,
    handleToggleDark,

    lineStyle,
    setLineStyle,
    lineAliasing,
    setLineAliasing,
    lineStrokeWidth,
    setLineStrokeWidth,
    lineStrokeStyle,
    setLineStrokeStyle,
    lineHumanReadableTime,
    setLineHumanReadableTime,
    xTimeScale,
    setXTimeScale,
    xDateFormatPreset,
    setXDateFormatPreset,
    X_DATE_FORMAT_PRESETS,
    chartTimeframesEnabled,
    setChartTimeframesEnabled,
    chartTimeframe,
    setChartTimeframe,
    chartTimeframesAvailable,
    CHART_TIMEFRAME_OPTIONS,
    expanded,
    handleToggleChange: setExpanded,
    legendVisible,
    handleToggleLegend: setLegendVisible,
    stackedBar,
    handleToggleStack: setStackedBar,
    barSeriesColumn,
    setBarSeriesColumn,
    barXAxisMode,
    setBarXAxisMode,
    horizontal,
    handleToggleHorizontal: setHorizontal,
    rainbowBar,
    setRainbowBar,
    rainbowBarShuffleNonce,
    setRainbowBarShuffleNonce,
    rainbowLegendLabelColumn,
    setRainbowLegendLabelColumn,
    rainbowLegendLayout,
    setRainbowLegendLayout,
    dots,
    handleToggleDots: setDots,
    labelLine,
    handleToggleLabelLine: setLabelLine,
    donut,
    handleToggleDonut: setDonut,

    titleHidden,
    setTitleHidden,
    title,
    setTitle,
    subTitleHidden,
    setSubTitleHidden,
    subTitle,
    setSubTitle,
    bodyHeadingHidden,
    setHeadingHidden,
    bodyHeading,
    setBodyHeading,
    bodyContentHidden,
    setBodyContentHidden,
    bodyContent,
    setBodyContent,

    livelineData,
    xAxisRange: null,
    chartRef,

    wsStop,
    wsStart,
    wsRunning,
    showWsFeedControl,

    selColor: 'hsl(142 88% 28%)',
    BUBBLE_RADIUS_RANGE: [50, 400],

    bgColor: null,
    setBgColor: () => {},
    cardColor: null,
    setCardColor: () => {},
    chartConfig,
    setChartConfig,
    lineSeriesColumn,
    setLineSeriesColumn,
    lineSeriesColumnOptions,
    lineSeriesCandidates,
    lineSeriesValues,
    setLineSeriesValues,
    lineSheetColumnGroups: globalSheetColumnGroups,
    lineIsTemporalX,
    lineChartData,
    scopedKeysInUse,
    formatXAxisValue,
    formatCompactNumber,
  };

  return <ChartBuilderContext.Provider value={value}>{children}</ChartBuilderContext.Provider>;
}

export function ChartCanvas() {
  const {
    demo,
    embedCompact,
    usingSampleFallback,
    dark,
    showWsFeedControl,
    wsRunning,
    wsStop,
    wsStart,
    chartRef,
    selectedPalette,
    lineColorOverrides,
    lineLabelOverrides,
    titleHidden,
    title,
    titleColor,
    subTitleHidden,
    subTitle,
    subTitleColor,
    livelineData,
    livelineColorChoice,
    livelineMomentum,
    livelineShowValue,
    livelineValueMomentumColor,
    livelineWindowsEnabled,
    livelineExaggerate,
    livelineScrub,
    livelineDegen,
    livelineBadge,
    livelineBadgeVariant,
    chartConfig,
    tooltipShowXValue,
    tooltipExtraColumns,
    chartLineFilters,
    referenceLines,
    selChartType,
    chartData,
    dataTypes,
    selX,
    selY,
    lineStyle,
    lineAliasing,
    lineStrokeWidth,
    lineStrokeStyle,
    lineHumanReadableTime,
    xTimeScale,
    xDateFormatPreset,
    chartTimeframesEnabled,
    chartTimeframe,
    setChartTimeframe,
    chartTimeframesAvailable,
    expanded,
    legendVisible,
    stackedBar,
    barSeriesColumn,
    barXAxisMode,
    horizontal,
    rainbowBar,
    rainbowBarShuffleNonce,
    rainbowLegendLabelColumn,
    rainbowLegendLayout,
    dots,
    labelLine,
    donut,
    bodyHeadingHidden,
    bodyHeading,
    bodyHeadingColor,
    bodyContentHidden,
    bodyContent,
    bodyContentColor,
    innerBoxColor,
    gridVisible,
    yAxisLineVisible,
    hideXAxisLabels,
    gridLineColor,
    chartTextColor,
    xAxisTickColor,
    yAxisTickColor,
    xAxisTicksAngled,
    xAxisLabelGapPx,
    lineIsTemporalX,
    lineChartData,
    scopedKeysInUse,
    formatXAxisValue,
    formatCompactNumber,
    scaleY,
    selZ,
    selColorCol,
    scaleZ,
    scatterZEnabled,
    scatterColorEnabled,
    yAxisDivisor,
    yAxisCompact,
    normalizeMode,
    sortXDir,
  } = useChartBuilder();

  const xAxisTickAngle = xAxisTicksAngled ? -45 : 0;
  /** Angled labels need extra bottom space inside the SVG; value tuned for dd-mmm at −45°. */
  const cartesianBottomAngled = hideXAxisLabels ? 12 : xAxisTicksAngled ? 88 : 0;
  const cartesianMarginWithAngledTicks = useMemo(
    () => ({ ...CARTESIAN_MARGIN_AREA_LINE, bottom: cartesianBottomAngled }),
    [cartesianBottomAngled],
  );
  const cartesianBarMarginWithAngledTicks = useMemo(
    () => ({ ...CARTESIAN_MARGIN_BAR, bottom: cartesianBottomAngled }),
    [cartesianBottomAngled],
  );
  /** Horizontal bars: category axis is Y; leave room for labels (wider when slanted). */
  const cartesianBarMarginHorizontal = useMemo(() => {
    if (hideXAxisLabels) {
      return { left: 48, right: CARTESIAN_MARGIN_BAR.right, top: 4, bottom: 20 };
    }
    const left = xAxisTicksAngled ? 108 : 84;
    return { left, right: CARTESIAN_MARGIN_BAR.right, top: 4, bottom: 20 };
  }, [xAxisTicksAngled, hideXAxisLabels]);
  const xAxisTickMargin = (xAxisTicksAngled ? 12 : 8) + (Number.isFinite(Number(xAxisLabelGapPx)) ? Number(xAxisLabelGapPx) : 0);

  const barUsesCrossSheetData =
    selChartType === "bar" && (!!barSeriesColumn || scopedKeysInUse);
  const rawData =
    (selChartType === "line" || scopedKeysInUse || barUsesCrossSheetData ? lineChartData : chartData) || [];
  const yKeys = Array.isArray(selY) ? selY.filter(Boolean) : [];
  /** Demo sample mode pre-seeds axes; with real integration rows, require X + Y like the dashboard. */
  const axesConfigured = usingSampleFallback || (!!selX && yKeys.length > 0);
  const xKey = selX || "month";
  const xIsCategoricalLabel = selX ? isCategoricalLabelColumn(stripSheetScopedColumnKey(xKey)) : false;
  const xAxisType = selX ? getAxisType(xKey, dataTypes, rawData) : "string";

  const useTimeSeriesX =
    !xIsCategoricalLabel &&
    xTimeScale &&
    !!selX &&
    (xAxisType === "date" ||
      (xAxisType === "number" && lineIsTemporalX) ||
      (xAxisType === "string" && lineIsTemporalX));

  const barXIsTemporalDate =
    selChartType === "bar" &&
    !xIsCategoricalLabel &&
    !!selX &&
    (xAxisType === "date" || lineIsTemporalX);

  const barUseDateXScale = barXIsTemporalDate && barXAxisMode === "date";
  const barForceCategoricalX =
    selChartType === "bar" &&
    barXAxisMode === "categorical" &&
    !!selX &&
    (barXIsTemporalDate || (xAxisType === "number" && !xIsCategoricalLabel));

  const effectiveUseTimeSeriesX = selChartType === "bar" ? barUseDateXScale : useTimeSeriesX;

  const effectiveTemporalSort =
    !xIsCategoricalLabel &&
    (barXIsTemporalDate || lineIsTemporalX || effectiveUseTimeSeriesX);

  const cartesianChart =
    selChartType === "line" || selChartType === "area" || selChartType === "bar" || selChartType === "scatter";
  const chartUsesTimeframes = chartTimeframesEnabled && chartTimeframesAvailable;

  const temporalNormalizeEnabled =
    !xIsCategoricalLabel &&
    (selChartType === "bar" ? barUseDateXScale : effectiveUseTimeSeriesX || chartUsesTimeframes);

  const plotRows = useMemo(() => {
    if (!cartesianChart) return rawData;
    return normalizeCartesianPivotToEpochMs(
      rawData,
      xKey,
      xAxisType,
      lineIsTemporalX && !xIsCategoricalLabel,
      temporalNormalizeEnabled,
    );
  }, [rawData, cartesianChart, xKey, xAxisType, lineIsTemporalX, temporalNormalizeEnabled, xIsCategoricalLabel]);

  const sortedPlotRows = useMemo(() => {
    if (!selX || !Array.isArray(plotRows) || plotRows.length <= 1) return plotRows;
    if (xAxisType !== "date" && xAxisType !== "number" && xAxisType !== "string") return plotRows;
    return [...plotRows].sort((a, b) => {
      const av = toSortableXAxisValue(a?.[xKey], xAxisType, effectiveTemporalSort);
      const bv = toSortableXAxisValue(b?.[xKey], xAxisType, effectiveTemporalSort);
      const cmp = typeof av === "string" || typeof bv === "string"
        ? String(av).localeCompare(String(bv))
        : av - bv;
      return sortXDir === "desc" ? -cmp : cmp;
    });
  }, [plotRows, xAxisType, xKey, selX, sortXDir, effectiveTemporalSort]);

  const barSeriesPivot = useMemo(() => {
    if (selChartType !== "bar" || !barSeriesColumn || !yKeys[0]) return null;
    return pivotBarChartBySeries(sortedPlotRows, xKey, yKeys[0], barSeriesColumn);
  }, [selChartType, barSeriesColumn, sortedPlotRows, xKey, yKeys]);

  const ySeries = useMemo(() => {
    if (barSeriesPivot?.seriesKeys?.length) {
      return barSeriesPivot.seriesKeys.map((seriesKey, idx) => ({
        id: `bar:${idx}`,
        sourceKey: seriesKey,
        renderKey: seriesKey,
        label: resolveChartSeriesLabel(seriesKey, idx, lineLabelOverrides, { barPivot: true }),
      }));
    }
    return yKeys.map((sourceKey, idx) => ({
      id: `line:${idx}`,
      sourceKey,
      renderKey: `__chart_line_${idx}`,
      usesXAxisValues: isChartXAxisIdentityLine(sourceKey),
      label: resolveChartSeriesLabel(sourceKey, idx, lineLabelOverrides),
    }));
  }, [barSeriesPivot, yKeys, lineLabelOverrides]);

  const renderedYKeys = useMemo(() => ySeries.map((series) => series.renderKey), [ySeries]);

  const plotRowsForMaterialize = barSeriesPivot?.rows ?? sortedPlotRows;

  const filteredPlotRows = useMemo(() => {
    return materializeChartSeriesRows(plotRowsForMaterialize, ySeries, chartLineFilters, xKey);
  }, [plotRowsForMaterialize, ySeries, chartLineFilters, xKey]);

  const timeframedPlotRows = useMemo(() => {
    if (!chartUsesTimeframes) return filteredPlotRows;
    return bucketTemporalRowsForChart(filteredPlotRows, xKey, renderedYKeys, chartTimeframe, sortXDir);
  }, [chartUsesTimeframes, filteredPlotRows, xKey, renderedYKeys, chartTimeframe, sortXDir]);

  const normalizedPlotRows = useMemo(() => {
    if (!normalizeMode) return timeframedPlotRows;
    if (selChartType !== "line" && selChartType !== "area" && selChartType !== "bar") {
      return timeframedPlotRows;
    }
    return applyCartesianSeriesNormalization(timeframedPlotRows, renderedYKeys, normalizeMode);
  }, [normalizeMode, selChartType, timeframedPlotRows, renderedYKeys]);

  /** Drop non-finite Y (and numeric/date X) so Recharts draws gaps instead of bogus points. */
  const finalRenderedData = useMemo(() => {
    if (!cartesianChart) return normalizedPlotRows;
    return sanitizeCartesianRowsForPlotting(normalizedPlotRows, {
      xKey,
      yKeys: renderedYKeys,
      xAxisType,
      dataTypes,
      getAxisType,
    });
  }, [cartesianChart, normalizedPlotRows, xKey, renderedYKeys, xAxisType, dataTypes]);

  /** Treemap keeps raw pivot labels (not epoch ms). */
  const treemapRows = useMemo(() => {
    if (!selX || !Array.isArray(rawData) || rawData.length <= 1) return rawData;
    if (xAxisType !== "date" && xAxisType !== "number") return rawData;
    return [...rawData].sort((a, b) => {
      const av = toSortableXAxisValue(a?.[xKey], xAxisType, effectiveTemporalSort);
      const bv = toSortableXAxisValue(b?.[xKey], xAxisType, effectiveTemporalSort);
      return av - bv;
    });
  }, [rawData, xAxisType, xKey, selX, effectiveTemporalSort]);

  const firstPlotX = selX && plotRows.length ? plotRows[0]?.[xKey] : null;
  /** Recharts: numeric scale for unix / epoch ms; Date objects need normalization (see effectiveUseTimeSeriesX). */
  const rechartsXAxisType =
    cartesianChart &&
    selX &&
    plotRows.length &&
    !barForceCategoricalX &&
    typeof firstPlotX === "number" &&
    Number.isFinite(firstPlotX)
      ? "number"
      : "category";

  const xAxisNumberDomain =
    rechartsXAxisType === "number"
      ? ((effectiveUseTimeSeriesX || chartUsesTimeframes) && sortXDir === "desc" ? ["dataMax", "dataMin"] : ["dataMin", "dataMax"])
      : undefined;

  /** Recharts Treemap: one synthetic root whose children are sheet rows (name ← X, value ← Y). */
  const treemapData = useMemo(() => {
    if (selChartType !== "treemap" || !Array.isArray(treemapRows) || !yKeys[0]) {
      return [{ name: "root", children: [] }];
    }
    const yk = yKeys[0];
    const leaves = treemapRows
      .map((row) => {
        const name = String(row?.[xKey] ?? "").trim() || "—";
        const value = Math.max(0, Number(row?.[yk]) || 0);
        return { name, value };
      })
      .filter((d) => d.value > 0);
    leaves.sort((a, b) => b.value - a.value);
    if (leaves.length === 0) {
      return [{ name: "root", children: [{ name: "No positive values", value: 1 }] }];
    }
    return [{ name: "root", children: leaves }];
  }, [selChartType, treemapRows, xKey, yKeys]);
  const scatterYKey = ySeries[0]?.renderKey || null;
  const scatterPlotData = useMemo(() => {
    if (selChartType !== "scatter" || !xKey || !scatterYKey || !Array.isArray(finalRenderedData)) return [];
    return finalRenderedData.filter((row) => {
      const x = row?.[xKey];
      const y = row?.[scatterYKey];
      if (x == null || x === "" || y == null || y === "") return false;
      if (rechartsXAxisType === "number" && !Number.isFinite(Number(x))) return false;
      return Number.isFinite(Number(y));
    });
  }, [selChartType, xKey, scatterYKey, finalRenderedData, rechartsXAxisType]);
  const hasSelectedPalette = Array.isArray(selectedPalette) && selectedPalette.length > 0;
  const treemapLeafFills = useMemo(() => {
    const leaves = treemapData?.[0]?.children;
    const n = Array.isArray(leaves) ? leaves.length : 0;
    if (!n || !hasSelectedPalette) return null;
    // Anchor extrapolation from the dark end of the ramp (Shadcn order: 50 → 950).
    const reversed = [...selectedPalette].reverse();
    return extrapolateColorsFromPalette(reversed, n);
  }, [treemapData, hasSelectedPalette, selectedPalette]);
  const defaultPalette = dark
    ? ["#ffffff", "#000000", "#000000", "#ffffff"]
    : ["#000000", "#ffffff", "#ffffff", "#000000"];
  const activePalette = hasSelectedPalette ? selectedPalette : defaultPalette;
  const fallbackSeriesColor = dark ? "#ffffff" : "#000000";
  /**
   * Shadcn palettes are ordered light → dark (50 … 950). Outer chrome uses the first stops; series
   * should read from the dark end so lines/bars read on light card backgrounds.
   */
  const seriesColorAt = (idx) => {
    const p = activePalette;
    const n = p?.length || 0;
    if (!n) return fallbackSeriesColor;
    if (!hasSelectedPalette) {
      return p[idx] ?? p[3] ?? p[0] ?? fallbackSeriesColor;
    }
    const chromeSlots = 3;
    if (n <= chromeSlots) {
      return p[Math.max(0, n - 1 - (idx % Math.max(1, n)))] ?? fallbackSeriesColor;
    }
    const fromEnd = n - 1 - idx;
    const pick = Math.min(n - 1, Math.max(chromeSlots, fromEnd));
    return p[pick] ?? p[n - 1] ?? fallbackSeriesColor;
  };

  const seriesColorFor = (yKey, idx) => {
    const instanceKey = `line:${idx}`;
    const override = lineColorOverrides?.[instanceKey] || (yKey ? lineColorOverrides?.[yKey] : null);
    return override || seriesColorAt(idx);
  };
  const scatterPointColorFor = (row, idx) => {
    if (!scatterColorEnabled || !selColorCol) return seriesColorFor(ySeries[0]?.sourceKey, 0);
    const value = rowValueForDataKey(row, selColorCol);
    return seriesColorAt(stableHashIndex(value, Math.max(1, activePalette?.length || 1))) || seriesColorAt(idx);
  };
  const yAxisFormatter = (raw) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return raw;
    const divisor = Number(yAxisDivisor) > 0 ? Number(yAxisDivisor) : 1;
    const adjusted = n / divisor;
    return yAxisCompact ? formatCompactNumber(adjusted) : adjusted.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  /** Span of pivot on the plotted rows (ms) — drives tick granularity so same-day series show clock time. */
  const xPivotSpanMs = useMemo(() => {
    if (!selX || !Array.isArray(finalRenderedData) || finalRenderedData.length < 2) return 0;
    let min = Infinity;
    let max = -Infinity;
    for (const row of finalRenderedData) {
      const ms = temporalToMs(row?.[xKey]);
      if (!Number.isFinite(ms)) continue;
      if (ms < min) min = ms;
      if (ms > max) max = ms;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
    return max - min;
  }, [finalRenderedData, xKey, selX]);

  const xTickIntlOptions = useMemo(() => temporalIntlFormatOptionsForRange(xPivotSpanMs), [xPivotSpanMs]);

  const xHumanReadable =
    !xIsCategoricalLabel &&
    (selChartType === "line" || selChartType === "area" ? lineHumanReadableTime : false);
  const xOriginalTemporalLabelByMs = useMemo(() => {
    if (!effectiveUseTimeSeriesX || !selX || !Array.isArray(rawData)) return new Map();
    const map = new Map();
    for (const row of rawData) {
      const raw = row?.[xKey];
      const ms = temporalToMs(raw);
      if (!Number.isFinite(ms)) continue;
      if (!map.has(ms)) map.set(ms, String(raw ?? ""));
    }
    return map;
  }, [effectiveUseTimeSeriesX, selX, rawData, xKey]);

  const xAxisTicks = useMemo(() => {
    if (rechartsXAxisType !== "number" || !Array.isArray(finalRenderedData)) return undefined;
    const seen = new Set();
    const ticks = [];
    for (const row of finalRenderedData) {
      const v = Number(row?.[xKey]);
      if (!Number.isFinite(v) || seen.has(v)) continue;
      seen.add(v);
      ticks.push(v);
    }
    return ticks.length > 0 ? ticks : undefined;
  }, [rechartsXAxisType, finalRenderedData, xKey]);

  const xTickFormatter = (v) => {
    const forcedPreset =
      typeof xDateFormatPreset === "string" && xDateFormatPreset.trim()
        ? xDateFormatPreset
        : "auto";
    if (forcedPreset !== "auto") {
      const ms = temporalToMs(v);
      const forced = Number.isFinite(ms) ? formatEpochMsWithPreset(ms, forcedPreset) : "";
      if (forced) return forced;
    }
    // When human-readable is on, never show the stored raw pivot string (often unix seconds);
    // the map is only for preserving non-formatted labels when the toggle is off.
    if (effectiveUseTimeSeriesX && Number.isFinite(Number(v)) && !xHumanReadable) {
      const rawLabel = xOriginalTemporalLabelByMs.get(Number(v));
      if (rawLabel) return rawLabel;
    }
    return formatXAxisValue(
      v,
      effectiveTemporalSort,
      xHumanReadable,
      xHumanReadable ? xTickIntlOptions : null,
      xPivotSpanMs,
    );
  };

  const tickFillX = xAxisTickColor || (dark ? "#94a3b8" : "#64748b");
  const tickFillY = yAxisTickColor || (dark ? "#94a3b8" : "#64748b");
  const gridStroke = gridLineColor || (dark ? "rgba(148,163,184,0.32)" : "rgba(100,116,139,0.35)");
  const labelListFill = chartTextColor || (dark ? "#e2e8f0" : "#0f172a");

  const hasChartLineFilters = normalizeChartLineFilters(chartLineFilters).some(
    (rule) => rule.seriesKey && rule.column,
  );

  const renderedReferenceLines = useMemo(() => {
    const axisType = selX ? getAxisType(xKey, dataTypes, finalRenderedData) : "string";
    const isTemporalX =
      effectiveUseTimeSeriesX || chartUsesTimeframes || lineIsTemporalX || axisType === "date";
    return normalizeReferenceLines(referenceLines)
      .filter((line) => line.enabled && line.kind !== "equation")
      .map((line) => {
        const common = {
          key: line.id,
          stroke: line.color,
          strokeWidth: line.strokeWidth,
          strokeDasharray: referenceLineDash(line.style),
          ifOverflow: "visible",
          isFront: true,
          style: {
            stroke: line.color,
            strokeWidth: line.strokeWidth,
            strokeDasharray: referenceLineDash(line.style),
          },
          label: line.label
            ? {
                value: line.label,
                fill: chartTextColor || tickFillY || line.color,
                position: line.kind === "segment" ? "middle" : "insideTopRight",
              }
            : false,
        };
        if (line.kind === "x") {
          const x = coerceReferenceAxisValue(line.x, axisType, isTemporalX);
          return x == null ? null : <ReferenceLine {...common} x={x} />;
        }
        if (line.kind === "segment") {
          const x1 = coerceReferenceAxisValue(line.x1, axisType, isTemporalX);
          const y1 = coerceReferenceAxisValue(line.y1, "number");
          const x2 = coerceReferenceAxisValue(line.x2, axisType, isTemporalX);
          const y2 = coerceReferenceAxisValue(line.y2, "number");
          if (x1 == null || y1 == null || x2 == null || y2 == null) return null;
          return <ReferenceLine {...common} segment={[{ x: x1, y: y1 }, { x: x2, y: y2 }]} />;
        }
        const y = coerceReferenceAxisValue(line.y, "number");
        return y == null ? null : <ReferenceLine {...common} y={y} />;
      })
      .filter(Boolean);
  }, [
    chartTextColor,
    chartUsesTimeframes,
    dataTypes,
    finalRenderedData,
    lineIsTemporalX,
    referenceLines,
    selX,
    tickFillY,
    effectiveUseTimeSeriesX,
    xKey,
  ]);

  const renderedEquationReferenceLines = useMemo(() => {
    if (rechartsXAxisType !== "number") return [];
    const extents = numericXExtents(finalRenderedData, xKey);
    if (!extents) return [];

    return normalizeReferenceLines(referenceLines)
      .filter((line) => line.enabled && line.kind === "equation" && String(line.equation || "").trim())
      .map((line) => {
        const validation = validateReferenceEquation(line.equation);
        if (!validation.ok) return null;
        const yKey = `__ref_eq_${line.id}`;
        const points = sampleReferenceEquationCurve({
          equation: line.equation,
          xMin: extents.min,
          xMax: extents.max,
          xKey,
          yKey,
        });
        if (points.length < 2) return null;
        return (
          <Line
            key={line.id}
            data={points}
            dataKey={yKey}
            name={line.label || line.equation}
            type="linear"
            dot={false}
            connectNulls
            stroke={line.color}
            strokeWidth={line.strokeWidth}
            strokeDasharray={referenceLineDash(line.style)}
            isAnimationActive={false}
            legendType="line"
          />
        );
      })
      .filter(Boolean);
  }, [finalRenderedData, referenceLines, rechartsXAxisType, xKey]);

  const renderedCartesianReferenceLines = useMemo(
    () => [...renderedReferenceLines, ...renderedEquationReferenceLines],
    [renderedReferenceLines, renderedEquationReferenceLines],
  );

  const xTooltipLabelFormatter = (label) => {
    const forcedPreset =
      typeof xDateFormatPreset === "string" && xDateFormatPreset.trim()
        ? xDateFormatPreset
        : "auto";
    if (forcedPreset !== "auto") {
      const ms = temporalToMs(label);
      const forced = Number.isFinite(ms) ? formatEpochMsWithPreset(ms, forcedPreset) : "";
      if (forced) return forced;
    }
    if (effectiveUseTimeSeriesX && Number.isFinite(Number(label)) && !xHumanReadable) {
      const rawLabel = xOriginalTemporalLabelByMs.get(Number(label));
      if (rawLabel) return rawLabel;
    }
    if ((!effectiveTemporalSort || !xHumanReadable) && Number.isFinite(Number(label))) {
      const ms = temporalToMs(Number(label));
      if (Number.isFinite(ms) && xHumanReadable) {
        return String(formatXAxisValue(ms, true, true, xTickIntlOptions, xPivotSpanMs));
      }
    }
    if (!effectiveTemporalSort || !xHumanReadable) return label == null ? "" : String(label);
    return String(
      formatXAxisValue(label, effectiveTemporalSort, true, xTickIntlOptions, xPivotSpanMs),
    );
  };

  const chartTooltipRowDetails = useMemo(
    () => ({
      rowDetailX: tooltipShowXValue,
      rowDetailY: false,
      rowDetailExtraKeys: tooltipExtraColumns,
      rowDetailXKey: xKey,
      rowDetailFormatX: xTickFormatter,
    }),
    [tooltipShowXValue, tooltipExtraColumns, xKey, xTickFormatter],
  );

  const chartBuilderRechartsChromeCss = useMemo(() => {
    const sel = `[data-chart="chart-${CHART_BUILDER_DOM_ID}"]`;
    const axisRules = [
      `${sel} .recharts-xAxis .recharts-cartesian-axis-tick-value{fill:${tickFillX}!important;}`,
      `${sel} .recharts-xAxis .recharts-cartesian-axis-tick-value tspan{fill:${tickFillX}!important;}`,
      `${sel} .recharts-yAxis .recharts-cartesian-axis-tick-value{fill:${tickFillY}!important;}`,
      `${sel} .recharts-yAxis .recharts-cartesian-axis-tick-value tspan{fill:${tickFillY}!important;}`,
    ];
    if (!chartTextColor) return axisRules.join("");
    return (
      axisRules.join("") +
      `${sel} .${CHART_CHROME_TEXT_CLASS},${sel} .${CHART_CHROME_TEXT_CLASS} span,${sel} .${CHART_CHROME_TEXT_CLASS} div{color:${chartTextColor}!important;}`
    );
  }, [tickFillX, tickFillY, chartTextColor]);

  return (
    <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-out">
      {showWsFeedControl && (
        <div className={`absolute top-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-lg border px-3 py-2 ${dark ? "border-slate-600 bg-slate-800/90" : "border-slate-200 bg-white/95"} shadow-lg`}>
          <span className="text-xs font-medium">{wsRunning ? "Live feed" : "Feed paused"}</span>
          {wsRunning && wsStop && (
            <button type="button" onClick={wsStop} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium">
              <Square className="h-3 w-3" />
              Stop feed
            </button>
          )}
          {!wsRunning && wsStart && (
            <button type="button" onClick={wsStart} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium">
              <Radio className="h-3 w-3" />
              Start feed
            </button>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col px-0.5 py-3 sm:px-1.5 sm:py-4 lg:px-2">
        <div
          className="relative flex min-h-0 w-full max-w-[min(100%,100rem)] flex-1 flex-col rounded-xl"
          ref={chartRef}
        >
            <Card
              className="flex min-h-0 flex-1 flex-col gap-0 border-0 py-4 shadow-xl"
              style={{
                backgroundColor: innerBoxColor || activePalette?.[2] || (dark ? "#000000" : "#ffffff"),
              }}
            >
              {!titleHidden || !subTitleHidden ? (
                <CardHeader className="shrink-0 pb-2">
                  {!titleHidden ? <CardTitle style={{ color: titleColor || undefined }}>{title}</CardTitle> : null}
                  {!subTitleHidden ? (
                    <CardDescription style={{ color: subTitleColor || undefined }}>{subTitle}</CardDescription>
                  ) : null}
                </CardHeader>
              ) : null}
              <CardContent className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-1.5 pb-2 pt-0 sm:px-2">
                {!axesConfigured ? (
                  <div className="flex min-h-[200px] w-full flex-1 flex-col items-center justify-center px-4 text-center text-sm text-muted-foreground">
                    Select an X axis and at least one Y column under Data to plot your sheet.
                  </div>
                ) : selChartType === "liveline" ? (
                  <div className="flex min-h-[180px] w-full flex-1 flex-col items-center justify-center">
                    {livelineData && livelineData.length > 0 ? (
                      <Liveline
                        data={livelineData}
                        value={livelineData[livelineData.length - 1].value}
                        theme={dark ? "dark" : "light"}
                        color={livelineColorChoice === "__palette__" ? seriesColorAt(0) : livelineColorChoice}
                        momentum={livelineMomentum}
                        showValue={livelineShowValue}
                        valueMomentumColor={livelineValueMomentumColor}
                        windows={livelineWindowsEnabled ? LIVELINE_WINDOWS : undefined}
                        windowStyle="rounded"
                        exaggerate={livelineExaggerate}
                        scrub={livelineScrub}
                        degen={livelineDegen}
                        badge={livelineBadge}
                        badgeVariant={livelineBadgeVariant}
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground">Liveline: select a time-like X and numeric Y, then connect a live feed.</div>
                    )}
                  </div>
                ) : (
                  <>
                    <style dangerouslySetInnerHTML={{ __html: chartBuilderRechartsChromeCss }} />
                    {chartTimeframesEnabled && chartTimeframesAvailable ? (
                      <div className="absolute left-3 top-2 z-20 flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/85">
                        {CHART_TIMEFRAME_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold leading-5 transition-colors",
                              chartTimeframe === opt.value
                                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                                : "text-muted-foreground hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                            )}
                            onClick={() => setChartTimeframe(opt.value)}
                            aria-pressed={chartTimeframe === opt.value}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <ChartContainer
                    id={CHART_BUILDER_DOM_ID}
                    config={chartConfig || dfltChartConfig}
                    className={cn(
                      // `max-w` only applies when the card is wider than this cap; narrow layouts are widened via CardContent `px-*` above.
                      "flex flex-col items-center justify-start aspect-auto mx-auto h-full w-full max-w-[min(100%,67.2rem)] flex-1 transition-[min-height,padding] duration-300 ease-out",
                      embedCompact ? "min-h-0" : "min-h-[200px] md:min-h-[220px]",
                      xAxisTicksAngled
                        ? embedCompact
                          ? "py-3 sm:py-4"
                          : "py-4 sm:py-5 md:min-h-[240px]"
                        : embedCompact
                          ? "py-3 sm:py-4"
                          : "py-12",
                      dark && !chartTextColor && "text-slate-200",
                    )}
                    style={chartTextColor ? { color: chartTextColor } : undefined}
                  >
                    {selChartType === "area" && (
                      <AreaChart accessibilityLayer data={finalRenderedData} margin={cartesianMarginWithAngledTicks} stackOffset={expanded ? "expand" : false}>
                        {gridVisible ? <CartesianGrid vertical={false} stroke={gridStroke} /> : null}
                        <XAxis
                          type={rechartsXAxisType}
                          dataKey={xKey}
                          domain={xAxisNumberDomain}
                          ticks={xAxisTicks}
                          tickLine={false}
                          axisLine={false}
                          tickMargin={xAxisTickMargin}
                          angle={xAxisTickAngle}
                          tickFormatter={hideXAxisLabels ? () => "" : xTickFormatter}
                          tick={hideXAxisLabels ? false : { fill: tickFillX }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={yAxisLineVisible ? { stroke: gridStroke, strokeWidth: 1 } : false}
                          tickMargin={8}
                          width={72}
                          tickFormatter={yAxisFormatter}
                          scale={scaleY === "log" ? "log" : "auto"}
                          domain={scaleY === "log" ? ["auto", "auto"] : undefined}
                          tick={{ fill: tickFillY }}
                        />
                        <ChartTooltip
                          cursor={false}
                          labelFormatter={xTooltipLabelFormatter}
                          content={
                            <ChartTooltipContent
                              indicator="line"
                              className={CHART_CHROME_TEXT_CLASS}
                              pivotName={stripSheetScopedColumnKey(xKey)}
                              pivotLabelFormatter={xTooltipLabelFormatter}
                              {...chartTooltipRowDetails}
                            />
                          }
                        />
                        {ySeries.map((series, idx) => (
                          <Area
                            key={series.id}
                            dataKey={series.renderKey}
                            name={series.label}
                            type={lineStyle}
                            connectNulls={lineAliasing || !hasChartLineFilters}
                            fill={seriesColorFor(series.sourceKey, idx)}
                            fillOpacity={0.4}
                            stroke={seriesColorFor(series.sourceKey, idx)}
                            stackId={"a"}
                          />
                        ))}
                        {renderedCartesianReferenceLines}
                        {legendVisible && (
                          <ChartLegend
                            content={
                              <ChartLegendContent
                                className={CHART_CHROME_TEXT_CLASS}
                              />
                            }
                          />
                        )}
                      </AreaChart>
                    )}

                    {selChartType === "bar" && (
                      <BarChart
                        accessibilityLayer
                        data={finalRenderedData}
                        layout={horizontal ? "vertical" : "horizontal"}
                        margin={horizontal ? cartesianBarMarginHorizontal : cartesianBarMarginWithAngledTicks}
                      >
                        {gridVisible ? (
                          <CartesianGrid
                            stroke={gridStroke}
                            {...(horizontal ? { vertical: true, horizontal: false } : { vertical: false })}
                          />
                        ) : null}
                        {horizontal ? (
                          <>
                            <XAxis
                              type="number"
                              tickLine={false}
                              axisLine={yAxisLineVisible ? { stroke: gridStroke, strokeWidth: 1 } : false}
                              tickMargin={8}
                              tickFormatter={yAxisFormatter}
                              tick={{ fill: tickFillY }}
                              scale={scaleY === "log" ? "log" : "auto"}
                              domain={scaleY === "log" ? ["auto", "auto"] : undefined}
                            />
                            <YAxis
                              type={rechartsXAxisType}
                              dataKey={xKey}
                              domain={rechartsXAxisType === "number" ? xAxisNumberDomain : undefined}
                              ticks={rechartsXAxisType === "number" ? xAxisTicks : undefined}
                              tickLine={false}
                              axisLine={false}
                              tickMargin={xAxisTickMargin}
                              angle={xAxisTickAngle}
                              tickFormatter={hideXAxisLabels ? () => "" : xTickFormatter}
                              tick={hideXAxisLabels ? false : { fill: tickFillX }}
                              width={xAxisTicksAngled ? 120 : 96}
                              padding={BAR_X_AXIS_PADDING}
                            />
                          </>
                        ) : (
                          <>
                            <XAxis
                              type={rechartsXAxisType}
                              dataKey={xKey}
                              domain={rechartsXAxisType === "number" ? xAxisNumberDomain : undefined}
                              ticks={rechartsXAxisType === "number" ? xAxisTicks : undefined}
                              tickLine={false}
                              axisLine={false}
                              tickMargin={xAxisTickMargin}
                              angle={xAxisTickAngle}
                              tickFormatter={hideXAxisLabels ? () => "" : xTickFormatter}
                              tick={hideXAxisLabels ? false : { fill: tickFillX }}
                              padding={BAR_X_AXIS_PADDING}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={yAxisLineVisible ? { stroke: gridStroke, strokeWidth: 1 } : false}
                              tickMargin={8}
                              width={74}
                              tickFormatter={yAxisFormatter}
                              scale={scaleY === "log" ? "log" : "auto"}
                              domain={scaleY === "log" ? ["auto", "auto"] : undefined}
                              tick={{ fill: tickFillY }}
                            />
                          </>
                        )}
                        <ChartTooltip
                          cursor={false}
                          labelFormatter={xTooltipLabelFormatter}
                          content={
                            <ChartTooltipContent
                              indicator="line"
                              className={CHART_CHROME_TEXT_CLASS}
                              pivotName={stripSheetScopedColumnKey(xKey)}
                              pivotLabelFormatter={xTooltipLabelFormatter}
                              {...chartTooltipRowDetails}
                            />
                          }
                        />
                        {ySeries.map((series, idx) => (
                          <Bar
                            key={series.id}
                            dataKey={series.renderKey}
                            name={series.label}
                            fill={seriesColorFor(series.sourceKey, idx)}
                            radius={horizontal ? [0, 4, 4, 0] : 4}
                            stackId={stackedBar ? "a" : idx}
                            isAnimationActive={!demo && finalRenderedData.length < 100}
                            minPointSize={2}
                          >
                            {(finalRenderedData || []).map((row, i) => {
                              const rainbowFill = rainbowBar
                                ? rainbowBarFillFromPalette(
                                    null,
                                    i,
                                    idx,
                                    row?.[xKey],
                                    rainbowBarShuffleNonce,
                                    yKeys.length,
                                  )
                                : null;
                              const fill = rainbowFill || seriesColorFor(series.sourceKey, idx);
                              return <Cell key={`cell-${i}`} fill={fill} />;
                            })}
                          </Bar>
                        ))}
                        {renderedCartesianReferenceLines}
                        {legendVisible &&
                          (rainbowBar ? (
                            <ChartLegend
                              content={() => (
                                <RainbowBarLegendContent
                                  className={CHART_CHROME_TEXT_CLASS}
                                  rows={finalRenderedData}
                                  xKey={xKey}
                                  yKeys={renderedYKeys}
                                  shuffleNonce={rainbowBarShuffleNonce}
                                  xTickFormatter={xTickFormatter}
                                  legendLabelColumn={rainbowLegendLabelColumn}
                                  layout={rainbowLegendLayout}
                                />
                              )}
                            />
                          ) : (
                            <ChartLegend
                              content={
                                <ChartLegendContent className={CHART_CHROME_TEXT_CLASS} />
                              }
                            />
                          ))}
                      </BarChart>
                    )}

                    {selChartType === "scatter" && (
                      <ScatterChart accessibilityLayer data={scatterPlotData} margin={cartesianMarginWithAngledTicks}>
                        {gridVisible ? <CartesianGrid vertical={false} stroke={gridStroke} /> : null}
                        <XAxis
                          type={rechartsXAxisType}
                          dataKey={xKey}
                          name={stripSheetScopedColumnKey(xKey)}
                          domain={xAxisNumberDomain}
                          ticks={xAxisTicks}
                          tickLine={false}
                          axisLine={false}
                          tickMargin={xAxisTickMargin}
                          angle={xAxisTickAngle}
                          tickFormatter={hideXAxisLabels ? () => "" : xTickFormatter}
                          tick={hideXAxisLabels ? false : { fill: tickFillX }}
                        />
                        <YAxis
                          type="number"
                          dataKey={scatterYKey}
                          name={stripSheetScopedColumnKey(ySeries[0]?.sourceKey || scatterYKey)}
                          tickLine={false}
                          axisLine={yAxisLineVisible ? { stroke: gridStroke, strokeWidth: 1 } : false}
                          tickMargin={8}
                          width={72}
                          tickFormatter={yAxisFormatter}
                          scale={scaleY === "log" ? "log" : "auto"}
                          domain={scaleY === "log" ? ["auto", "auto"] : undefined}
                          tick={{ fill: tickFillY }}
                        />
                        {scatterZEnabled && selZ ? (
                          <ZAxis
                            type="number"
                            dataKey={selZ}
                            name={stripSheetScopedColumnKey(selZ)}
                            range={[50, 400]}
                            scale={scaleZ === "log" ? "log" : "auto"}
                          />
                        ) : (
                          <ZAxis range={[72, 72]} />
                        )}
                        <ChartTooltip
                          cursor={false}
                          labelFormatter={xTooltipLabelFormatter}
                          content={
                            <ChartTooltipContent
                              indicator="dot"
                              className={CHART_CHROME_TEXT_CLASS}
                              pivotName={stripSheetScopedColumnKey(xKey)}
                              pivotLabelFormatter={xTooltipLabelFormatter}
                              {...chartTooltipRowDetails}
                            />
                          }
                        />
                        <Scatter
                          name={stripSheetScopedColumnKey(ySeries[0]?.sourceKey || "Scatter")}
                          data={scatterPlotData}
                          fill={seriesColorFor(ySeries[0]?.sourceKey, 0)}
                          isAnimationActive={scatterPlotData.length < 2000}
                        >
                          {scatterPlotData.map((row, i) => (
                            <Cell key={`scatter-cell-${i}`} fill={scatterPointColorFor(row, i)} />
                          ))}
                        </Scatter>
                        {renderedCartesianReferenceLines}
                        {legendVisible && (
                          <ChartLegend
                            content={
                              <ChartLegendContent className={CHART_CHROME_TEXT_CLASS} />
                            }
                          />
                        )}
                      </ScatterChart>
                    )}

                    {selChartType === "treemap" && yKeys[0] && (
                      <Treemap
                        data={treemapData}
                        dataKey="value"
                        nameKey="name"
                        aspectRatio={4 / 3}
                        stroke="hsl(var(--border))"
                        isAnimationActive={finalRenderedData.length < 100}
                        content={(nodeProps) => <TreemapCategoryRect {...nodeProps} leafColors={treemapLeafFills ?? undefined} />}
                      >
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              indicator="line"
                              className={CHART_CHROME_TEXT_CLASS}
                              {...chartTooltipRowDetails}
                            />
                          }
                        />
                      </Treemap>
                    )}

                    {selChartType === "line" && (
                      <LineChart accessibilityLayer data={finalRenderedData} margin={cartesianMarginWithAngledTicks}>
                        {gridVisible ? <CartesianGrid vertical={false} stroke={gridStroke} /> : null}
                        <XAxis
                          type={rechartsXAxisType}
                          dataKey={xKey}
                          domain={xAxisNumberDomain}
                          ticks={xAxisTicks}
                          tickLine={false}
                          axisLine={false}
                          tickMargin={xAxisTickMargin}
                          angle={xAxisTickAngle}
                          tickFormatter={hideXAxisLabels ? () => "" : xTickFormatter}
                          tick={hideXAxisLabels ? false : { fill: tickFillX }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={yAxisLineVisible ? { stroke: gridStroke, strokeWidth: 1 } : false}
                          tickMargin={8}
                          width={72}
                          tickFormatter={yAxisFormatter}
                          scale={scaleY === "log" ? "log" : "auto"}
                          domain={scaleY === "log" ? ["auto", "auto"] : undefined}
                          tick={{ fill: tickFillY }}
                        />
                        <ChartTooltip
                          cursor={false}
                          labelFormatter={xTooltipLabelFormatter}
                          content={
                            <ChartTooltipContent
                              indicator="line"
                              className={CHART_CHROME_TEXT_CLASS}
                              pivotName={stripSheetScopedColumnKey(xKey)}
                              pivotLabelFormatter={xTooltipLabelFormatter}
                              {...chartTooltipRowDetails}
                            />
                          }
                        />
                        {ySeries.map((series, idx) => (
                          <Line
                            key={series.id}
                            dataKey={series.renderKey}
                            name={series.label}
                            type={lineStyle}
                            connectNulls={lineAliasing || !hasChartLineFilters}
                            stroke={seriesColorFor(series.sourceKey, idx)}
                            strokeWidth={lineStrokeWidth}
                            strokeDasharray={referenceLineDash(lineStrokeStyle)}
                            dot={dots && finalRenderedData.length <= 40}
                          >
                            {labelLine && (
                              <LabelList position="top" offset={12} className="font-black" fontSize={12} fill={labelListFill} />
                            )}
                          </Line>
                        ))}
                        {renderedCartesianReferenceLines}
                        {legendVisible && (
                          <ChartLegend
                            content={
                              <ChartLegendContent className={CHART_CHROME_TEXT_CLASS} />
                            }
                          />
                        )}
                      </LineChart>
                    )}

                    {selChartType === "pie" && (
                      <PieChart accessibilityLayer>
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              indicator="line"
                              className={CHART_CHROME_TEXT_CLASS}
                              {...chartTooltipRowDetails}
                            />
                          }
                        />
                        <Pie data={rawData} dataKey={yKeys[0]} nameKey={xKey} innerRadius={donut ? 120 : 0} strokeWidth={donut ? 5 : 1} />
                        {legendVisible && (
                          <ChartLegend
                            content={
                              <ChartLegendContent nameKey="value" className={CHART_CHROME_TEXT_CLASS} />
                            }
                          />
                        )}
                      </PieChart>
                    )}
                  </ChartContainer>
                  </>
                )}
              </CardContent>
              {!bodyHeadingHidden || !bodyContentHidden ? (
                <CardFooter className="shrink-0">
                  <div className="flex w-full items-start gap-2 text-sm">
                    <div className="grid gap-2">
                      {!bodyHeadingHidden ? (
                        <div
                          className="flex items-center gap-2 font-medium leading-none"
                          style={{ color: bodyHeadingColor || undefined }}
                        >
                          {bodyHeading}
                        </div>
                      ) : null}
                      {!bodyContentHidden ? (
                        <div
                          className={`flex items-center gap-2 leading-none ${!bodyContentColor && (dark ? "text-slate-300" : "text-muted-foreground")}`}
                          style={{ color: bodyContentColor || undefined }}
                        >
                          {bodyContent}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardFooter>
              ) : null}
            </Card>
        </div>
      </div>
    </div>
  );
}

export { ChartColorPalettePopover } from "@/components/chartView/ChartColorPalettePopover";

export default function ChartView({ demo }) {
  return (
    <ChartBuilderProvider demo={demo}>
      <ChartCanvas />
      <ChartControls />
    </ChartBuilderProvider>
  );
}
