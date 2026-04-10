"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import { ATHENA_DEMO_ROW_LIMIT } from '@/config/dataLakeParquetSamples';

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

export function getAxisType(key, dataTypes, data) {
  if (dataTypes && dataTypes[key]) {
    const t = dataTypes[key];
    if (t === 'number' || t === 'date') return t;
    return 'string';
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
  return getAxisType(key, dataTypes, data) === "date";
}

function formatXAxisValue(value, temporal) {
  if (!temporal) return value;
  if (value == null || value === "") return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

function toSortableXAxisValue(value, axisType) {
  if (axisType === "date") {
    const ts = Date.parse(String(value));
    return Number.isFinite(ts) ? ts : Number.POSITIVE_INFINITY;
  }
  if (axisType === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
  }
  return null;
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

export function ChartBuilderProvider({ demo, children }) {
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
  const [selY, setSelY] = useState(["desktop"]);
  const [xOptions, setXOptions] = useState([]);
  const [availableYOptions, setAvailableYOptons] = useState(["desktop","mobile","other"]);
  const [lineStyle, setLineStyle] = useState("natural");
  const [scaleX, setScaleX] = useState("linear");
  const [scaleY, setScaleY] = useState("linear");
  const [yAxisDivisor, setYAxisDivisor] = useState(1);
  const [yAxisCompact, setYAxisCompact] = useState(true);

  const [selectedShadBaseId, setSelectedShadBaseId] = useState(SHADCN_CHART_BASE_ORDER[0]);
  const [selectedPalette, setSelectedPalette] = useState([]);
  const [colorVisible, setColorVisible] = useState(false);

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

  const [chartConfig, setChartConfig] = useState(dfltChartConfig);
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

  useEffect(() => {
    if (selectedPalette?.length) return;
    const firstPalette = getShadcnChartPaletteArray(SHADCN_CHART_BASE_ORDER[0]);
    if (Array.isArray(firstPalette) && firstPalette.length) {
      setSelectedPalette(firstPalette);
    }
  }, [selectedPalette]);

  useEffect(() => {
    if (!effectiveCols?.length) return;
    const cols = effectiveCols.map((c) => c.field);
    setXOptions(cols);
    if (!selX) {
      const temporalCol = cols.find((col) => isLikelyTemporalKey(col, dataTypes, effectiveData));
      setSelX(temporalCol || cols[0]);
    }
    const yOpts = cols.filter((c) => c !== cols[0]);
    setAvailableYOptons(yOpts);
    if (!selY?.length) setSelY(yOpts.length ? [yOpts[0]] : []);
  }, [effectiveCols, selX, selY, dataTypes, effectiveData]);

  useEffect(() => {
    const cols = effectiveCols?.map((c) => c.field) || [];
    if (!cols.length) return;
    const current = selX && cols.includes(selX) ? selX : null;
    if (!current) {
      const temporalCol = cols.find((col) => isLikelyTemporalKey(col, dataTypes, effectiveData));
      if (temporalCol) setSelX(temporalCol);
    }
  }, [effectiveCols, dataTypes, effectiveData, selX]);

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

  // For the new multi-column line model, avoid plotting the X/index column as a line.
  useEffect(() => {
    if (selChartType !== "line") return;
    if (!selX || !Array.isArray(xOptions) || !xOptions.length) return;
    setSelY((prev) => {
      const curr = Array.isArray(prev) ? prev : [];
      const filtered = curr.filter((v) => v !== selX);
      if (filtered.length) return filtered;
      const fallback = xOptions.find((c) => c !== selX);
      return fallback ? [fallback] : [];
    });
  }, [selChartType, selX, xOptions]);

  useEffect(() => {
    if (!demo) return;
    setSelX('month');
    setSelY(['desktop']);
    setSelChartType('area');
    setXOptions(["month","desktop","mobile","other"]);
    setAvailableYOptons(["desktop","mobile","other"]);
  }, [demo]);

  const chartData = useMemo(() => {
    const d = (demo ? dfltChartData : effectiveData) || [];
    return Array.isArray(d) && d.length ? d : dfltChartData;
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
    return chartData.map((row, idx) => {
      const rawT = row?.[selX];
      const parsed = (typeof rawT === "number") ? rawT : Date.parse(String(rawT));
      const timeSec = Number.isFinite(parsed) ? parsed / 1000 : idx;
      const vNum = Number(row?.[valueKey]);
      const value = Number.isFinite(vNum) ? vNum : 0;
      return { time: timeSec, value };
    });
  }, [chartData, selX, selY]);

  const lineIsTemporalX = useMemo(() => isLikelyTemporalKey(selX, dataTypes, chartData), [selX, dataTypes, chartData]);

  const lineChartData = useMemo(() => {
    // New model: line charts plot `selY` columns directly (each column becomes one Line).
    // So we just return the sheet rows as-is.
    if (!chartData?.length) return chartData || dfltChartData;
    return chartData;
  }, [chartData]);

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
    setChartConfig((prev) => ({ ...(prev || {}), [value]: { label: value } }));
  };

  const removeY = (_val, index) => setSelY((prev) => (prev || []).filter((_, i) => i !== index));

  const handleToggleDark = (pressed) => setDark(!!pressed);

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

  const wsStop = polymarketWsState?.stop ?? chainlinkWsState?.stop;
  const wsStart = polymarketWsState?.start ?? chainlinkWsState?.start;
  const wsRunning = polymarketWsState?.isRunning || chainlinkWsState?.isRunning;
  const showWsFeedControl = !!(wsStop || wsStart) && !!effectiveData?.length;

  const value = {
    demo,
    effectiveData,
    setViewing,
    dataTypes,

    chartDataOverride,
    chartDataOverrideMeta,
    setChartDataOverride,
    setChartDataOverrideMeta,

    dark,
    downloadChart,

    colorVisible,
    setColorVisible,

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

    sortXDir: null,
    setSortXDir: () => {},
    sortYDir: null,
    setSortYDir: () => {},
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
    handleToggleDark,

    lineStyle,
    setLineStyle,
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
    setTitle,
    subTitleHidden,
    setSubTitleHidden,
    setSubTitle,
    bodyHeadingHidden,
    setHeadingHidden,
    setBodyHeading,
    bodyContentHidden,
    setBodyContentHidden,
    setBodyContent,

    livelineData,
    xAxisRange: null,
    chartRef,

    wsStop,
    wsStart,
    wsRunning,
    showWsFeedControl,

    bodyHeading,
    bodyContent,
    title,
    subTitle,

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
    dark,
    showWsFeedControl,
    wsRunning,
    wsStop,
    wsStart,
    chartRef,
    selectedPalette,
    titleHidden,
    title,
    subTitleHidden,
    subTitle,
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
    expanded,
    legendVisible,
    stackedBar,
    dots,
    labelLine,
    donut,
    bodyHeading,
    bodyContent,
    lineIsTemporalX,
    lineChartData,
    formatXAxisValue,
    formatCompactNumber,
    scaleY,
    yAxisDivisor,
    yAxisCompact,
  } = useChartBuilder();

  const data = chartData && chartData.length ? chartData : dfltChartData;
  const xKey = selX || "month";
  const xAxisType = getAxisType(xKey, dataTypes, data);
  const sortedData = useMemo(() => {
    if (!Array.isArray(data) || data.length <= 1) return data;
    if (xAxisType !== "date" && xAxisType !== "number") return data;
    return [...data].sort((a, b) => {
      const av = toSortableXAxisValue(a?.[xKey], xAxisType);
      const bv = toSortableXAxisValue(b?.[xKey], xAxisType);
      return av - bv;
    });
  }, [data, xAxisType, xKey]);
  const renderedData = selChartType === "line" ? (lineChartData?.length ? lineChartData : data) : data;
  const finalRenderedData = useMemo(() => {
    if (selChartType !== "line") return sortedData;
    if (!Array.isArray(renderedData) || renderedData.length <= 1) return renderedData;
    if (xAxisType !== "date" && xAxisType !== "number") return renderedData;
    return [...renderedData].sort((a, b) => {
      const av = toSortableXAxisValue(a?.[xKey], xAxisType);
      const bv = toSortableXAxisValue(b?.[xKey], xAxisType);
      return av - bv;
    });
  }, [selChartType, renderedData, sortedData, xAxisType, xKey]);
  const yKeys = (selY && selY.length) ? selY : ["desktop"];
  /** Recharts Treemap: one synthetic root whose children are sheet rows (name ← X, value ← Y). */
  const treemapData = useMemo(() => {
    if (selChartType !== "treemap" || !Array.isArray(finalRenderedData) || !yKeys[0]) {
      return [{ name: "root", children: [] }];
    }
    const yk = yKeys[0];
    const leaves = finalRenderedData
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
  }, [selChartType, finalRenderedData, xKey, yKeys]);
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
  const yAxisFormatter = (raw) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return raw;
    const divisor = Number(yAxisDivisor) > 0 ? Number(yAxisDivisor) : 1;
    const adjusted = n / divisor;
    return yAxisCompact ? formatCompactNumber(adjusted) : adjusted.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

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

      <div className="flex min-h-0 flex-1 flex-col px-2 py-4 sm:px-4 sm:py-6 lg:px-8">
        <div
          className="relative flex min-h-0 flex-1 flex-col rounded-xl p-3 transition-[padding] duration-300 ease-out sm:p-5"
          ref={chartRef}
          style={{ backgroundColor: activePalette?.[0] || (dark ? "#ffffff" : "#000000") }}
        >
          <div
            className="flex min-h-0 flex-1 flex-col rounded-xl px-2 py-3 shadow-xl transition-[padding] duration-300 ease-out sm:px-4 sm:py-4"
            style={{ backgroundColor: activePalette?.[1] || (dark ? "#000000" : "#ffffff") }}
          >
            <Card
              className="flex min-h-0 flex-1 flex-col gap-0 border-0 py-4"
              style={{ backgroundColor: activePalette?.[2] || (dark ? "#000000" : "#ffffff") }}
            >
              <CardHeader className="shrink-0 pb-2">
                {titleHidden && <CardTitle>{title}</CardTitle>}
                {subTitleHidden && <CardDescription>{subTitle}</CardDescription>}
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-2 pt-0">
                {selChartType === "liveline" ? (
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
                  <ChartContainer
                    config={chartConfig || dfltChartConfig}
                    className={cn(
                      // Fill the card; override default `aspect-video` from ChartContainer so height follows the flex layout.
                      "flex flex-col aspect-auto h-full min-h-[200px] w-full max-w-full flex-1 transition-[min-height] duration-300 ease-out md:min-h-[240px]",
                      dark && "text-slate-200",
                    )}
                  >
                    {selChartType === "area" && (
                      <AreaChart accessibilityLayer data={finalRenderedData} margin={{ left: 20, right: 16, top: 0, bottom: 0 }} stackOffset={expanded ? "expand" : false}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => formatXAxisValue(v, lineIsTemporalX)} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={72} tickFormatter={yAxisFormatter} scale={scaleY === "log" ? "log" : "auto"} domain={scaleY === "log" ? ["auto", "auto"] : undefined} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                        {yKeys.map((yKey, idx) => (
                          <Area key={yKey + idx} dataKey={yKey} type={lineStyle} fill={seriesColorAt(idx)} fillOpacity={0.4} stroke={seriesColorAt(idx)} stackId={"a"} />
                        ))}
                        {legendVisible && <ChartLegend content={<ChartLegendContent />} />}
                      </AreaChart>
                    )}

                    {selChartType === "bar" && (
                      <BarChart accessibilityLayer data={finalRenderedData} margin={{ left: 24, right: 18 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => formatXAxisValue(v, lineIsTemporalX)} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={74} tickFormatter={yAxisFormatter} scale={scaleY === "log" ? "log" : "auto"} domain={scaleY === "log" ? ["auto", "auto"] : undefined} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                        {yKeys.map((yKey, idx) => (
                          <Bar key={yKey + idx} dataKey={yKey} fill={seriesColorAt(idx)} radius={4} stackId={stackedBar ? "a" : idx}>
                            {(finalRenderedData || []).map((_, i) => (
                              <Cell key={`cell-${i}`} fill={seriesColorAt(idx)} />
                            ))}
                          </Bar>
                        ))}
                        {legendVisible && <ChartLegend content={<ChartLegendContent />} />}
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
                        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                      </Treemap>
                    )}

                    {selChartType === "line" && (
                      <LineChart accessibilityLayer data={finalRenderedData} margin={{ left: 20, right: 16, top: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => formatXAxisValue(v, lineIsTemporalX)} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={72} tickFormatter={yAxisFormatter} scale={scaleY === "log" ? "log" : "auto"} domain={scaleY === "log" ? ["auto", "auto"] : undefined} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                        {yKeys.map((yKey, idx) => (
                          <Line key={yKey + idx} dataKey={yKey} type={lineStyle} stroke={seriesColorAt(idx)} strokeWidth={2} dot={dots && finalRenderedData.length <= 40}>
                            {labelLine && <LabelList position="top" offset={12} className="font-black" fontSize={12} />}
                          </Line>
                        ))}
                        {legendVisible && <ChartLegend content={<ChartLegendContent />} />}
                      </LineChart>
                    )}

                    {selChartType === "pie" && (
                      <PieChart accessibilityLayer>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                        <Pie data={data} dataKey={yKeys[0]} nameKey={xKey} innerRadius={donut ? 120 : 0} strokeWidth={donut ? 5 : 1} />
                        {legendVisible && <ChartLegend content={<ChartLegendContent />} />}
                      </PieChart>
                    )}
                  </ChartContainer>
                )}
              </CardContent>
              <CardFooter className="shrink-0">
                <div className="flex w-full items-start gap-2 text-sm">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 font-medium leading-none">{bodyHeading}</div>
                    <div className={`flex items-center gap-2 leading-none ${dark ? "text-slate-300" : "text-muted-foreground"}`}>{bodyContent}</div>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      {demo ? (
        <p
          className="shrink-0 border-t border-red-200/90 bg-red-50 px-3 py-2 text-center text-[11px] font-semibold leading-snug text-red-600 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-400 sm:text-xs"
          role="status"
        >
          Demo: you can only pull up to {ATHENA_DEMO_ROW_LIMIT} rows per request. Sign up for the full dataset.
        </p>
      ) : null}
    </div>
  );
}

export default function ChartView({ demo }) {
  return (
    <ChartBuilderProvider demo={demo}>
      <ChartCanvas />
      <ChartControls />
    </ChartBuilderProvider>
  );
}
