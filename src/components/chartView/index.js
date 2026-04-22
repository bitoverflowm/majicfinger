"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  SHADCN_CHART_BASE_ORDER,
  getShadcnChartPaletteArray,
} from '@/components/chartView/panels/shadcnChartPalettes';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Pie, PieChart, Treemap, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
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
import { sanitizeCartesianRowsForPlotting } from "@/lib/chartDataSanitize";
import { stripSheetScopedColumnKey } from "@/lib/chartColumnDisplay";

const ChartBuilderContext = createContext(null);

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

export function getAxisType(key, dataTypes, data) {
  if (dataTypes && dataTypes[key]) {
    const t = dataTypes[key];
    if (t === "number" || t === "date") return t;
    // Stale/wrong "string" in context — infer from actual rows so charts sort and scale correctly.
    if (data?.length) {
      const v = data[0][key];
      if (typeof v === "number" && Number.isFinite(v)) return "number";
      if (v instanceof Date) return "date";
      const n = Number(v);
      if (v != null && v !== "" && !Number.isNaN(n) && Number.isFinite(n)) return "number";
    }
    return "string";
  }
  if (!data || !data.length) return "string";
  const v = data[0][key];
  if (v instanceof Date) return 'date';
  if (typeof v === 'number' && Number.isFinite(v)) return 'number';
  if (typeof v === 'string' && /^\d{4}-\d{2}/.test(v)) return 'date';
  const n = Number(v);
  if (v != null && v !== '' && !Number.isNaN(n) && Number.isFinite(n)) return 'number';
  return 'string';
}

