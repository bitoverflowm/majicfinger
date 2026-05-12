"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CaretRightIcon, EyeClosedIcon, EyeOpenIcon, IdCardIcon } from "@radix-ui/react-icons";
import { MinusCircle } from "react-feather";
import { IoPieChartOutline, IoStatsChart } from "react-icons/io5";
import { PiChartBarHorizontalLight, PiChartDonut, PiChartLine, PiChartLineThin } from "react-icons/pi";
import { MdOutlineAreaChart, MdStackedBarChart } from "react-icons/md";
import { GoDotFill } from "react-icons/go";
import { AiOutlineRadarChart } from "react-icons/ai";
import { CircleDot, CircleHelp, Expand, ArrowUp, ArrowDown, LogIn, Tag, LayoutGrid, Shuffle, ChevronUp, ChevronDown, Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useChartBuilder, CHART_X_AXIS_NONE } from "@/components/chartView";
import { ChartColorPalettePopover } from "@/components/chartView/ChartColorPalettePopover";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { temporalToMs } from "@/lib/temporalParse";

export default function ChartControls() {
  const {
    demo,
    effectiveData,
    setViewing,
    dark,

    chartDataOverride,
    chartDataOverrideMeta,
    setChartDataOverride,
    setChartDataOverrideMeta,

    selChartType,
    setSelChartType,

    selX,
    setSelX,
    setSelY,
    xOptions,

    selY,
    availableYOptions,
    handleSelectY,
    removeY,
    lineSheetColumnGroups,

    selZ,
    setSelZ,
    selColorCol,
    setSelColorCol,
    scaleZ,
    setScaleZ,

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

    chartLineFilters,
    setChartLineFilters,
    tooltipShowXValue,
    setTooltipShowXValue,
    tooltipShowYValue,
    setTooltipShowYValue,
    tooltipExtraColumns,
    setTooltipExtraColumns,

    sortXDir,
    setSortXDir,
    sortYDir,
    setSortYDir,
    yAxisDivisor,
    setYAxisDivisor,
    yAxisCompact,
    setYAxisCompact,
    dataTypes,
    chartData,
    getAxisType,
    lineIsTemporalX,

    selectedPalette,
    lineColorOverrides,
    setLineColorOverrides,

    lineStyle,
    setLineStyle,
    lineAliasing,
    setLineAliasing,
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
    handleToggleChange,
    legendVisible,
    handleToggleLegend,
    horizontal,
    handleToggleHorizontal,
    stackedBar,
    handleToggleStack,
    rainbowBar,
    setRainbowBar,
    setRainbowBarShuffleNonce,
    rainbowLegendLabelColumn,
    setRainbowLegendLabelColumn,
    rainbowLegendLayout,
    setRainbowLegendLayout,
    dots,
    handleToggleDots,
    labelLine,
    handleToggleLabelLine,
    donut,
    handleToggleDonut,

    titleHidden,
    setTitleHidden,
    title,
    setTitle,
    titleColor,
    setTitleColor,
    subTitleHidden,
    setSubTitleHidden,
    subTitle,
    setSubTitle,
    subTitleColor,
    setSubTitleColor,
    bodyHeadingHidden,
    setHeadingHidden,
    bodyHeading,
    setBodyHeading,
    bodyHeadingColor,
    setBodyHeadingColor,
    bodyContentHidden,
    setBodyContentHidden,
    bodyContent,
    setBodyContent,
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
  } = useChartBuilder();

  const chartTypeLabel =
    selChartType === "liveline"
      ? "Liveline"
      : selChartType === "treemap"
        ? "Treemap"
        : selChartType
          ? selChartType.charAt(0).toUpperCase() + selChartType.slice(1)
          : "—";

  /** Selected chart type uses the same color users see on hover (works for light/dark). */
  const chartTypeSelectedClass = "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50";

  // Only one section open at a time; default to Chart Type.
  const [openSection, setOpenSection] = useState("chartType");
  const [lineAddValue, setLineAddValue] = useState("");
  const [yAxisFormatOpen, setYAxisFormatOpen] = useState(true);
  const xAxisSelectValue = selX ?? CHART_X_AXIS_NONE;
  const handleXAxisChange = (v) => setSelX(v === CHART_X_AXIS_NONE ? undefined : v);

  const parseScopedLineKey = (value) => {
    const raw = String(value || "");
    const splitIdx = raw.indexOf("::");
    if (splitIdx <= 0) return { sheetId: "", column: raw, isScoped: false };
    return { sheetId: raw.slice(0, splitIdx), column: raw.slice(splitIdx + 2), isScoped: true };
  };
  const groupedLineOptions = (lineSheetColumnGroups || [])
    .map((group) => {
      const sx = parseScopedLineKey(selX || "");
      const options = (group.options || []).filter((opt) => {
        const ov = parseScopedLineKey(opt.value);
        if (selX) {
          if (sx.isScoped && ov.isScoped) {
            if (sx.sheetId === ov.sheetId && sx.column === ov.column) return false;
          } else if (!sx.isScoped) {
            if (ov.column === selX || (!ov.isScoped && opt.value === selX)) return false;
          } else if (opt.value === selX) return false;
        }
        return true;
      });
      return { ...group, options };
    })
    .filter((group) => group.options.length > 0);
  const sheetNameById = Object.fromEntries(
    (lineSheetColumnGroups || []).map((g) => [g.sheetId, g.sheetName || g.sheetId]),
  );
  const formatColumnLabel = (value) => {
    const parsed = parseScopedLineKey(value);
    if (!parsed.isScoped) return parsed.column || String(value || "");
    const sheetLabel = sheetNameById[parsed.sheetId] || parsed.sheetId;
    return `${sheetLabel} • ${parsed.column}`;
  };
  const hasGroupedLineOptions = groupedLineOptions.length > 0;
  const lineNonNumericColumns = (selY || []).filter((col) => {
    if (!col || !Array.isArray(chartData) || !chartData.length) return false;
    for (let i = 0; i < chartData.length; i += 1) {
      const v = chartData[i]?.[col];
      if (v == null || v === "") continue;
      const n = Number(v);
      return !Number.isFinite(n);
    }
    return false;
  });
  const hasSelectedPalette = Array.isArray(selectedPalette) && selectedPalette.length > 0;
  const defaultPalette = dark
    ? ["#ffffff", "#000000", "#000000", "#ffffff"]
    : ["#000000", "#ffffff", "#ffffff", "#000000"];
  const activePalette = hasSelectedPalette ? selectedPalette : defaultPalette;
  const fallbackSeriesColor = dark ? "#ffffff" : "#000000";
  const defaultSeriesColorAt = (idx) => {
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
  const seriesInstanceKey = (index) => `line:${index}`;
  const getSeriesColor = (seriesColumn, index) =>
    lineColorOverrides?.[seriesInstanceKey(index)] ||
    lineColorOverrides?.[seriesColumn] ||
    defaultSeriesColorAt(index);
  const setSeriesColorOverride = (index, color) => {
    const key = seriesInstanceKey(index);
    setLineColorOverrides((prev) => ({
      ...(prev || {}),
      [key]: color,
    }));
  };
  const clearSeriesColorOverride = (index, legacyKey = null) => {
    const key = seriesInstanceKey(index);
    setLineColorOverrides((prev) => {
      const next = { ...(prev || {}) };
      delete next[key];
      if (legacyKey) delete next[legacyKey];
      return next;
    });
  };
  const getLineColor = (lineColumn, index) => getSeriesColor(lineColumn, index);
  const filterOperatorOptions = [
    { value: "=", label: "=" },
    { value: "!=", label: "!=" },
    { value: ">", label: ">" },
    { value: ">=", label: ">=" },
    { value: "<", label: "<" },
    { value: "<=", label: "<=" },
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "does not contain" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ];
  const normalizedChartLineFilters = Array.isArray(chartLineFilters) ? chartLineFilters : [];
  const chartLineOptions = (selY || []).map((lineColumn, lineIdx) => ({
    value: `line:${lineIdx}`,
    lineColumn,
    label: `Line ${lineIdx + 1}: ${formatColumnLabel(lineColumn)}`,
  }));
  const resolveRuleSeriesValue = (seriesKey) => {
    const raw = String(seriesKey || "");
    if (chartLineOptions.some((opt) => opt.value === raw)) return raw;
    return chartLineOptions.find((opt) => opt.lineColumn === raw)?.value || raw;
  };
  const rowValueForFilterColumn = (row, column) => {
    if (!row || !column) return undefined;
    if (Object.prototype.hasOwnProperty.call(row, column)) return row[column];
    const raw = String(column);
    const splitIdx = raw.indexOf("::");
    if (splitIdx > 0) {
      const descoped = raw.slice(splitIdx + 2);
      if (Object.prototype.hasOwnProperty.call(row, descoped)) return row[descoped];
    }
    return undefined;
  };
  const computeDateFilterColumnStats = (column) => {
    const rows = Array.isArray(chartData) ? chartData : [];
    const keyTail = String(column || "").includes("::")
      ? String(column || "").slice(String(column || "").indexOf("::") + 2)
      : String(column || "");
    const keyLooksTemporal = /(time|timestamp|date|datetime|created_at|created_time|updated_at)/i.test(keyTail);
    let nonEmpty = 0;
    let temporal = 0;
    let minMs = Number.POSITIVE_INFINITY;
    let maxMs = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < rows.length; i += 1) {
      const v = rowValueForFilterColumn(rows[i], column);
      if (v == null || v === "") continue;
      nonEmpty += 1;
      const s = String(v).trim();
      const valueLooksTemporal =
        v instanceof Date ||
        (typeof v === "number" && Math.abs(v) >= 1e9) ||
        /^\d{4}-\d{1,2}([-/T\s]|$)/.test(s) ||
        /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(s) ||
        /^(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)(\s+\d{1,2})?(,?\s+\d{4})?$/i.test(s) ||
        /^\d{10,}$/.test(s);
      const ms = temporalToMs(v);
      if (!Number.isFinite(ms) || (!keyLooksTemporal && !valueLooksTemporal)) continue;
      temporal += 1;
      minMs = Math.min(minMs, ms);
      maxMs = Math.max(maxMs, ms);
    }
    const minDate = Number.isFinite(minMs) ? new Date(minMs) : undefined;
    const maxDate = Number.isFinite(maxMs) ? new Date(maxMs) : undefined;
    if (minDate) minDate.setHours(0, 0, 0, 0);
    if (maxDate) maxDate.setHours(23, 59, 59, 999);
    return {
      nonEmpty,
      temporal,
      min: minDate,
      max: maxDate,
      keyLooksTemporal,
    };
  };
  const dateFilterColumnKey = normalizedChartLineFilters
    .map((rule) => rule?.column)
    .filter(Boolean)
    .join("\u0001");
  const dateFilterColumnStatsByKey = useMemo(() => {
    const columns = new Set(dateFilterColumnKey ? dateFilterColumnKey.split("\u0001") : []);
    const next = Object.create(null);
    for (const column of columns) {
      next[column] = computeDateFilterColumnStats(column);
    }
    return next;
  }, [chartData, dateFilterColumnKey]);
  const getDateFilterColumnStats = (column) =>
    dateFilterColumnStatsByKey[column] || computeDateFilterColumnStats(column);
  const isDateLikeFilterColumn = (column) => {
    if (!column) return false;
    const stats = getDateFilterColumnStats(column);
    if (stats.temporal <= 0) return false;
    if (getAxisType?.(column, dataTypes, chartData) === "date") return true;
    if (stats.keyLooksTemporal) return true;
    return stats.nonEmpty > 0 && stats.temporal / stats.nonEmpty >= 0.8;
  };
  const normalizeDateRangeValue = (value) => {
    if (!value || typeof value !== "object") return { from: undefined, to: undefined };
    const fromMs = value.from ? temporalToMs(value.from) : NaN;
    const toMs = value.to ? temporalToMs(value.to) : NaN;
    return {
      from: Number.isFinite(fromMs) ? new Date(fromMs) : undefined,
      to: Number.isFinite(toMs) ? new Date(toMs) : undefined,
    };
  };
  const formatDateRangeLabel = (range) => {
    if (range?.from && range?.to) return `${format(range.from, "LLL dd, y")} - ${format(range.to, "LLL dd, y")}`;
    if (range?.from) return format(range.from, "LLL dd, y");
    if (range?.to) return `Until ${format(range.to, "LLL dd, y")}`;
    return "Pick date range";
  };
  useEffect(() => {
    if (!normalizedChartLineFilters.some((rule) => rule?.operator === "date_range" && !isDateLikeFilterColumn(rule.column))) return;
    setChartLineFilters((prev) =>
      (Array.isArray(prev) ? prev : []).map((rule) =>
        rule?.operator === "date_range" && !isDateLikeFilterColumn(rule.column)
          ? { ...rule, operator: "=", value: "" }
          : rule
      )
    );
  }, [chartData, dataTypes, normalizedChartLineFilters, setChartLineFilters]);
  const addChartLineFilter = (seriesKey = "") => {
    const fallbackSeries = seriesKey || chartLineOptions[0]?.value || "";
    const fallbackColumn = (xOptions || []).find(Boolean) || "";
    if (!fallbackSeries) return;
    setChartLineFilters((prev) => [
      ...(Array.isArray(prev) ? prev : []),
      {
        id: `chart-filter-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        seriesKey: fallbackSeries,
        column: fallbackColumn,
        operator: "=",
        value: "",
      },
    ]);
  };
  const updateChartLineFilter = (id, patch) => {
    setChartLineFilters((prev) =>
      (Array.isArray(prev) ? prev : []).map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
    );
  };
  const removeChartLineFilter = (id) => {
    setChartLineFilters((prev) => (Array.isArray(prev) ? prev : []).filter((rule) => rule.id !== id));
  };

  const showYAxisFormat =
    selY?.[0] && chartData?.length && getAxisType(selY[0], dataTypes, chartData) === "number";
  const yAxisFormatControls = showYAxisFormat ? (
    <Collapsible open={yAxisFormatOpen} onOpenChange={setYAxisFormatOpen} className="border-t py-2">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-md py-1 text-left text-xs font-bold ${
            dark ? "text-slate-200 hover:text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>y-axis</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${yAxisFormatOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={String(yAxisDivisor || 1)}
            onValueChange={(v) => setYAxisDivisor(Number(v) || 1)}
          >
            <SelectTrigger className="h-8 min-w-0 text-xs">
              <SelectValue placeholder="Divide by" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="1">No divisor (x1)</SelectItem>
              <SelectItem value="1000">/ 1,000</SelectItem>
              <SelectItem value="1000000">/ 1,000,000</SelectItem>
              <SelectItem value="1000000000">/ 1,000,000,000</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={yAxisCompact ? "compact" : "full"}
            onValueChange={(v) => setYAxisCompact(v === "compact")}
          >
            <SelectTrigger className="h-8 min-w-0 text-xs">
              <SelectValue placeholder="Label style" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="compact">Compact (5m, 1.5b)</SelectItem>
              <SelectItem value="full">Full numbers</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CollapsibleContent>
    </Collapsible>
  ) : null;

  return (
    <div className="gradualEffect flex flex-col min-w-0 max-w-full w-full overflow-x-hidden px-4 py-4 border rounded-lg" style={{ zIndex: 20 }}>
      <>
        {!demo && !effectiveData && (
            <div className="flex place-items-center text-xs gap-2 place-items-center bg-indigo-500/80 rounded-lg px-4 py-2 mx-8 mb-4">
              <div className="rounded-full bg-white h-2 w-2 mr-1 animate-bounce" />
              <small className="text-xs text-white"> You haven't connected any data yet. </small>
              <span
                className="ml-2 flex cursor-pointer place-items-center rounded-md border border-white/40 bg-background/95 px-2 py-0.5 text-[10px] text-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => setViewing("dataStart")}
              >
                Fix<CaretRightIcon />
              </span>
            </div>
          )}
          {!demo && chartDataOverride && chartDataOverrideMeta && (
            <div className="flex place-items-center text-xs gap-2 place-items-center bg-lychee_blue/80 rounded-lg px-4 py-2 mx-8 mb-4">
              <small className="text-xs text-white"> Viewing summary: {chartDataOverrideMeta.title} </small>
              <span
                className="ml-2 flex cursor-pointer place-items-center rounded-md border border-white/40 bg-background/95 px-2 py-0.5 text-[10px] text-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setChartDataOverride?.(null);
                  setChartDataOverrideMeta?.(null);
                }}
              >
                Back to main data<CaretRightIcon />
              </span>
            </div>
          )}
          <Accordion
            type="single"
            collapsible
            value={openSection}
            onValueChange={(v) => setOpenSection(v || "")}
            className="w-full"
          >
              <AccordionItem value="chartType">
                <AccordionTrigger className="py-2 text-xs font-bold text-muted-foreground hover:no-underline">
                  <span className="flex items-center gap-2">
                    <span>Chart Type</span>
                    <span className={`text-[10px] font-medium ${dark ? "text-slate-300" : "text-muted-foreground"}`}>
                      {`${chartTypeLabel}`}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <TooltipProvider delayDuration={400}>
                    <div className="min-w-0 flex-wrap items-center gap-2">
                      <ToggleGroup
                        variant="outline"
                        type="single"
                        aria-label="Chart Type"
                        className="flex-wrap"
                        value={selChartType}
                        onValueChange={(value) => {
                          if (value) setSelChartType(value);
                        }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="area"
                              aria-label="Area chart"
                              className={selChartType === "area" ? chartTypeSelectedClass : undefined}
                            >
                              <MdOutlineAreaChart className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            Area chart — filled band under the line; emphasizes magnitude and stacked totals.
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="bar"
                              aria-label="Bar chart"
                              className={selChartType === "bar" ? chartTypeSelectedClass : undefined}
                            >
                              <IoStatsChart className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            Bar chart — compare categories side by side along the X axis.
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="line"
                              aria-label="Line chart"
                              className={selChartType === "line" ? chartTypeSelectedClass : undefined}
                            >
                              <PiChartLine className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            Line chart — show change and trends over the X axis (often time).
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="pie"
                              aria-label="Pie chart"
                              className={selChartType === "pie" ? chartTypeSelectedClass : undefined}
                            >
                              <IoPieChartOutline className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            Pie chart — each slice is a share of the whole (uses one numeric Y column).
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="radar"
                              aria-label="Radar chart"
                              className={selChartType === "radar" ? chartTypeSelectedClass : undefined}
                            >
                              <AiOutlineRadarChart className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            Radar chart — compare several variables on radial axes from the center.
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="treemap"
                              aria-label="Treemap"
                              className={selChartType === "treemap" ? chartTypeSelectedClass : undefined}
                            >
                              <LayoutGrid className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                            Treemap — nested rectangles sized by value (Recharts Treemap). Uses your X column for
                            labels and Y for area; good for category share (e.g. Kalshi volume by prefix).
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="scatter"
                              aria-label="Scatter / bubble chart"
                              className={selChartType === "scatter" ? chartTypeSelectedClass : undefined}
                            >
                              <CircleDot className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            Scatter / bubble — points from X and Y; optional Z column for bubble size.
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="liveline"
                              aria-label="Liveline chart"
                              className={selChartType === "liveline" ? chartTypeSelectedClass : undefined}
                            >
                              <span className="relative inline-flex h-3 w-3">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                              </span>
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            Live compact line for streaming live data series.
                          </TooltipContent>
                        </Tooltip>
                      </ToggleGroup>
                    </div>
                  </TooltipProvider>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="data">
                <AccordionTrigger className="py-2 text-xs font-bold text-muted-foreground hover:no-underline">
                  Data
                </AccordionTrigger>
                <AccordionContent>
                  {selChartType === "line" ? (
                    <>
                      <div className="py-2 space-y-2">
                        <div className="flex min-w-0 items-center gap-2 text-foreground">
                          <span className={`text-xs font-semibold ${dark ? "text-slate-200" : "text-muted-foreground"}`}>Pivot (x-axis):</span>
                          <Select value={xAxisSelectValue} onValueChange={handleXAxisChange}>
                            <SelectTrigger className="h-8 min-w-0 flex-1 text-xs font-normal">
                              <SelectValue placeholder="X axis" className="text-xs font-normal" />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                              <SelectItem value={CHART_X_AXIS_NONE} className="text-xs font-normal">
                                — Select X axis —
                              </SelectItem>
                              {(xOptions || []).map((i) => (
                                <SelectItem key={i} value={i} className="text-xs font-normal">
                                  {formatColumnLabel(i)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {selX ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Sort</span>
                            {(() => {
                              const xType = getAxisType(selX, dataTypes, chartData);
                              const isCategorical = xType === "string" && !lineIsTemporalX;
                              const ascendingLabel = isCategorical ? "Alphabetical" : lineIsTemporalX ? "Chronological" : "Ascending";
                              const descendingLabel = isCategorical ? "Reverse-alphabetical" : lineIsTemporalX ? "Reverse chronological" : "Descending";
                              return (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => setSortXDir((d) => (d === "desc" ? "asc" : "desc"))}
                            >
                              {sortXDir === "desc" ? (
                                <>
                                  <ArrowDown className="mr-1 h-3 w-3" />
                                  {descendingLabel}
                                </>
                              ) : (
                                <>
                                  <ArrowUp className="mr-1 h-3 w-3" />
                                  {ascendingLabel}
                                </>
                              )}
                            </Button>
                              );
                            })()}
                          </div>
                        ) : null}
                        <div className="flex items-center">
                          <Switch
                            id="chart-line-time-series-x-axis"
                            checked={xTimeScale}
                            onCheckedChange={setXTimeScale}
                            className="scale-75 origin-left"
                          />
                          <Label
                            htmlFor="chart-line-time-series-x-axis"
                            className={`pr-1 cursor-pointer text-xs font-normal text-muted-foreground`}
                          >
                            Set x-axis to timeseries format
                          </Label>
                          <TooltipProvider delayDuration={250}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={`inline-flex cursor-help ${dark ? "text-slate-400" : "text-muted-foreground"}`}>
                                  <CircleHelp className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                                Uses a numeric time scale so each row maps along the full width. Turn off for categorical X (e.g. labels).
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex items-center">
                          <Switch
                            id="chart-line-human-readable-time"
                            checked={lineHumanReadableTime}
                            onCheckedChange={setLineHumanReadableTime}
                            className="scale-75 origin-left"
                          />
                          <Label
                            htmlFor="chart-line-human-readable-time"
                            className={`pr-1 cursor-pointer text-xs font-normal ${dark ? "text-slate-300" : "text-muted-foreground"}`}
                          >
                            Human readable time
                          </Label>
                          <TooltipProvider delayDuration={250}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={`inline-flex cursor-help ${dark ? "text-slate-400" : "text-muted-foreground"}`}>
                                  <CircleHelp className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                                format time like dd-mm-yyyy instead of unix/ iso time stamp
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        {selX ? (
                          <div className="grid gap-1.5 pt-1">
                            <Label className="text-xs text-muted-foreground">
                              Date label format (display only)
                            </Label>
                            <Select
                              value={String(xDateFormatPreset || "auto")}
                              onValueChange={(v) => setXDateFormatPreset?.(v || "auto")}
                            >
                              <SelectTrigger className="h-8 min-w-0 text-xs font-normal">
                                <SelectValue placeholder="Auto" className="text-xs font-normal" />
                              </SelectTrigger>
                              <SelectContent className="text-xs">
                                {(Array.isArray(X_DATE_FORMAT_PRESETS) ? X_DATE_FORMAT_PRESETS : []).map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs font-normal">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}

                        <div className="pt-2">
                          <p className="text-xs font-bold mb-1 text-muted-foreground">Lines</p>

                          <div className="py-2 flex flex-wrap gap-2">
                            {(selY || []).map((lineColumn, index) => (
                              <div key={`${lineColumn}-${index}`} className="inline-flex items-center gap-1">
                                <Badge variant="secondary" className="min-w-0 max-w-[13rem] gap-1 px-2 py-1 text-[10px] font-normal leading-none">
                                  <span className="min-w-0 truncate whitespace-nowrap">
                                    {(() => {
                                      const parsed = parseScopedLineKey(lineColumn);
                                      const sheetLabel = parsed.isScoped
                                        ? (lineSheetColumnGroups || []).find((g) => g.sheetId === parsed.sheetId)?.sheetName || parsed.sheetId
                                        : null;
                                      const label = parsed.column || lineColumn;
                                      return `Line ${index + 1}: ${sheetLabel ? `${sheetLabel} • ` : ""}${label}`;
                                    })()}
                                  </span>
                                  {(selY || []).length > 1 ? (
                                    <button
                                      type="button"
                                      className="inline-flex h-4 w-4 items-center justify-center rounded-sm hover:bg-muted-foreground/20"
                                      aria-label={`Remove Line ${index + 1}`}
                                      onClick={() => removeY(lineColumn, index)}
                                    >
                                      x
                                    </button>
                                  ) : null}
                                </Badge>
                                <ChartColorPalettePopover
                                  value={lineColorOverrides?.[seriesInstanceKey(index)] ?? lineColorOverrides?.[lineColumn] ?? null}
                                  swatchColor={getLineColor(lineColumn, index)}
                                  onChange={(color) => setSeriesColorOverride(index, color)}
                                  onClear={() => clearSeriesColorOverride(index, lineColumn)}
                                  ariaLabel={`Pick color for line ${index + 1}`}
                                  triggerClassName="h-4 w-4"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="">
                            <Select
                              value={lineAddValue}
                              onValueChange={(val) => {
                                if (!val) return;
                                handleSelectY(val);
                                setLineAddValue("");
                              }}
                            >
                              <SelectTrigger
                                className="h-8 min-w-[140px] text-xs disabled:opacity-50"
                                disabled={!hasGroupedLineOptions}
                              >
                                <SelectValue placeholder="+ Add Line" className="text-xs" />
                              </SelectTrigger>
                              <SelectContent className="text-xs">
                                {groupedLineOptions.map((group, groupIdx) => (
                                  <SelectGroup key={group.sheetId}>
                                    {groupIdx > 0 ? <SelectSeparator /> : null}
                                    <SelectLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      {group.sheetName}
                                    </SelectLabel>
                                    {group.options.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                        {opt.column}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                ))}
                              </SelectContent>
                            </Select>

                            {!hasGroupedLineOptions && (
                              <span className={`pl-2 text-[10px] text-muted-foreground`}>
                                No more columns to plot
                              </span>
                            )}
                          </div>
                          {lineNonNumericColumns.length > 0 && (
                            <p className="pt-2 text-xs text-destructive">
                              non-numericl vlaue detected this does not work for line cahrt
                            </p>
                          )}
                        </div>
                        {yAxisFormatControls}
                      </div>
                    </>
                  ) : (selChartType === "area") ? (
                    <>
                      <div className="min-w-0 py-2 text-foreground">
                        <Select value={xAxisSelectValue} onValueChange={handleXAxisChange}>
                          <SelectTrigger className="min-w-0">
                            <SelectValue placeholder="X axis" className="text-xs" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value={CHART_X_AXIS_NONE} className="text-xs">
                              — Select X axis —
                            </SelectItem>
                            {xOptions &&
                              xOptions.map((i) => (
                                <SelectItem key={i} value={i} className="text-xs">
                                  {formatColumnLabel(i)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="py-2">
                        <p className={`mb-1 text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"}`}>Areas</p>
                        {selY.length > 0 &&
                          selY.map((yValue, index) => (
                            <div
                              className="flex min-w-0 place-items-center gap-2 py-1 text-foreground"
                              key={`${yValue}-${index}`}
                            >
                              <Select value={yValue} onValueChange={(val) => handleSelectY(val, index)}>
                                <SelectTrigger className="min-w-0 flex-1">
                                  <SelectValue className="text-xs">{formatColumnLabel(yValue)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent className="text-xs">
                                  {availableYOptions &&
                                    availableYOptions.map((i) => (
                                      <SelectItem key={i} value={i} className="text-xs">
                                        {formatColumnLabel(i)}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <ChartColorPalettePopover
                                value={lineColorOverrides?.[seriesInstanceKey(index)] ?? lineColorOverrides?.[yValue] ?? null}
                                swatchColor={getSeriesColor(yValue, index)}
                                onChange={(color) => setSeriesColorOverride(index, color)}
                                onClear={() => clearSeriesColorOverride(index, yValue)}
                                ariaLabel={`Pick color for area ${index + 1}`}
                              />
                              {!(selY.length === 1) && (
                                <div className="cursor-pointer p-1 text-red-400 hover:text-red-700">
                                  <MinusCircle className="h-4 w-4" onClick={() => removeY(yValue, index)} />
                                </div>
                              )}
                            </div>
                          ))}
                        {selY.length === 0 && (
                          <div className="min-w-0">
                            <Select onValueChange={(val) => handleSelectY(val)}>
                              <SelectTrigger className="min-w-0">
                                <SelectValue placeholder="Y column" className="text-xs" />
                              </SelectTrigger>
                              <SelectContent className="text-xs">
                                {availableYOptions &&
                                  availableYOptions.map((i) => (
                                    <SelectItem key={i} value={i} className="text-xs">
                                      {formatColumnLabel(i)}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      {yAxisFormatControls}
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 py-2 text-foreground">
                        <Select value={xAxisSelectValue} onValueChange={handleXAxisChange}>
                          <SelectTrigger className="min-w-0">
                            <SelectValue placeholder="X axis" className="text-xs" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value={CHART_X_AXIS_NONE} className="text-xs">
                              — Select X axis —
                            </SelectItem>
                            {xOptions &&
                              xOptions.map((i) => (
                                <SelectItem key={i} value={i} className="text-xs">
                                  {formatColumnLabel(i)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="py-2">
                        {selY.length > 0 &&
                          selY.map((yValue, index) => (
                            <div className="flex min-w-0 place-items-center gap-2 py-1 text-foreground" key={index}>
                              <Select value={yValue} onValueChange={(val) => handleSelectY(val, index)}>
                                <SelectTrigger className="min-w-0 flex-1">
                                <SelectValue className="text-xs">{formatColumnLabel(yValue)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent className="text-xs">
                                  {availableYOptions &&
                                    availableYOptions.map((i) => (
                                      <SelectItem key={i} value={i} className="text-xs">
                                        {formatColumnLabel(i)}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              {!(selY.length === 1) && (
                                <div className="cursor-pointer p-1 text-red-400 hover:text-red-700">
                                  <MinusCircle className="h-4 w-4" onClick={() => removeY(yValue, index)} />
                                </div>
                              )}
                            </div>
                          ))}
                        {selY.length === 0 && (
                          <div className="min-w-0">
                            <Select onValueChange={(val) => handleSelectY(val)}>
                              <SelectTrigger className="min-w-0">
                                <SelectValue placeholder="Y column" className="text-xs" />
                              </SelectTrigger>
                              <SelectContent className="text-xs">
                                {availableYOptions &&
                                  availableYOptions.map((i) => (
                                    <SelectItem key={i} value={i} className="text-xs">
                                      {formatColumnLabel(i)}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      {selChartType === "bar" && selY.length > 0 && (
                        <div className="pt-2">
                          <p className="mb-1 text-xs font-bold text-muted-foreground">Bars</p>
                          <div className="flex flex-wrap gap-2 py-1">
                            {(selY || []).map((seriesColumn, index) => (
                              <div key={`${seriesColumn}-${index}`} className="inline-flex items-center gap-1">
                                <Badge variant="secondary" className="gap-2 py-1 pl-2 pr-1 text-xs">
                                  <span className="inline-flex items-center gap-1">
                                    <span
                                      className="inline-block h-2 w-2 rounded-full"
                                      style={{ backgroundColor: getSeriesColor(seriesColumn, index) }}
                                    />
                                    {`Bar ${index + 1}: ${formatColumnLabel(seriesColumn)}`}
                                  </span>
                                  {(selY || []).length > 1 ? (
                                    <button
                                      type="button"
                                      className="inline-flex h-4 w-4 items-center justify-center rounded-sm hover:bg-muted-foreground/20"
                                      aria-label={`Remove Bar ${index + 1}`}
                                      onClick={() => removeY(seriesColumn, index)}
                                    >
                                      x
                                    </button>
                                  ) : null}
                                </Badge>
                                <ChartColorPalettePopover
                                  value={lineColorOverrides?.[seriesInstanceKey(index)] ?? lineColorOverrides?.[seriesColumn] ?? null}
                                  swatchColor={getSeriesColor(seriesColumn, index)}
                                  onChange={(color) => setSeriesColorOverride(index, color)}
                                  onClear={() => clearSeriesColorOverride(index, seriesColumn)}
                                  ariaLabel={`Pick color for bar ${index + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {yAxisFormatControls}
                    </>
                  )}

                  {/* Scatter/bubble: Z (bubble size) and Color column */}
                  {selChartType === "scatter" && (
                    <>
                      <div className="min-w-0 py-2">
                        <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Bubble size (Z)</p>
                        <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"}`}>Numeric column for bubble radius</p>
                        <Select value={selZ || ""} onValueChange={(v) => setSelZ(v || null)}>
                          <SelectTrigger className="mt-1 min-w-0">
                            <SelectValue placeholder="Select Z column" className="text-xs" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            {xOptions &&
                              xOptions.filter((k) => k !== selX).map((i) => (
                                <SelectItem key={i} value={i} className="text-xs">
                                  {formatColumnLabel(i)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-0 py-2">
                        <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Color by</p>
                        <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"}`}>Optional column for point color</p>
                        <Select value={selColorCol ?? "__none__"} onValueChange={(v) => setSelColorCol(v === "__none__" ? null : v)}>
                          <SelectTrigger className="mt-1 min-w-0">
                            <SelectValue placeholder="None or select column" className="text-xs" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="__none__" className="text-xs">
                              None
                            </SelectItem>
                            {xOptions &&
                              xOptions.map((i) => (
                                <SelectItem key={i} value={i} className="text-xs">
                                  {formatColumnLabel(i)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selZ && (
                        <div className="py-2 flex items-center gap-2">
                          <span className={`text-xs ${dark ? "text-slate-200" : "text-muted-foreground"}`}>Z scale:</span>
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className={`p-1.5 rounded border ${scaleZ === "log" ? "bg-muted" : "bg-background"} border-border flex items-center gap-1`}
                                  onClick={() => setScaleZ((s) => (s === "log" ? "linear" : "log"))}
                                >
                                  <LogIn className="h-4 w-4" />
                                  <span className="text-[10px]">Z</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                                {scaleZ === "linear" ? "Z: Linear scale." : "Z: Log scale (for large value ranges)."}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </>
                  )}

                  {selChartType !== "pie" && selChartType !== "scatter" && selChartType !== "liveline" && selChartType !== "line" && selChartType !== "treemap" && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleSelectY(availableYOptions[0])}
                      disabled={availableYOptions && availableYOptions.length === 0}
                    >
                      {availableYOptions && availableYOptions.length === 0 ? "You have no more columns" : "+ Stack Another Value"}
                    </Button>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="design">
                <AccordionTrigger className="py-2 text-xs font-bold text-muted-foreground hover:no-underline">
                  Design
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <div className="flex min-w-0 items-center gap-2 border-b border-border/60 pb-3">
                    <Label className="w-24 shrink-0 text-xs text-muted-foreground">Outer box</Label>
                    <ChartColorPalettePopover
                      value={outerBoxColor}
                      onChange={setOuterBoxColor}
                      ariaLabel="Outer box background"
                      onClear={() => setOuterBoxColor(null)}
                    />
                  </div>
                  <div className="flex min-w-0 items-center gap-2 border-b border-border/60 pb-3">
                    <Label className="w-24 shrink-0 text-xs text-muted-foreground">Inner box</Label>
                    <ChartColorPalettePopover
                      value={innerBoxColor}
                      onChange={setInnerBoxColor}
                      ariaLabel="Inner box background"
                      onClear={() => setInnerBoxColor(null)}
                    />
                  </div>

                  {selChartType === "bar" && (
                    <div className="flex min-w-0 items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Switch
                          id="chart-design-rainbow-bar"
                          checked={rainbowBar}
                          onCheckedChange={setRainbowBar}
                          className="scale-75 origin-left"
                        />
                        <Label htmlFor="chart-design-rainbow-bar" className="cursor-pointer text-xs text-muted-foreground">
                          Rainbow bar
                        </Label>
                      </div>
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              disabled={!rainbowBar}
                              aria-label="Shift rainbow color cycle"
                              onClick={() => setRainbowBarShuffleNonce((n) => n + 1)}
                            >
                              <Shuffle className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs max-w-[200px]">
                            Offset the cycle: mist→…→rose at shades 100→…→900, then repeat
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}

                  {selChartType === "bar" && !demo && xOptions?.length > 0 && (
                    <div className="min-w-0 space-y-1 border-b border-border/60 pb-3 pt-1">
                      <Label className="text-xs text-muted-foreground">Rainbow legend labels</Label>
                      <p className="text-[10px] leading-snug text-muted-foreground">
                        Column shown next to each color when Rainbow bar and the legend are on (default matches the X
                        axis).
                      </p>
                      <Select
                        value={rainbowLegendLabelColumn ?? "__x_axis__"}
                        onValueChange={(v) => setRainbowLegendLabelColumn(v === "__x_axis__" ? null : v)}
                      >
                        <SelectTrigger className="mt-0.5 h-8 min-w-0 text-xs">
                          <SelectValue placeholder="Label column" />
                        </SelectTrigger>
                        <SelectContent className="text-xs" position="popper">
                          <SelectItem value="__x_axis__" className="text-xs">
                            Same as X axis
                          </SelectItem>
                          {xOptions.map((k) => (
                            <SelectItem key={k} value={k} className="text-xs">
                              {formatColumnLabel(k)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="mt-2 space-y-1">
                        <Label className="text-xs text-muted-foreground">Rainbow legend layout</Label>
                        <p className="text-[10px] leading-snug text-muted-foreground">
                          Center: wrapped rows. Columns: equal-width columns, items read top-to-bottom in each column.
                        </p>
                        <ToggleGroup
                          type="single"
                          variant="outline"
                          size="sm"
                          className="mt-0.5 flex w-full min-w-0 justify-stretch [&>button]:min-w-0 [&>button]:flex-1"
                          value={rainbowLegendLayout}
                          onValueChange={(v) => {
                            if (v === "center" || v === "columns") setRainbowLegendLayout(v);
                          }}
                          aria-label="Rainbow legend layout"
                        >
                          <ToggleGroupItem value="center" className="text-xs">
                            Center
                          </ToggleGroupItem>
                          <ToggleGroupItem value="columns" className="text-xs">
                            Columns
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                    </div>
                  )}

                  {(selChartType === "area" || selChartType === "line") && (
                    <div className="min-w-0 space-y-3 border-b border-border/60 pb-3">
                      <Label className="text-xs font-semibold text-muted-foreground">Line style</Label>
                      <Select value={lineStyle} onValueChange={(value) => setLineStyle(value)}>
                        <SelectTrigger className="mt-1 h-8 min-w-0 text-xs">
                          <SelectValue placeholder="Line style" />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          {["natural", "linear", "step"].map((i) => (
                            <SelectItem key={i} value={i} className="text-xs">
                              {formatColumnLabel(i)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="chart-design-line-aliasing"
                          checked={lineAliasing}
                          onCheckedChange={setLineAliasing}
                          className="scale-75 origin-left"
                        />
                        <Label htmlFor="chart-design-line-aliasing" className="cursor-pointer text-xs text-muted-foreground">
                          Aliasing
                        </Label>
                      </div>
                      <p className="text-[10px] leading-snug text-muted-foreground">
                        Connect line segments across null or filtered-out values so the chart appears continuous.
                      </p>
                    </div>
                  )}

                  {chartTimeframesAvailable && (
                    <div className="space-y-2 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="chart-design-timeframes"
                          checked={chartTimeframesEnabled}
                          onCheckedChange={setChartTimeframesEnabled}
                          className="scale-75 origin-left"
                        />
                        <Label htmlFor="chart-design-timeframes" className="cursor-pointer text-xs text-muted-foreground">
                          Add time frames
                        </Label>
                      </div>
                      {chartTimeframesEnabled ? (
                        <Select
                          value={String(chartTimeframe || "15m")}
                          onValueChange={(v) => setChartTimeframe?.(v || "15m")}
                        >
                          <SelectTrigger className="h-8 min-w-0 text-xs">
                            <SelectValue placeholder="Time frame" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            {(Array.isArray(CHART_TIMEFRAME_OPTIONS) ? CHART_TIMEFRAME_OPTIONS : []).map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-[10px] leading-snug text-muted-foreground">
                          Bucket the visible chart by time without changing the sheet data.
                        </p>
                      )}
                    </div>
                  )}

                  {(selChartType === "area" || selChartType === "line" || selChartType === "bar") && (
                    <div className="space-y-2 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="chart-design-grid-visible"
                          checked={gridVisible}
                          onCheckedChange={setGridVisible}
                          className="scale-75 origin-left"
                        />
                        <Label htmlFor="chart-design-grid-visible" className="cursor-pointer text-xs text-muted-foreground">
                          Show grid lines
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="chart-design-y-axis-line"
                          checked={yAxisLineVisible}
                          onCheckedChange={setYAxisLineVisible}
                          className="scale-75 origin-left"
                        />
                        <Label htmlFor="chart-design-y-axis-line" className="cursor-pointer text-xs text-muted-foreground">
                          Show Y-axis line
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="chart-design-hide-x-axis-labels"
                          checked={hideXAxisLabels}
                          onCheckedChange={setHideXAxisLabels}
                          className="scale-75 origin-left"
                        />
                        <Label htmlFor="chart-design-hide-x-axis-labels" className="cursor-pointer text-xs text-muted-foreground">
                          Hide X-axis labels
                        </Label>
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <Label className="w-28 shrink-0 text-xs text-muted-foreground">Grid lines</Label>
                        <ChartColorPalettePopover
                          value={gridLineColor}
                          onChange={setGridLineColor}
                          ariaLabel="Grid line color"
                          onClear={() => setGridLineColor(null)}
                        />
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <Label className="w-28 shrink-0 text-xs text-muted-foreground">Chart text</Label>
                        <ChartColorPalettePopover
                          value={chartTextColor}
                          onChange={setChartTextColor}
                          ariaLabel="Chart text color"
                          onClear={() => setChartTextColor(null)}
                        />
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <Label className="w-28 shrink-0 text-xs text-muted-foreground">X-axis text</Label>
                        <ChartColorPalettePopover
                          value={xAxisTickColor}
                          onChange={setXAxisTickColor}
                          ariaLabel="X-axis tick color"
                          onClear={() => setXAxisTickColor(null)}
                        />
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <Label className="w-28 shrink-0 text-xs text-muted-foreground">Y-axis text</Label>
                        <ChartColorPalettePopover
                          value={yAxisTickColor}
                          onChange={setYAxisTickColor}
                          ariaLabel="Y-axis tick color"
                          onClear={() => setYAxisTickColor(null)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="chart-design-x-tick-angle"
                          checked={xAxisTicksAngled}
                          onCheckedChange={setXAxisTicksAngled}
                          className="scale-75 origin-left"
                        />
                        <Label htmlFor="chart-design-x-tick-angle" className="cursor-pointer text-xs text-muted-foreground">
                          Angle X-axis labels (−45°)
                        </Label>
                      </div>

                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <Label className="text-xs text-muted-foreground">
                          X-axis label gap
                        </Label>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            aria-label="Decrease x-axis label gap"
                            onClick={() => setXAxisLabelGapPx?.((v) => Math.max(0, (Number(v) || 0) - 2))}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Input
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="h-7 w-16 text-center text-xs tabular-nums"
                            value={String(Number(xAxisLabelGapPx) || 0)}
                            onChange={(e) => {
                              const n = Math.max(0, Math.min(60, Math.round(Number(e.target.value || 0))));
                              setXAxisLabelGapPx?.(Number.isFinite(n) ? n : 0);
                            }}
                            aria-label="X-axis label gap in pixels"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            aria-label="Increase x-axis label gap"
                            onClick={() => setXAxisLabelGapPx?.((v) => Math.min(60, (Number(v) || 0) + 2))}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pb-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Label htmlFor="chart-design-title" className="w-24 shrink-0 text-xs text-muted-foreground">
                        Title
                      </Label>
                      <Input
                        id="chart-design-title"
                        type="text"
                        value={title}
                        placeholder="Give your chart a title"
                        className="h-8 min-w-0 flex-1 text-xs"
                        onChange={(e) => setTitle(e.target.value)}
                      />
                      <ChartColorPalettePopover
                        value={titleColor}
                        onChange={setTitleColor}
                        ariaLabel="Title text color"
                        onClear={() => setTitleColor(null)}
                      />
                      <button
                        type="button"
                        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-yellow-400/30 p-2 text-foreground hover:bg-lychee_green/40"
                        onClick={() => setTitleHidden(!titleHidden)}
                        aria-label={titleHidden ? "Show title on chart" : "Hide title on chart"}
                      >
                        {!titleHidden ? <EyeOpenIcon className="h-3 w-3" /> : <EyeClosedIcon className="h-3 w-3" />}
                      </button>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <Label htmlFor="chart-design-desc" className="w-24 shrink-0 text-xs text-muted-foreground">
                        Description
                      </Label>
                      <Input
                        id="chart-design-desc"
                        type="text"
                        value={subTitle}
                        placeholder="Description"
                        className="h-8 min-w-0 flex-1 text-xs"
                        onChange={(e) => setSubTitle(e.target.value)}
                      />
                      <ChartColorPalettePopover
                        value={subTitleColor}
                        onChange={setSubTitleColor}
                        ariaLabel="Description text color"
                        onClear={() => setSubTitleColor(null)}
                      />
                      <button
                        type="button"
                        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-yellow-400/30 p-2 text-foreground hover:bg-lychee_green/40"
                        onClick={() => setSubTitleHidden(!subTitleHidden)}
                        aria-label={subTitleHidden ? "Show description on chart" : "Hide description on chart"}
                      >
                        {!subTitleHidden ? <EyeOpenIcon className="h-3 w-3" /> : <EyeClosedIcon className="h-3 w-3" />}
                      </button>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <Label htmlFor="chart-design-body-h" className="w-24 shrink-0 text-xs text-muted-foreground">
                        Body heading
                      </Label>
                      <Input
                        id="chart-design-body-h"
                        type="text"
                        value={bodyHeading}
                        placeholder="Body heading"
                        className="h-8 min-w-0 flex-1 text-xs"
                        onChange={(e) => setBodyHeading(e.target.value)}
                      />
                      <ChartColorPalettePopover
                        value={bodyHeadingColor}
                        onChange={setBodyHeadingColor}
                        ariaLabel="Body heading color"
                        onClear={() => setBodyHeadingColor(null)}
                      />
                      <button
                        type="button"
                        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-yellow-400/30 p-2 text-foreground hover:bg-lychee_green/40"
                        onClick={() => setHeadingHidden(!bodyHeadingHidden)}
                        aria-label={bodyHeadingHidden ? "Show body heading on chart" : "Hide body heading on chart"}
                      >
                        {!bodyHeadingHidden ? <EyeOpenIcon className="h-3 w-3" /> : <EyeClosedIcon className="h-3 w-3" />}
                      </button>
                    </div>
                    <div className="flex min-w-0 items-start gap-2">
                      <Label htmlFor="chart-design-content" className="w-24 shrink-0 pt-2 text-xs text-muted-foreground">
                        Content
                      </Label>
                      <Textarea
                        id="chart-design-content"
                        value={bodyContent}
                        placeholder="Content"
                        className="min-h-[72px] min-w-0 flex-1 resize-y text-xs"
                        onChange={(e) => setBodyContent(e.target.value)}
                      />
                      <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
                        <ChartColorPalettePopover
                          value={bodyContentColor}
                          onChange={setBodyContentColor}
                          ariaLabel="Content text color"
                          onClear={() => setBodyContentColor(null)}
                        />
                        <button
                          type="button"
                          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-yellow-400/30 p-2 text-foreground hover:bg-lychee_green/40"
                          onClick={() => setBodyContentHidden(!bodyContentHidden)}
                          aria-label={bodyContentHidden ? "Show content on chart" : "Hide content on chart"}
                        >
                          {!bodyContentHidden ? <EyeOpenIcon className="h-3 w-3" /> : <EyeClosedIcon className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

              {/* Scatter/bubble: Z (bubble size) and Color column */}
              {selChartType === "scatter" && (
                <>
                  <div className="min-w-0 py-2">
                    <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Bubble size (Z)</p>
                    <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"}`}>Numeric column for bubble radius</p>
                    <Select value={selZ || ""} onValueChange={(v) => setSelZ(v || null)}>
                      <SelectTrigger className="mt-1 min-w-0">
                        <SelectValue placeholder="Select Z column" className="text-xs" />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        {xOptions &&
                          xOptions.filter((k) => k !== selX).map((i) => (
                            <SelectItem key={i} value={i} className="text-xs">
                              {formatColumnLabel(i)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 py-2">
                    <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Color by</p>
                    <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"}`}>Optional column for point color</p>
                    <Select value={selColorCol ?? "__none__"} onValueChange={(v) => setSelColorCol(v === "__none__" ? null : v)}>
                      <SelectTrigger className="mt-1 min-w-0">
                        <SelectValue placeholder="None or select column" className="text-xs" />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="__none__" className="text-xs">
                          None
                        </SelectItem>
                        {xOptions &&
                          xOptions.map((i) => (
                            <SelectItem key={i} value={i} className="text-xs">
                              {formatColumnLabel(i)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selZ && (
                    <div className="py-2 flex items-center gap-2">
                      <span className={`text-xs ${dark ? "text-slate-200" : "text-muted-foreground"}`}>Z scale:</span>
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={`p-1.5 rounded border ${scaleZ === "log" ? "bg-muted" : "bg-background"} border-border flex items-center gap-1`}
                              onClick={() => setScaleZ((s) => (s === "log" ? "linear" : "log"))}
                            >
                              <LogIn className="h-4 w-4" />
                              <span className="text-[10px]">Z</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                            {scaleZ === "linear" ? "Z: Linear scale." : "Z: Log scale (for large value ranges)."}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </>
              )}
              {selChartType === "liveline" && (
                <div className="mt-3 rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"}`}>Liveline</p>
                    <span className="text-[10px] text-muted-foreground">Live canvas chart</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={livelineMomentum ? "default" : "outline"} size="sm" className="h-8 text-xs justify-start" onClick={() => setLivelineMomentum((v) => !v)}>
                      Momentum
                    </Button>
                    <Button type="button" variant={livelineShowValue ? "default" : "outline"} size="sm" className="h-8 text-xs justify-start" onClick={() => setLivelineShowValue((v) => !v)}>
                      Value overlay
                    </Button>
                    <Button
                      type="button"
                      variant={livelineValueMomentumColor ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs justify-start"
                      onClick={() => setLivelineValueMomentumColor((v) => !v)}
                      disabled={!livelineShowValue}
                      title={!livelineShowValue ? "Enable value overlay first" : undefined}
                    >
                      Value momentum color
                    </Button>
                    <Button type="button" variant={livelineWindowsEnabled ? "default" : "outline"} size="sm" className="h-8 text-xs justify-start" onClick={() => setLivelineWindowsEnabled((v) => !v)}>
                      Time windows
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={livelineExaggerate ? "default" : "outline"} size="sm" className="h-8 text-xs justify-start" onClick={() => setLivelineExaggerate((v) => !v)}>
                      Exaggerate
                    </Button>
                    <Button type="button" variant={livelineScrub ? "default" : "outline"} size="sm" className="h-8 text-xs justify-start" onClick={() => setLivelineScrub((v) => !v)}>
                      Scrub
                    </Button>
                    <Button type="button" variant={livelineDegen ? "default" : "outline"} size="sm" className="h-8 text-xs justify-start" onClick={() => setLivelineDegen((v) => !v)}>
                      Degen
                    </Button>
                    <Button type="button" variant={livelineBadge ? "default" : "outline"} size="sm" className="h-8 text-xs justify-start" onClick={() => setLivelineBadge((v) => !v)}>
                      Badge
                    </Button>
                  </div>
                  <div className="grid min-w-0 grid-cols-2 gap-2 items-center">
                    <div className="space-y-1">
                      <p className={`text-[11px] ${dark ? "text-slate-300" : "text-muted-foreground"}`}>Badge variant</p>
                      <Select value={livelineBadgeVariant} onValueChange={(v) => setLivelineBadgeVariant(v)} disabled={!livelineBadge}>
                        <SelectTrigger className="h-8 min-w-0 text-xs">
                          <SelectValue placeholder="default" />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="default">default</SelectItem>
                          <SelectItem value="minimal">minimal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-[11px] ${dark ? "text-slate-300" : "text-muted-foreground"}`}>Line color</p>
                      <Select value={livelineColorChoice} onValueChange={(v) => setLivelineColorChoice(v)}>
                        <SelectTrigger className="h-8 min-w-0 text-xs">
                          <SelectValue placeholder="Palette (auto)" />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          {LIVELINE_COLOR_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {livelineWindowsEnabled && (
                    <div className="pt-1">
                      <p className={`text-[11px] ${dark ? "text-slate-300" : "text-muted-foreground"}`}>Windows: 1m, 5m, 15m (rounded)</p>
                    </div>
                  )}
                </div>
              )}
              {!demo && effectiveData?.length > 0 && xOptions?.length > 0 &&
                (selChartType === "bar" ||
                  selChartType === "area" ||
                  selChartType === "line" ||
                  selChartType === "pie") && (
                  <div className="min-w-0 space-y-3 border-b border-border/60 py-3">
                    <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"}`}>Tooltip</p>
                    <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"}`}>
                      Hover over your chart to view tooltip
                    </p>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="chart-tooltip-show-x"
                          checked={tooltipShowXValue}
                          onCheckedChange={setTooltipShowXValue}
                          className="scale-75 origin-left"
                        />
                        <Label htmlFor="chart-tooltip-show-x" className="cursor-pointer text-xs text-muted-foreground">
                          Show X value in tooltip
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="chart-tooltip-show-y"
                          checked={tooltipShowYValue}
                          onCheckedChange={setTooltipShowYValue}
                          className="scale-75 origin-left"
                        />
                        <Label htmlFor="chart-tooltip-show-y" className="cursor-pointer text-xs text-muted-foreground">
                          Show Y value in tooltip
                        </Label>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className={`text-xs font-semibold ${dark ? "text-slate-200" : "text-muted-foreground"}`}>
                        Add to tooltip
                      </p>
                      <Select
                        key={`tooltip-extra-pick-${tooltipExtraColumns.join("||")}`}
                        onValueChange={(v) => {
                          if (!v) return;
                          setTooltipExtraColumns((prev) => (prev.includes(v) ? prev : [...prev, v]));
                        }}
                        disabled={xOptions.filter((k) => !tooltipExtraColumns.includes(k)).length === 0}
                      >
                        <SelectTrigger className="h-8 min-w-0 text-xs">
                          <SelectValue placeholder="+ Add column to tooltip (not plotted)" />
                        </SelectTrigger>
                        <SelectContent className="z-[200] text-xs">
                          {xOptions
                            .filter((k) => !tooltipExtraColumns.includes(k))
                            .map((k) => (
                              <SelectItem key={k} value={k} className="text-xs">
                                {formatColumnLabel(k)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {tooltipExtraColumns.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {tooltipExtraColumns.map((col) => (
                            <Badge key={col} variant="secondary" className="gap-1 pr-0.5 text-[10px] font-normal">
                              {formatColumnLabel(col)}
                              <button
                                type="button"
                                className="inline-flex h-4 w-4 items-center justify-center rounded-sm hover:bg-muted-foreground/20"
                                aria-label={`Remove ${formatColumnLabel(col)} from tooltip`}
                                onClick={() => setTooltipExtraColumns((prev) => prev.filter((c) => c !== col))}
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              {!demo && effectiveData?.length > 0 && xOptions?.length > 0 && (selY || []).length > 0 && (
                <div className="min-w-0 space-y-3 py-2">
                  <div className="space-y-1">
                    <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"}`}>Filter by line</p>
                    <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"}`}>
                      Filter chart series only. Sheet data is unchanged.
                    </p>
                  </div>
                  {normalizedChartLineFilters.length > 0 ? (
                    <div className="space-y-2">
                      {normalizedChartLineFilters.map((rule, idx) => {
                        const operatorNeedsValue = !["is_empty", "is_not_empty"].includes(rule.operator);
                        const dateFilterColumn = isDateLikeFilterColumn(rule.column);
                        const selectedDateRange = normalizeDateRangeValue(rule.value);
                        const dateColumnStats = dateFilterColumn ? getDateFilterColumnStats(rule.column) : null;
                        const effectiveOperator = filterOperatorOptions.some((opt) => opt.value === rule.operator) ? rule.operator : "=";
                        const scalarRuleValue = rule.value && typeof rule.value === "object" ? "" : (rule.value ?? "");
                        return (
                          <div key={rule.id} className="space-y-1.5 rounded-lg border border-border/70 p-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Filter {idx + 1}
                              </span>
                              <button
                                type="button"
                                className="inline-flex h-2 w-2 items-center justify-center rounded-full bg-red-500 hover:bg-red-600"
                                aria-label={`Remove filter ${idx + 1}`}
                                onClick={() => removeChartLineFilter(rule.id)}
                              >
                              </button>
                            </div>
                            <Select value={resolveRuleSeriesValue(rule.seriesKey)} onValueChange={(v) => updateChartLineFilter(rule.id, { seriesKey: v })}>
                              <SelectTrigger className="h-8 min-w-0 text-xs">
                                <SelectValue placeholder="Apply to line" />
                              </SelectTrigger>
                              <SelectContent className="text-xs">
                                {chartLineOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={rule.column || ""}
                              onValueChange={(v) =>
                                updateChartLineFilter(rule.id, {
                                  column: v,
                                  ...(isDateLikeFilterColumn(v)
                                    ? { operator: "date_range", value: { from: undefined, to: undefined } }
                                    : { operator: "=", value: "" }),
                                })
                              }
                            >
                              <SelectTrigger className="h-8 min-w-0 text-xs">
                                <SelectValue placeholder="Column" />
                              </SelectTrigger>
                              <SelectContent className="text-xs">
                                {xOptions.map((k) => (
                                  <SelectItem key={k} value={k} className="text-xs">
                                    {formatColumnLabel(k)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {dateFilterColumn ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-8 w-full justify-start px-3 text-left text-xs font-normal"
                                  >
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                                    <span className={selectedDateRange.from || selectedDateRange.to ? "truncate" : "truncate text-muted-foreground"}>
                                      {formatDateRangeLabel(selectedDateRange)}
                                    </span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="range"
                                    selected={selectedDateRange}
                                    onSelect={(range) =>
                                      updateChartLineFilter(rule.id, {
                                        operator: "date_range",
                                        value: {
                                          from: range?.from ? range.from.toISOString() : undefined,
                                          to: range?.to ? range.to.toISOString() : undefined,
                                        },
                                      })
                                    }
                                    numberOfMonths={1}
                                    defaultMonth={selectedDateRange.from || selectedDateRange.to || dateColumnStats?.min}
                                    fromDate={dateColumnStats?.min}
                                    toDate={dateColumnStats?.max}
                                    disabled={(date) =>
                                      (dateColumnStats?.min && date < dateColumnStats.min) ||
                                      (dateColumnStats?.max && date > dateColumnStats.max)
                                    }
                                  />
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-1.5">
                                <Select
                                  value={effectiveOperator}
                                  onValueChange={(v) => updateChartLineFilter(rule.id, { operator: v })}
                                >
                                  <SelectTrigger className="h-8 min-w-0 text-xs">
                                    <SelectValue placeholder="Operator" />
                                  </SelectTrigger>
                                  <SelectContent className="text-xs">
                                    {filterOperatorOptions.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  value={scalarRuleValue}
                                  onChange={(e) => updateChartLineFilter(rule.id, { value: e.target.value })}
                                  placeholder={operatorNeedsValue ? "Value" : "No value needed"}
                                  className="h-8 text-xs"
                                  disabled={!operatorNeedsValue}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                      No chart filters yet.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => addChartLineFilter()}
                    >
                      + Add filter
                    </Button>
                    {chartLineOptions.length > 1
                      ? chartLineOptions.map((opt, lineIdx) => (
                          <Button
                            key={opt.value}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-muted-foreground"
                            onClick={() => addChartLineFilter(opt.value)}
                          >
                            + Line {lineIdx + 1}
                          </Button>
                        ))
                      : null}
                  </div>
                </div>
              )}
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                    {selChartType === "area" && (
                      <Toggle area-label="Toggle Expand" pressed={expanded} onPressedChange={handleToggleChange}>
                        <Expand className={`h-4 w-4 font-bold ${dark ? "text-slate-200" : "text-muted-foreground"}`} />
                      </Toggle>
                    )}
                    <Toggle area-label="Toggle Legend" pressed={legendVisible} onPressedChange={handleToggleLegend}>
                      <IdCardIcon className="h-4 w-4 text-foreground" />
                    </Toggle>
                    {selChartType === "bar" && (
                      <>
                        <Toggle area-label="Toggle Horizontal" pressed={horizontal} onPressedChange={handleToggleHorizontal}>
                          <PiChartBarHorizontalLight className="h-4 w-4 text-foreground" />
                        </Toggle>
                        <Toggle area-label="Toggle Stack" pressed={stackedBar} onPressedChange={handleToggleStack}>
                          <MdStackedBarChart className="h-4 w-4 text-foreground" />
                        </Toggle>
                      </>
                    )}
                    {selChartType === "line" && (
                      <Toggle area-label="Toggle Dots" pressed={dots} onPressedChange={handleToggleDots}>
                        <GoDotFill className="h-4 w-4 text-foreground" />
                      </Toggle>
                    )}
                    {(selChartType === "line" || selChartType === "pie") && (
                      <Toggle area-label="Toggle data labels" pressed={labelLine} onPressedChange={handleToggleLabelLine}>
                        <Tag className="h-4 w-4 text-foreground" />
                      </Toggle>
                    )}
                    {selChartType === "pie" && (
                      <Toggle area-label="Toggle donut" pressed={donut} onPressedChange={handleToggleDonut}>
                        <PiChartDonut className="h-4 w-4 text-foreground" />
                      </Toggle>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
        </>
    </div>
  );
}

