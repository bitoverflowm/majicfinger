"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { masterPalette } from '@/components/chartView/panels/masterPalette';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Square, Radio } from 'lucide-react';
import { Liveline } from 'liveline';

import { useMyStateV2 } from '@/context/stateContextV2';
import ChartControls from '@/components/chartView/ChartControls';
import { toPng, toSvg, toJpeg } from 'html-to-image';
import { toast } from 'sonner';

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
  const [selX, setSelX] = useState(undefined);
  const [selY, setSelY] = useState(["desktop"]);
  const [xOptions, setXOptions] = useState([]);
  const [availableYOptions, setAvailableYOptons] = useState(["desktop","mobile","other"]);
  const [lineStyle, setLineStyle] = useState("natural");

  const categories = Object.keys(masterPalette || {});
  const [selectedCategory, setSelectedCategory] = useState(categories?.[0]);
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
    const singleSeries = selChartType === "pie" || selChartType === "radar" || selChartType === "liveline";
    if (!singleSeries) return;
    setSelY((prev) => {
      const curr = Array.isArray(prev) ? prev : [];
      if (curr.length <= 1) return curr;
      return curr.slice(0, 1);
    });
  }, [selChartType]);

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
    if (!chartData?.length || !selX || !selY?.[0]) return chartData || dfltChartData;
    if (!lineSeriesColumn || !lineSeriesValues?.length) return chartData;
    const yKey = selY[0];
    const selectedSet = new Set(lineSeriesValues);
    const rowsByX = new Map();
    (chartData || []).forEach((row) => {
      const seriesValue = row?.[lineSeriesColumn];
      if (seriesValue == null || !selectedSet.has(String(seriesValue))) return;
      const xVal = row?.[selX];
      const xMapKey = xVal == null ? "__null__" : String(xVal);
      const existing = rowsByX.get(xMapKey) || { [selX]: xVal };
      const vNum = Number(row?.[yKey]);
      if (!Number.isNaN(vNum) && Number.isFinite(vNum)) {
        existing[String(seriesValue)] = vNum;
      }
      rowsByX.set(xMapKey, existing);
    });
    const rows = Array.from(rowsByX.values());
    const xType = getAxisType(selX, dataTypes, chartData);
    if (xType === "date" || xType === "number") {
      rows.sort((a, b) => {
        const av = toSortableXAxisValue(a?.[selX], xType);
        const bv = toSortableXAxisValue(b?.[selX], xType);
        return av - bv;
      });
    }
    return rows;
  }, [chartData, selX, selY, lineSeriesColumn, lineSeriesValues, lineIsTemporalX, dataTypes]);

  const selectedPaletteHandler = (index) => {
    const cat = selectedCategory || categories?.[0];
    const pal = masterPalette?.[cat]?.[index];
    if (pal && pal.length) setSelectedPalette(pal);
  };

  const shufflePalette = () => setSelectedPalette((p) => [...p].reverse());

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
    scaleX: "linear",
    setScaleX: () => {},
    scaleY: "linear",
    setScaleY: () => {},

    chartData,
    getAxisType,

    selectedPalette,
    shufflePalette,
    categories,
    selectedCategory,
    setSelectedCategory,
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
  };

  return <ChartBuilderContext.Provider value={value}>{children}</ChartBuilderContext.Provider>;
}

export function ChartCanvas() {
  const {
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
    lineSeriesValues,
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
  const yKeys = selChartType === "line"
    ? ((lineSeriesValues && lineSeriesValues.length) ? lineSeriesValues : ((selY && selY.length) ? selY : ["desktop"]))
    : ((selY && selY.length) ? selY : ["desktop"]);
  const hasSelectedPalette = Array.isArray(selectedPalette) && selectedPalette.length > 0;
  const defaultPalette = dark
    ? ["#ffffff", "#000000", "#000000", "#ffffff"]
    : ["#000000", "#ffffff", "#ffffff", "#000000"];
  const activePalette = hasSelectedPalette ? selectedPalette : defaultPalette;
  const seriesColorAt = (idx) => activePalette?.[idx] || activePalette?.[3] || activePalette?.[0] || (dark ? "#ffffff" : "#000000");

  return (
    <div className={`gradualEffect relative xl:flex p-10`}>
      {showWsFeedControl && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-lg border px-3 py-2 ${dark ? "bg-slate-800/90 border-slate-600" : "bg-white/95 border-slate-200"} shadow-lg`}>
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

      <div className="gradualEffect lg:py-10 lg:px-10">
        <div className="gradualEffect py-12 px-12 rounded-xl" ref={chartRef} style={{ backgroundColor: activePalette?.[0] || (dark ? "#ffffff" : "#000000") }}>
          <div className="py-4 px-4 rounded-xl shadow-xl bg-opacity-50" style={{ backgroundColor: activePalette?.[1] || (dark ? "#000000" : "#ffffff") }}>
            <Card className={`py-4 border-0`} style={{ backgroundColor: activePalette?.[2] || (dark ? "#000000" : "#ffffff") }}>
              <CardHeader>
                {titleHidden && <CardTitle>{title}</CardTitle>}
                {subTitleHidden && <CardDescription>{subTitle}</CardDescription>}
              </CardHeader>
              <CardContent>
                {selChartType === "liveline" ? (
                  <div style={{ height: 200 }} className="w-full flex items-center justify-center">
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
                  <ChartContainer config={chartConfig || dfltChartConfig} className={`h-[300px] lg:h-[500px] w-full ${dark && "text-slate-200"}`}>
                    {selChartType === "area" && (
                      <AreaChart accessibilityLayer data={finalRenderedData} margin={{ left: 12, right: 12, top: 0, bottom: 0 }} stackOffset={expanded ? "expand" : false}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => formatXAxisValue(v, lineIsTemporalX)} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                        {yKeys.map((yKey, idx) => (
                          <Area key={yKey + idx} dataKey={yKey} type={lineStyle} fill={seriesColorAt(idx)} fillOpacity={0.4} stroke={seriesColorAt(idx)} stackId={"a"} />
                        ))}
                        {legendVisible && <ChartLegend content={<ChartLegendContent />} />}
                      </AreaChart>
                    )}

                    {selChartType === "bar" && (
                      <BarChart accessibilityLayer data={finalRenderedData} margin={{ left: 12, right: 12 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => formatXAxisValue(v, lineIsTemporalX)} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
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

                    {selChartType === "line" && (
                      <LineChart accessibilityLayer data={finalRenderedData} margin={{ left: 12, right: 12, top: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => formatXAxisValue(v, lineIsTemporalX)} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
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
              <CardFooter>
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