function isLikelyTemporalKey(key, dataTypes, data) {
  if (!key) return false;
  if (getAxisType(key, dataTypes, data) === "date") return true;
  const keyNorm = String(key).toLowerCase();
  if (keyNorm === "t") return true;
  if (/(time|timestamp|date|datetime|createdat|updatedat|ts)/.test(keyNorm)) return true;
  const rows = Array.isArray(data) ? data : [];
  let temporalLikeCount = 0;
  let nonEmptyCount = 0;
  for (let i = 0; i < Math.min(rows.length, 50); i += 1) {
    const raw = rows[i]?.[key];
    if (raw == null || raw === "") continue;
    nonEmptyCount += 1;
    const n = Number(raw);
    if (Number.isFinite(n)) {
      if (n > 1e9 && n < 1e13) return true; // unix sec/ms-like
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

function temporalToMs(value) {
  if (value == null || value === "") return NaN;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) {
    const abs = Math.abs(value);
    if (abs >= 1e11) return value; // epoch ms (covers modern dates incl. year 2000)
    if (abs >= 1e9) return value * 1000; // epoch sec
  }
  const s = String(value).trim();
  const monthMap = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
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
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    const abs = Math.abs(n);
    if (abs >= 1e11) return n;
    if (abs >= 1e9) return n * 1000;
  }
  return Date.parse(s);
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

/**
 * Local calendar label as dd-mmm (e.g. 08-Apr). Shorter than full datetime so angled ticks fit.
 * @param {number} _rangeMs reserved for future granularity (unused)
 */
export function formatXAxisValue(value, temporal, humanReadable = true, _intlOptions = null, _rangeMs = null) {
  if (!temporal || !humanReadable) return value;
  if (value == null || value === "") return "";
  const ms = temporalToMs(value);
  if (!Number.isFinite(ms)) return String(value);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mmm = MONTH_ABBREV_EN[d.getMonth()] ?? "";
  return `${dd}-${mmm}`;
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
 * Recharts line/area/bar need a numeric X scale for time series. Date objects and unix seconds
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
    else if (typeof raw === "number" && Number.isFinite(raw)) {
      if (raw > 1e12 && raw < 1e15) ms = raw;
      else if (raw > 1e9 && raw < 1e12) ms = raw * 1000;
    } else if (raw != null && raw !== "") {
      ms = temporalToMs(raw);
    }
    if (!Number.isFinite(ms)) return { ...row };
    return { ...row, [xKey]: ms };
  });
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

export function ChartBuilderProvider({ demo, children, initialBuilderSnapshot, embedCompact = false }) {
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

  const [selChartType, setSelChartType] = useState('area');

  useEffect(() => {
    setSelChartType((prev) => (prev === "heatmap" ? "treemap" : prev));
  }, []);
  const [selX, setSelX] = useState(undefined);
  const [selY, setSelY] = useState([]);
  const [xOptions, setXOptions] = useState([]);
  const [availableYOptions, setAvailableYOptons] = useState([]);
  const [lineStyle, setLineStyle] = useState("natural");
  const [lineHumanReadableTime, setLineHumanReadableTime] = useState(true);
  /** When on, pivot X is coerced to epoch ms and drawn on a numeric time scale (line/area/bar). */
  const [xTimeScale, setXTimeScale] = useState(true);
  const [scaleX, setScaleX] = useState("linear");
  const [scaleY, setScaleY] = useState("linear");
  const [yAxisDivisor, setYAxisDivisor] = useState(1);
  const [yAxisCompact, setYAxisCompact] = useState(true);
  const [sortXDir, setSortXDir] = useState("asc");
  const [sortYDir, setSortYDir] = useState(null);

  const [selectedShadBaseId, setSelectedShadBaseId] = useState(SHADCN_CHART_BASE_ORDER[0]);
  const [selectedPalette, setSelectedPalette] = useState([]);

  /** Explicit per-line series colors (decoupled from the global palette ramp). Keyed by Y column name. */
  const [lineColorOverrides, setLineColorOverrides] = useState({});

  const [expanded, setExpanded] = useState(false);
  const [legendVisible, setLegendVisible] = useState(false);
  const [stackedBar, setStackedBar] = useState(false);
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
  const [outerBoxColor, setOuterBoxColor] = useState(null);
  const [innerBoxColor, setInnerBoxColor] = useState(null);

  const [gridVisible, setGridVisible] = useState(true);
  const [yAxisLineVisible, setYAxisLineVisible] = useState(false);
  const [gridLineColor, setGridLineColor] = useState(null);
  const [chartTextColor, setChartTextColor] = useState(null);
  const [xAxisTickColor, setXAxisTickColor] = useState(null);
  const [yAxisTickColor, setYAxisTickColor] = useState(null);
  /** Slanted X tick labels (Recharts `angle`, degrees; −45 is typical for bottom axis). */
  const [xAxisTicksAngled, setXAxisTicksAngled] = useState(false);

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

  const snapshotAppliedRef = useRef(false);
  const snapshotPayloadRef = useRef(null);

  useEffect(() => {
    snapshotAppliedRef.current = false;
    snapshotPayloadRef.current = initialBuilderSnapshot ?? null;
  }, [initialBuilderSnapshot]);

  useEffect(() => {
    if (demo) return;
    const snap = snapshotPayloadRef.current;
    if (!snap || snap.v !== 1) {
      return;
    }
    const rows = Array.isArray(effectiveData) ? effectiveData : [];
    if (!rows.length) return;
    if (snapshotAppliedRef.current) return;
    snapshotAppliedRef.current = true;
    const s = snap;
    if (s.selChartType != null) setSelChartType(s.selChartType);
    if (s.selX !== undefined) setSelX(s.selX);
    if (Array.isArray(s.selY)) setSelY(s.selY);
    if (s.lineStyle != null) setLineStyle(s.lineStyle);
    if (s.lineHumanReadableTime !== undefined) setLineHumanReadableTime(!!s.lineHumanReadableTime);
    if (s.xTimeScale !== undefined) setXTimeScale(!!s.xTimeScale);
    if (s.scaleX != null) setScaleX(s.scaleX);
    if (s.scaleY != null) setScaleY(s.scaleY);
    if (s.yAxisDivisor != null) setYAxisDivisor(s.yAxisDivisor);
    if (s.yAxisCompact !== undefined) setYAxisCompact(!!s.yAxisCompact);
    if (s.sortXDir != null) setSortXDir(s.sortXDir);
    if (s.sortYDir !== undefined) setSortYDir(s.sortYDir);
    if (s.selectedShadBaseId != null) setSelectedShadBaseId(s.selectedShadBaseId);
    if (Array.isArray(s.selectedPalette) && s.selectedPalette.length) setSelectedPalette(s.selectedPalette);
    if (s.lineColorOverrides && typeof s.lineColorOverrides === "object") setLineColorOverrides(s.lineColorOverrides);
    if (s.expanded !== undefined) setExpanded(!!s.expanded);
    if (s.legendVisible !== undefined) setLegendVisible(!!s.legendVisible);
    if (s.stackedBar !== undefined) setStackedBar(!!s.stackedBar);
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
    if (s.outerBoxColor !== undefined) setOuterBoxColor(s.outerBoxColor);
    if (s.innerBoxColor !== undefined) setInnerBoxColor(s.innerBoxColor);
    if (s.gridVisible !== undefined) setGridVisible(!!s.gridVisible);
    if (s.yAxisLineVisible !== undefined) setYAxisLineVisible(!!s.yAxisLineVisible);
    if (s.gridLineColor !== undefined) setGridLineColor(s.gridLineColor);
    if (s.chartTextColor !== undefined) setChartTextColor(s.chartTextColor);
    if (s.xAxisTickColor !== undefined) setXAxisTickColor(s.xAxisTickColor);
    if (s.yAxisTickColor !== undefined) setYAxisTickColor(s.yAxisTickColor);
    if (s.xAxisTicksAngled !== undefined) setXAxisTicksAngled(!!s.xAxisTicksAngled);
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
  }, [demo, effectiveData, initialBuilderSnapshot]);

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

  useEffect(() => {
    if (!effectiveCols?.length) return;
    const cols = effectiveCols.map((c) => c.field);
    setXOptions((prev) => (areArraysEqual(prev, cols) ? prev : cols));
    const pivotForStackedY = selX && cols.includes(selX) ? selX : null;
    const yOpts = pivotForStackedY ? cols.filter((c) => c !== pivotForStackedY) : cols;
    setAvailableYOptons((prev) => (areArraysEqual(prev, yOpts) ? prev : yOpts));
  }, [effectiveCols, selX]);

  // Drop axis selections that no longer exist on the sheet (do not auto-pick replacements).
  // In demo, only enforce this when the sheet has real rows; sample fallback uses synthetic columns.
  useEffect(() => {
    if (demo) {
      const live = Array.isArray(effectiveData) ? effectiveData : [];
      if (!live.length) return;
    }
    const cols = effectiveCols?.map((c) => c.field) || [];
    if (!cols.length) return;
    const colSet = new Set(cols);
    const deScope = (value) => {
      const raw = String(value || "");
      const idx = raw.indexOf("::");
      return idx > -1 ? raw.slice(idx + 2) : raw;
    };
    const hasColumn = (value) => {
      if (!value) return false;
      if (colSet.has(value)) return true;
      const plain = deScope(value);
      return !!plain && colSet.has(plain);
    };
    setSelX((x) => (x && !hasColumn(x) ? undefined : x));
    setSelY((prev) => {
      const curr = Array.isArray(prev) ? prev : [];
      const next = curr.filter((y) => hasColumn(y));
      return next.length === curr.length && next.every((v, i) => v === curr[i]) ? curr : next;
    });
  }, [demo, effectiveData, effectiveCols]);

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

  const inferredLineSeriesColumn = useMemo(() => {
    if (!lineSeriesColumnOptions.length) return null;
    const byType = lineSeriesColumnOptions.find((k) => getAxisType(k, dataTypes, chartData) === "string");
    return byType || lineSeriesColumnOptions[0];
  }, [lineSeriesColumnOptions, dataTypes, chartData]);

  useEffect(() => {
    if (!lineSeriesColumn && inferredLineSeriesColumn) setLineSeriesColumn(inferredLineSeriesColumn);
  }, [lineSeriesColumn, inferredLineSeriesColumn]);

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

  const livelineData = useMemo(() => {
    if (!chartData?.length || !selX || !selY?.length) return [];
    const valueKey = selY[0];
    return chartData
      .map((row, idx) => {
        const rawT = row?.[selX];
        const parsed = typeof rawT === "number" ? rawT : Date.parse(String(rawT));
        const timeSec = Number.isFinite(parsed) ? parsed / 1000 : idx;
        const vNum = Number(row?.[valueKey]);
        const value = Number.isFinite(vNum) ? vNum : null;
        return { time: timeSec, value };
      })
      .filter((p) => p.value != null && Number.isFinite(p.value));
  }, [chartData, selX, selY]);

  const lineIsTemporalX = useMemo(() => isLikelyTemporalKey(selX, dataTypes, chartData), [selX, dataTypes, chartData]);

  const lineChartData = useMemo(() => {
    // For line charts, allow Y keys from any sheet using scoped keys: `${sheetId}::${column}`.
    if (selChartType !== "line") return chartData;
    const sheetEntries = Object.entries(contextStateV2?.dataSheets || {}).filter(([, sheet]) => Array.isArray(sheet?.data) && sheet.data.length);
    if (!sheetEntries.length) return chartData || dfltChartData;
    const activeRows = Array.isArray(contextStateV2?.dataSheets?.[contextStateV2?.activeSheetId]?.data)
      ? contextStateV2.dataSheets[contextStateV2.activeSheetId].data
      : [];
    const maxRows = Math.max(0, ...sheetEntries.map(([, sheet]) => sheet.data.length));
    const rows = [];
    for (let idx = 0; idx < maxRows; idx += 1) {
      const row = {};
      if (selX) {
        row[selX] = activeRows[idx]?.[selX] ?? idx;
      }
      for (const yKey of selY || []) {
        const raw = String(yKey || "");
        const splitIdx = raw.indexOf("::");
        const sheetId = splitIdx > 0 ? raw.slice(0, splitIdx) : contextStateV2?.activeSheetId;
        const column = splitIdx > 0 ? raw.slice(splitIdx + 2) : raw;
        const sourceRows = Array.isArray(contextStateV2?.dataSheets?.[sheetId]?.data) ? contextStateV2.dataSheets[sheetId].data : [];
        row[yKey] = sourceRows[idx]?.[column] ?? null;
      }
      rows.push(row);
    }
    return rows.length ? rows : chartData || dfltChartData;
  }, [selChartType, chartData, contextStateV2?.dataSheets, contextStateV2?.activeSheetId, selX, selY]);

  const lineSheetColumnGroups = useMemo(() => {
    const groups = [];
    for (const [sheetId, sheet] of Object.entries(contextStateV2?.dataSheets || {})) {
      const rows = Array.isArray(sheet?.data) ? sheet.data : [];
      if (!rows.length) continue;
      const first = rows[0] || {};
      const cols = Object.keys(first);
      if (!cols.length) continue;
      const options = cols.map((column) => ({
        value: `${sheetId}::${column}`,
        column,
        sheetId,
        sheetName: sheet?.name || sheetId,
      }));
      groups.push({
        sheetId,
        sheetName: sheet?.name || sheetId,
        options,
      });
    }
    if (!groups.length) {
      const rows = Array.isArray(chartData) && chartData.length ? chartData : [];
      const first = rows[0];
      if (first && typeof first === "object") {
        const cols = Object.keys(first);
        if (cols.length) {
          const sheetId = "__inline__";
          groups.push({
            sheetId,
            sheetName: "Data",
            options: cols.map((column) => ({
              value: column,
              column,
              sheetId,
              sheetName: "Data",
            })),
          });
        }
      }
    }
    return groups;
  }, [contextStateV2?.dataSheets, chartData]);

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
      return [...curr, value];
    });
    setChartConfig((prev) => ({
      ...(prev || {}),
      [value]: { label: stripSheetScopedColumnKey(value) },
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
    lineHumanReadableTime,
    xTimeScale,
    scaleX,
    scaleY,
    yAxisDivisor,
    yAxisCompact,
    sortXDir,
    sortYDir,
    selectedShadBaseId,
    selectedPalette,
    lineColorOverrides,
    expanded,
    legendVisible,
    stackedBar,
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
    outerBoxColor,
    innerBoxColor,
    gridVisible,
    yAxisLineVisible,
    gridLineColor,
    chartTextColor,
    xAxisTickColor,
    yAxisTickColor,
    xAxisTicksAngled,
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
  };

  const getBuilderSnapshot = useCallback(() => ({ v: 1, ...builderStateRef.current }), []);

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
    getBuilderSnapshot,

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

    selZ: null,
    setSelZ: () => {},
    selColorCol: null,
    setSelColorCol: () => {},
    scaleZ: "linear",
    setScaleZ: () => {},

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

    chartData,
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
    outerBoxColor,
    setOuterBoxColor,
    innerBoxColor,
    setInnerBoxColor,
    gridVisible,
    setGridVisible,
    yAxisLineVisible,
    setYAxisLineVisible,
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
    lineColorOverrides,
    setLineColorOverrides,
    handleToggleDark,

    lineStyle,
    setLineStyle,
    lineHumanReadableTime,
    setLineHumanReadableTime,
    xTimeScale,
    setXTimeScale,
    expanded,
    handleToggleChange: setExpanded,
    legendVisible,
    handleToggleLegend: setLegendVisible,
    horizontal: false,
    handleToggleHorizontal: () => {},
    stackedBar,
    handleToggleStack: setStackedBar,
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
    lineSheetColumnGroups,
    lineIsTemporalX,
    lineChartData,
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
    selChartType,
    chartData,
    dataTypes,
    selX,
    selY,
    lineStyle,
    lineHumanReadableTime,
    xTimeScale,
    expanded,
    legendVisible,
    stackedBar,
    dots,
    labelLine,
    donut,
    bodyHeadingHidden,
    bodyHeading,
    bodyHeadingColor,
    bodyContentHidden,
    bodyContent,
    bodyContentColor,
    outerBoxColor,
    innerBoxColor,
    gridVisible,
    yAxisLineVisible,
    gridLineColor,
    chartTextColor,
    xAxisTickColor,
    yAxisTickColor,
    xAxisTicksAngled,
    lineIsTemporalX,
    lineChartData,
    formatXAxisValue,
    formatCompactNumber,
    scaleY,
    yAxisDivisor,
    yAxisCompact,
    sortXDir,
  } = useChartBuilder();

  const xAxisTickAngle = xAxisTicksAngled ? -45 : 0;
  /** Angled labels need extra bottom space inside the SVG; value tuned for dd-mmm at −45°. */
  const cartesianBottomAngled = xAxisTicksAngled ? 88 : 0;
  const cartesianMarginWithAngledTicks = useMemo(
    () => ({ ...CARTESIAN_MARGIN_AREA_LINE, bottom: cartesianBottomAngled }),
    [cartesianBottomAngled],
  );
  const cartesianBarMarginWithAngledTicks = useMemo(
    () => ({ ...CARTESIAN_MARGIN_BAR, bottom: cartesianBottomAngled }),
    [cartesianBottomAngled],
  );
  const xAxisTickMargin = xAxisTicksAngled ? 12 : 8;

  const rawData = (selChartType === "line" ? lineChartData : chartData) || [];
  const yKeys = Array.isArray(selY) ? selY.filter(Boolean) : [];
  /** Demo sample mode pre-seeds axes; with real integration rows, require X + Y like the dashboard. */
  const axesConfigured = usingSampleFallback || (!!selX && yKeys.length > 0);
  const xKey = selX || "month";
  const xAxisType = selX ? getAxisType(xKey, dataTypes, rawData) : "string";

  const useTimeSeriesX =
    xTimeScale &&
    !!selX &&
    (xAxisType === "date" ||
      (xAxisType === "number" && lineIsTemporalX) ||
      (xAxisType === "string" && lineIsTemporalX));
  const effectiveTemporalSort = lineIsTemporalX || useTimeSeriesX;

  const cartesianChart =
    selChartType === "line" || selChartType === "area" || selChartType === "bar";

  const plotRows = useMemo(() => {
    if (!cartesianChart) return rawData;
    return normalizeCartesianPivotToEpochMs(rawData, xKey, xAxisType, lineIsTemporalX, useTimeSeriesX);
  }, [rawData, cartesianChart, xKey, xAxisType, lineIsTemporalX, useTimeSeriesX]);

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

  /** Drop non-finite Y (and numeric/date X) so Recharts draws gaps instead of bogus points. */
  const finalRenderedData = useMemo(() => {
    if (!cartesianChart) return sortedPlotRows;
    return sanitizeCartesianRowsForPlotting(sortedPlotRows, {
      xKey,
      yKeys,
      xAxisType,
      dataTypes,
      getAxisType,
    });
  }, [cartesianChart, sortedPlotRows, xKey, yKeys, xAxisType, dataTypes]);

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
  /** Recharts: numeric scale for unix / epoch ms; Date objects need normalization (see useTimeSeriesX). */
  const rechartsXAxisType =
    cartesianChart &&
    selX &&
    plotRows.length &&
    typeof firstPlotX === "number" &&
    Number.isFinite(firstPlotX)
      ? "number"
      : "category";

  const xAxisNumberDomain =
    rechartsXAxisType === "number"
      ? (useTimeSeriesX && sortXDir === "desc" ? ["dataMax", "dataMin"] : ["dataMin", "dataMax"])
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
    const override = yKey ? lineColorOverrides?.[yKey] : null;
    return override || seriesColorAt(idx);
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

  const xHumanReadable = selChartType === "line" || selChartType === "area" ? lineHumanReadableTime : true;
  const xOriginalTemporalLabelByMs = useMemo(() => {
    if (!useTimeSeriesX || !selX || !Array.isArray(rawData)) return new Map();
    const map = new Map();
    for (const row of rawData) {
      const raw = row?.[xKey];
      const ms = temporalToMs(raw);
      if (!Number.isFinite(ms)) continue;
      if (!map.has(ms)) map.set(ms, String(raw ?? ""));
    }
    return map;
  }, [useTimeSeriesX, selX, rawData, xKey]);

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
    // When human-readable is on, never show the stored raw pivot string (often unix seconds);
    // the map is only for preserving non-formatted labels when the toggle is off.
    if (useTimeSeriesX && Number.isFinite(Number(v)) && !xHumanReadable) {
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

  const xTooltipLabelFormatter = (label) => {
    if (useTimeSeriesX && Number.isFinite(Number(label)) && !xHumanReadable) {
      const rawLabel = xOriginalTemporalLabelByMs.get(Number(label));
      if (rawLabel) return rawLabel;
    }
    if (!effectiveTemporalSort || !xHumanReadable) return label == null ? "" : String(label);
    return String(
      formatXAxisValue(label, effectiveTemporalSort, true, xTickIntlOptions, xPivotSpanMs),
    );
  };

  const tickFillX = xAxisTickColor || (dark ? "#94a3b8" : "#64748b");
  const tickFillY = yAxisTickColor || (dark ? "#94a3b8" : "#64748b");
  const gridStroke = gridLineColor || (dark ? "rgba(148,163,184,0.32)" : "rgba(100,116,139,0.35)");
  const labelListFill = chartTextColor || (dark ? "#e2e8f0" : "#0f172a");

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
          className="relative flex min-h-0 w-full max-w-[min(100%,100rem)] flex-1 flex-col rounded-xl p-1.5 transition-[padding] duration-300 ease-out sm:p-2.5"
          ref={chartRef}
        >
          <div
            className="flex min-h-0 flex-1 flex-col rounded-xl px-1 py-2 shadow-xl transition-[padding] duration-300 ease-out sm:px-2.5 sm:py-3"
            style={{
              backgroundColor: outerBoxColor || activePalette?.[1] || (dark ? "#000000" : "#ffffff"),
            }}
          >
            <Card
              className="flex min-h-0 flex-1 flex-col gap-0 border-0 py-4"
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
              <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-1.5 pb-2 pt-0 sm:px-2">
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
                    <ChartContainer
                    id={CHART_BUILDER_DOM_ID}
                    config={chartConfig || dfltChartConfig}
                    className={cn(
                      // `max-w` only applies when the card is wider than this cap; narrow layouts are widened via CardContent `px-*` above.
                      "flex flex-col items-center justify-start aspect-auto mx-auto h-full min-h-[200px] w-full max-w-[min(100%,67.2rem)] flex-1 transition-[min-height,padding] duration-300 ease-out md:min-h-[220px]",
                      xAxisTicksAngled
                        ? "py-4 sm:py-5 md:min-h-[240px]"
                        : (embedCompact ? "py-5 sm:py-6" : "py-12"),
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
                          tickFormatter={xTickFormatter}
                          tick={{ fill: tickFillX }}
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
                          content={<ChartTooltipContent indicator="line" className={CHART_CHROME_TEXT_CLASS} />}
                        />
                        {yKeys.map((yKey, idx) => (
                          <Area
                            key={yKey + idx}
                            dataKey={yKey}
                            type={lineStyle}
                            connectNulls
                            fill={seriesColorFor(yKey, idx)}
                            fillOpacity={0.4}
                            stroke={seriesColorFor(yKey, idx)}
                            stackId={"a"}
                          />
                        ))}
                        {legendVisible && <ChartLegend content={<ChartLegendContent className={CHART_CHROME_TEXT_CLASS} />} />}
                      </AreaChart>
                    )}

                    {selChartType === "bar" && (
                      <BarChart accessibilityLayer data={finalRenderedData} margin={cartesianBarMarginWithAngledTicks}>
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
                          tickFormatter={xTickFormatter}
                          tick={{ fill: tickFillX }}
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
                        <ChartTooltip
                          cursor={false}
                          labelFormatter={xTooltipLabelFormatter}
                          content={<ChartTooltipContent indicator="line" className={CHART_CHROME_TEXT_CLASS} />}
                        />
                        {yKeys.map((yKey, idx) => (
                          <Bar key={yKey + idx} dataKey={yKey} fill={seriesColorFor(yKey, idx)} radius={4} stackId={stackedBar ? "a" : idx}>
                            {(finalRenderedData || []).map((_, i) => (
                              <Cell key={`cell-${i}`} fill={seriesColorFor(yKey, idx)} />
                            ))}
                          </Bar>
                        ))}
                        {legendVisible && <ChartLegend content={<ChartLegendContent className={CHART_CHROME_TEXT_CLASS} />} />}
                      </BarChart>
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
                        <ChartTooltip content={<ChartTooltipContent indicator="line" className={CHART_CHROME_TEXT_CLASS} />} />
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
                          tickFormatter={xTickFormatter}
                          tick={{ fill: tickFillX }}
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
                          content={<ChartTooltipContent indicator="line" className={CHART_CHROME_TEXT_CLASS} />}
                        />
                        {yKeys.map((yKey, idx) => (
                          <Line
                            key={yKey + idx}
                            dataKey={yKey}
                            type={lineStyle}
                            connectNulls
                            stroke={seriesColorFor(yKey, idx)}
                            strokeWidth={2}
                            dot={dots && finalRenderedData.length <= 40}
                          >
                            {labelLine && (
                              <LabelList position="top" offset={12} className="font-black" fontSize={12} fill={labelListFill} />
                            )}
                          </Line>
                        ))}
                        {legendVisible && <ChartLegend content={<ChartLegendContent className={CHART_CHROME_TEXT_CLASS} />} />}
                      </LineChart>
                    )}

                    {selChartType === "pie" && (
                      <PieChart accessibilityLayer>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" className={CHART_CHROME_TEXT_CLASS} />} />
                        <Pie data={rawData} dataKey={yKeys[0]} nameKey={xKey} innerRadius={donut ? 120 : 0} strokeWidth={donut ? 5 : 1} />
                        {legendVisible && <ChartLegend content={<ChartLegendContent className={CHART_CHROME_TEXT_CLASS} />} />}
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
