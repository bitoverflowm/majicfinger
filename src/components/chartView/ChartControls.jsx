"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CaretRightIcon, IdCardIcon } from "@radix-ui/react-icons";
import { MinusCircle } from "react-feather";
import { IoPieChartOutline, IoStatsChart } from "react-icons/io5";
import { PiChartBarHorizontalLight, PiChartDonut, PiChartLine, PiChartLineThin } from "react-icons/pi";
import { MdOutlineAreaChart, MdStackedBarChart } from "react-icons/md";
import { GoDotFill } from "react-icons/go";
import { AiOutlineRadarChart } from "react-icons/ai";
import { CircleDot, CircleHelp, Expand, LogIn, Tag, LayoutGrid, Grid2X2, Settings2, Shuffle, ChevronUp, ChevronDown, Calendar as CalendarIcon, CandlestickChart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useChartBuilder, CHART_X_AXIS_NONE, CHART_X_AXIS_IDENTITY_LINE, isChartXAxisIdentityLine } from "@/components/chartView";
import { cn } from "@/lib/utils";
import { normalizeChartEmbedSlug } from "@/lib/chartEmbedSlug";
import { REFERENCE_EQUATION_PRESETS, validateReferenceEquation } from "@/lib/chartReferenceEquation";
import { ChartColorPalettePopover } from "@/components/chartView/ChartColorPalettePopover";
import { pivotBarChartBySeries } from "@/components/chartView/pivotBarChartData";
import { DEFAULT_CHART_SERIES_COLORS, isShadcnChartGreyBase } from "@/components/chartView/panels/shadcnChartPalettes";
import { defaultChartSeriesLabel } from "@/lib/chartLineLabels";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { temporalToMs } from "@/lib/temporalParse";

/** e.g. sheet-2 + "Markets" → "Sheet 2: Markets" */
function sheetGroupHeading(sheetId, sheetName, index = 0) {
  const digits = String(sheetId || "").match(/(\d+)/);
  const num = digits ? Number(digits[1]) : index + 1;
  const name = sheetName || sheetId || `Sheet ${num}`;
  return `Sheet ${num}: ${name}`;
}

const AXIS_SCALE_OPTIONS = [
  { value: "linear", label: "Linear" },
  { value: "log", label: "Logarithmic" },
  { value: "categorical", label: "Categorical" },
];

/**
 * Gear menu for per-axis settings (Scale submenu = exclusive linear / log / categorical).
 */
function AxisScaleSettingsMenu({ value, onValueChange, ariaLabel = "Axis settings" }) {
  const scale = AXIS_SCALE_OPTIONS.some((o) => o.value === value) ? value : "linear";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-md"
          aria-label={ariaLabel}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 text-xs">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Axis
          </DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs">Scale</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="text-xs">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Scale
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {AXIS_SCALE_OPTIONS.map((opt) => (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  className="text-xs"
                  checked={scale === opt.value}
                  onCheckedChange={(checked) => {
                    if (checked) onValueChange?.(opt.value);
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AxisFieldLabel({ children, scaleValue, onScaleChange, scaleAriaLabel }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <FieldLabel className="text-xs">{children}</FieldLabel>
      <AxisScaleSettingsMenu
        value={scaleValue}
        onValueChange={onScaleChange}
        ariaLabel={scaleAriaLabel}
      />
    </div>
  );
}

function filterSheetColumnGroups(groups, { allowedValues, excludeValues } = {}) {
  const allow = allowedValues != null ? new Set(allowedValues) : null;
  const exclude = excludeValues?.length ? new Set(excludeValues) : null;
  return (groups || [])
    .map((group, index) => ({
      ...group,
      heading: sheetGroupHeading(group.sheetId, group.sheetName, index),
      options: (group.options || []).filter((opt) => {
        if (allow && !allow.has(opt.value)) return false;
        if (exclude && exclude.has(opt.value)) return false;
        return true;
      }),
    }))
    .filter((group) => group.options.length > 0);
}

/** Column picks grouped under Sheet N: name (shared by all chart axis dropdowns). */
function GroupedColumnSelectItems({
  groups,
  allowedValues,
  excludeValues,
  itemClassName = "text-xs",
}) {
  const filtered = filterSheetColumnGroups(groups, { allowedValues, excludeValues });
  return filtered.map((group, groupIdx) => (
    <SelectGroup key={group.sheetId || `group-${groupIdx}`}>
      {groupIdx > 0 ? <SelectSeparator /> : null}
      <SelectLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {group.heading}
      </SelectLabel>
      {group.options.map((opt) => (
        <SelectItem key={opt.value} value={opt.value} className={itemClassName}>
          {opt.column}
        </SelectItem>
      ))}
    </SelectGroup>
  ));
}

function TimeseriesXAxisFormatSection({
  dark,
  canUseTimeSeriesX,
  xTimeScale,
  setXTimeScale,
  lineHumanReadableTime,
  setLineHumanReadableTime,
  xDateFormatPreset,
  setXDateFormatPreset,
  X_DATE_FORMAT_PRESETS,
  showDaySeparationBlocks,
  setShowDaySeparationBlocks,
}) {
  const isTimeHm = String(xDateFormatPreset || "") === "time_hm";
  return (
    <FieldGroup className="gap-4">
      <Field orientation="horizontal" className="items-center gap-2">
        <Switch
          id="chart-line-time-series-x-axis"
          checked={canUseTimeSeriesX && xTimeScale}
          onCheckedChange={(checked) => setXTimeScale(canUseTimeSeriesX ? checked : false)}
          className="h-4 w-7 shrink-0 [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-3"
          disabled={!canUseTimeSeriesX}
        />
        <FieldContent className="gap-0.5">
          <FieldLabel
            htmlFor="chart-line-time-series-x-axis"
            className={`cursor-pointer text-xs font-normal ${!canUseTimeSeriesX ? "opacity-60" : ""}`}
          >
            <span className="inline-flex items-center gap-1.5">
              Set x-axis to timeseries format
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
            </span>
          </FieldLabel>
        </FieldContent>
      </Field>
      <Field orientation="horizontal" className="items-center gap-2">
        <Switch
          id="chart-line-human-readable-time"
          checked={canUseTimeSeriesX && lineHumanReadableTime}
          onCheckedChange={(checked) => setLineHumanReadableTime(canUseTimeSeriesX ? checked : false)}
          className="h-4 w-7 shrink-0 [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-3"
          disabled={!canUseTimeSeriesX}
        />
        <FieldContent className="gap-0.5">
          <FieldLabel
            htmlFor="chart-line-human-readable-time"
            className={`cursor-pointer text-xs font-normal ${!canUseTimeSeriesX ? "opacity-60" : ""}`}
          >
            <span className="inline-flex items-center gap-1.5">
              Human readable time
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
            </span>
          </FieldLabel>
        </FieldContent>
      </Field>

      {canUseTimeSeriesX ? (
        <Field>
          <FieldLabel className="text-xs">Date label format (display only)</FieldLabel>
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
          {isTimeHm ? (
            <Field orientation="horizontal" className="items-start gap-2 pt-1">
              <Switch
                id="chart-line-day-separation-blocks"
                checked={!!showDaySeparationBlocks}
                onCheckedChange={(checked) => setShowDaySeparationBlocks?.(!!checked)}
                className="mt-0.5 h-4 w-7 shrink-0 [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-3"
              />
              <FieldContent className="gap-1">
                <FieldLabel
                  htmlFor="chart-line-day-separation-blocks"
                  className="cursor-pointer text-xs font-normal"
                >
                  Show day separation markers
                </FieldLabel>
                <FieldDescription className="text-xs">
                  Draw a marker where each new day starts, labeled as DD-MMM (e.g. 08-Aug).
                </FieldDescription>
              </FieldContent>
            </Field>
          ) : null}
        </Field>
      ) : null}
    </FieldGroup>
  );
}

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

    chartName,
    setChartName,

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
    heatmapChangeCol,
    setHeatmapChangeCol,
    heatmapCapMode,
    setHeatmapCapMode,
    heatmapCap,
    setHeatmapCap,
    heatmapUpColor,
    setHeatmapUpColor,
    heatmapDownColor,
    setHeatmapDownColor,
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
    candlestickOhlcSetId,
    setCandlestickOhlcSetId,
    candlestickSheetId,
    setCandlestickSheetId,
    candlestickSheetOptions,
    candlestickMapped,

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
    dataTypes,
    chartData,
    getAxisType,
    lineIsTemporalX,

    selectedPalette,
    selectedShadBaseId,
    lineColorOverrides,
    setLineColorOverrides,
    lineLabelOverrides,
    setLineLabelOverrides,

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
    showDaySeparationBlocks,
    setShowDaySeparationBlocks,
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
    legendTitle,
    setLegendTitle,
    horizontal,
    handleToggleHorizontal,
    stackedBar,
    handleToggleStack,
    barSeriesColumn,
    setBarSeriesColumn,
    barXAxisMode,
    setBarXAxisMode,
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
    innerBoxColor,
    setInnerBoxColor,
    xAxisLabelHidden,
    setXAxisLabelHidden,
    xAxisLabel,
    setXAxisLabel,
    xAxisLabelColor,
    setXAxisLabelColor,
    yAxisLabelHidden,
    setYAxisLabelHidden,
    yAxisLabel,
    setYAxisLabel,
    yAxisLabelColor,
    setYAxisLabelColor,
    gridVisible,
    setGridVisible,
    enableZoom,
    setEnableZoom,
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
      : selChartType === "candlestick"
        ? "Candlestick"
        : selChartType === "treemap"
          ? "Treemap"
          : selChartType === "heatmap"
            ? "Heatmap"
            : selChartType
              ? selChartType.charAt(0).toUpperCase() + selChartType.slice(1)
              : "—";

  /** Selected chart type uses the same color users see on hover (works for light/dark). */
  const chartTypeSelectedClass = "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50";
  /** Applied on each item (Tooltip sets data-state=closed, so parent [data-state=off] selectors miss). */
  const chartTypeItemClass =
    "text-slate-700 dark:text-slate-300 [&_svg]:fill-current [&_svg]:text-current";
  /** Lucide stroke icons (e.g. CandlestickChart) must not inherit fill-current or they look clipped. */
  const chartTypeStrokeIconClass =
    "text-slate-700 dark:text-slate-300 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:text-current";
  const chartTypeItemClassName = (type) =>
    cn(
      type === "candlestick" ? chartTypeStrokeIconClass : chartTypeItemClass,
      selChartType === type && chartTypeSelectedClass,
    );
  const chartTypeIconClass = "h-4 w-4 shrink-0 text-current";

  // Only one section open at a time; default to Chart Meta.
  const [openSection, setOpenSection] = useState("chartMeta");
  const chartSlugPreview = useMemo(
    () => normalizeChartEmbedSlug((chartName || "").trim() || "chart") || "chart",
    [chartName],
  );
  const [lineAddValue, setLineAddValue] = useState("");
  const [linesOpen, setLinesOpen] = useState(true);
  const [lineAdvancedOpen, setLineAdvancedOpen] = useState(false);
  const [referenceMenuOpen, setReferenceMenuOpen] = useState(false);
  const [yAxisFormatOpen, setYAxisFormatOpen] = useState(true);
  const xAxisSelectValue = selX ?? CHART_X_AXIS_NONE;
  const handleXAxisChange = (v) => setSelX(v === CHART_X_AXIS_NONE ? undefined : v);
  const canUseTimeSeriesX = !!selX && !!lineIsTemporalX;
  const barXAxisType = selX ? getAxisType(selX, dataTypes, chartData) : "string";
  const barXAxisIsDate =
    selChartType === "bar" &&
    !!selX &&
    (barXAxisType === "date" || lineIsTemporalX);
  const barXAxisIsNumeric = selChartType === "bar" && !!selX && barXAxisType === "number";
  const barXAxisSpacingConfigurable = barXAxisIsDate || barXAxisIsNumeric;

  const barBreakdownSeriesKeys = useMemo(() => {
    if (selChartType !== "bar" || !barSeriesColumn || !selX || !selY?.[0]) return [];
    const pivot = pivotBarChartBySeries(chartData || [], selX, selY[0], barSeriesColumn);
    return pivot?.seriesKeys || [];
  }, [selChartType, barSeriesColumn, selX, selY, chartData]);

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
  const hasIdentityLine = (selY || []).some((lineColumn) => isChartXAxisIdentityLine(lineColumn));
  const canAddLine = Boolean(selX && !hasIdentityLine) || groupedLineOptions.some((group) => group.options.length > 0);
  const lineNonNumericColumns = (selY || []).filter((col) => {
    if (!col || isChartXAxisIdentityLine(col) || !Array.isArray(chartData) || !chartData.length) return false;
    for (let i = 0; i < chartData.length; i += 1) {
      const v = chartData[i]?.[col];
      if (v == null || v === "") continue;
      const n = Number(v);
      return !Number.isFinite(n);
    }
    return false;
  });
  const hasSelectedPalette = Array.isArray(selectedPalette) && selectedPalette.length > 0;
  const usePaletteForSeries =
    hasSelectedPalette && !isShadcnChartGreyBase(selectedShadBaseId);
  const fallbackSeriesColor = DEFAULT_CHART_SERIES_COLORS[0];
  const defaultSeriesColorAt = (idx) => {
    const i = Math.max(0, Number(idx) || 0);
    if (!usePaletteForSeries) {
      const n = DEFAULT_CHART_SERIES_COLORS.length;
      return DEFAULT_CHART_SERIES_COLORS[i % n] || fallbackSeriesColor;
    }
    const p = selectedPalette;
    const n = p?.length || 0;
    if (!n) return fallbackSeriesColor;
    const chromeSlots = 3;
    if (n <= chromeSlots) {
      return p[Math.max(0, n - 1 - (i % Math.max(1, n)))] ?? fallbackSeriesColor;
    }
    const fromEnd = n - 1 - i;
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
  const setSeriesLabelOverride = (index, legacyKey, label) => {
    const key = seriesInstanceKey(index);
    const trimmed = String(label ?? "").trim();
    setLineLabelOverrides?.((prev) => {
      const next = { ...(prev || {}) };
      if (!trimmed) {
        delete next[key];
        if (legacyKey) delete next[legacyKey];
      } else {
        next[key] = trimmed;
      }
      return next;
    });
  };
  const getSeriesLabelOverride = (seriesColumn, index) =>
    lineLabelOverrides?.[seriesInstanceKey(index)] ?? lineLabelOverrides?.[seriesColumn] ?? "";
  const renderSeriesLabelInputs = (columns) =>
    (columns || []).length > 0 ? (
      <div className="space-y-2 border-t pt-2">
        {(columns || []).map((seriesColumn, index) => {
          const placeholder = defaultChartSeriesLabel(seriesColumn, index);
          const inputId = `chart-line-label-${index}`;
          return (
            <div key={`line-label-${index}-${seriesColumn}`} className="flex min-w-0 items-center gap-2">
              <Label htmlFor={inputId} className="w-12 shrink-0 text-[10px] text-muted-foreground">
                Line {index + 1}
              </Label>
              <Input
                id={inputId}
                type="text"
                value={getSeriesLabelOverride(seriesColumn, index)}
                placeholder={placeholder}
                className="h-7 min-w-0 flex-1 text-xs"
                onChange={(e) => setSeriesLabelOverride(index, seriesColumn, e.target.value)}
                aria-label={`Display name for line ${index + 1}`}
              />
            </div>
          );
        })}
      </div>
    ) : null;
  const setBreakdownSeriesColorOverride = (seriesKey, index, color) => {
    const key = seriesInstanceKey(index);
    setLineColorOverrides((prev) => ({
      ...(prev || {}),
      [key]: color,
      ...(seriesKey ? { [seriesKey]: color } : {}),
    }));
  };
  const clearBreakdownSeriesColorOverride = (seriesKey, index) => {
    const key = seriesInstanceKey(index);
    setLineColorOverrides((prev) => {
      const next = { ...(prev || {}) };
      delete next[key];
      if (seriesKey) delete next[seriesKey];
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
  const normalizedReferenceLines = Array.isArray(referenceLines) ? referenceLines : [];
  const addReferenceLine = (kind = "y", defaults = {}) => {
    const id = `reference-line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const base = {
      id,
      enabled: true,
      kind,
      y: "",
      x: "",
      x1: "",
      y1: "",
      x2: "",
      y2: "",
      equation: "",
      label: "",
      color: "#ef4444",
      style: "dashed",
      strokeWidth: 1,
    };
    if (kind === "equation") {
      const equation = String(defaults.equation || "y = x");
      setReferenceLines((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        {
          ...base,
          kind: "equation",
          equation,
          label: defaults.label != null ? String(defaults.label) : equation,
          color: defaults.color || "#64748b",
        },
      ]);
      return;
    }
    setReferenceLines((prev) => [
      ...(Array.isArray(prev) ? prev : []),
      { ...base, kind, ...defaults },
    ]);
  };
  const updateReferenceLine = (id, patch) => {
    setReferenceLines((prev) =>
      (Array.isArray(prev) ? prev : []).map((line) => (line.id === id ? { ...line, ...patch } : line))
    );
  };
  const removeReferenceLine = (id) => {
    setReferenceLines((prev) => (Array.isArray(prev) ? prev : []).filter((line) => line.id !== id));
  };

  const showYAxisFormat =
    selY?.[0] && chartData?.length && getAxisType(selY[0], dataTypes, chartData) === "number";
  const showNormalizeControl =
    (selChartType === "line" || selChartType === "area" || selChartType === "bar") &&
    Array.isArray(selY) &&
    selY.length > 0;
  const normalizeValuesControl = showNormalizeControl ? (
    <Field orientation="horizontal" className="items-center gap-2 border-t border-border/60 pt-4">
      <Switch
        id="chart-data-normalize"
        checked={normalizeMode === "basic" || normalizeMode === "min-max"}
        onCheckedChange={(on) => setNormalizeMode(on ? "basic" : null)}
        className="h-4 w-7 shrink-0 [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-3"
      />
      {normalizeMode === "basic" || normalizeMode === "min-max" ? (
        <Select
          value={normalizeMode}
          onValueChange={(v) => {
            if (v === "basic" || v === "min-max") setNormalizeMode(v);
          }}
        >
          <SelectTrigger
            id="chart-data-normalize"
            className="h-8 min-w-0 flex-1 text-xs"
            aria-label="Normalize mode"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="basic" className="text-xs">
              Basic
            </SelectItem>
            <SelectItem value="min-max" className="text-xs">
              Min-max
            </SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <FieldLabel htmlFor="chart-data-normalize" className="cursor-pointer text-xs font-normal">
          Normalize
        </FieldLabel>
      )}
    </Field>
  ) : null;
  const yAxisFormatControls = showYAxisFormat ? (
    <Collapsible open={yAxisFormatOpen} onOpenChange={setYAxisFormatOpen} className="border-t border-border/60 pt-4">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full min-w-0 items-center justify-between gap-2 rounded-md text-left"
        >
          <FieldTitle className="text-xs">y-axis</FieldTitle>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${yAxisFormatOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel className="text-xs text-muted-foreground">Divisor</FieldLabel>
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
          </Field>
          <Field>
            <FieldLabel className="text-xs text-muted-foreground">Labels</FieldLabel>
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
          </Field>
        </div>
      </CollapsibleContent>
    </Collapsible>
  ) : null;
  const lineSeriesControls = selChartType === "line" ? (
    <Collapsible open={linesOpen} onOpenChange={setLinesOpen} className="border-t border-border/60 pt-4">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full min-w-0 items-center justify-between gap-2 rounded-md text-left"
        >
          <FieldTitle className="text-xs">Lines</FieldTitle>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${linesOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-3">
        <div className="flex flex-wrap gap-2">
          {(selY || []).map((lineColumn, index) => (
            <div key={`${lineColumn}-${index}`} className="inline-flex items-center gap-1">
              <Badge variant="secondary" className="min-w-0 max-w-[13rem] gap-1 px-2 py-1 text-[10px] font-normal leading-none">
                <span className="min-w-0 truncate whitespace-nowrap">
                  {(() => {
                    if (isChartXAxisIdentityLine(lineColumn)) {
                      return `Line ${index + 1}: X-axis (y = x)`;
                    }
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

        {renderSeriesLabelInputs(selY)}

        <Field>
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
              disabled={!canAddLine}
            >
              <SelectValue placeholder="+ Add Line" className="text-xs" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              {selX && !hasIdentityLine ? (
                <SelectItem value={CHART_X_AXIS_IDENTITY_LINE} className="text-xs">
                  X-axis (y = x)
                </SelectItem>
              ) : null}
              {selX && !hasIdentityLine && groupedLineOptions.length > 0 ? <SelectSeparator /> : null}
              {groupedLineOptions.map((group, groupIdx) => (
                <SelectGroup key={group.sheetId}>
                  {groupIdx > 0 ? <SelectSeparator /> : null}
                  <SelectLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {sheetGroupHeading(group.sheetId, group.sheetName, groupIdx)}
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

          {!canAddLine && !selX && (
            <FieldDescription className="text-xs">
              Choose an X-axis column first
            </FieldDescription>
          )}
          {!canAddLine && selX && (
            <FieldDescription className="text-xs">
              No more lines to add
            </FieldDescription>
          )}
        </Field>
        {lineNonNumericColumns.length > 0 && (
          <p className="text-xs text-destructive">
            non-numericl vlaue detected this does not work for line cahrt
          </p>
        )}
        <Collapsible open={lineAdvancedOpen} onOpenChange={setLineAdvancedOpen} className="border-t pt-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-md py-1 text-left text-xs font-bold ${
                dark ? "text-slate-200 hover:text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Advanced</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${lineAdvancedOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">Reference lines</p>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  Add horizontal, vertical, segment, or equation curves (y = x, y = x², …).
                </p>
              </div>
              <Popover open={referenceMenuOpen} onOpenChange={setReferenceMenuOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 px-2 text-xs">
                    + Reference
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <div className="space-y-1">
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Equation curves
                    </p>
                    {REFERENCE_EQUATION_PRESETS.map((preset) => (
                      <Button
                        key={preset.equation}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full justify-start font-mono text-xs"
                        onClick={() => {
                          addReferenceLine("equation", preset);
                          setReferenceMenuOpen(false);
                        }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                    <div className="my-1 border-t border-border/70" />
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Guides
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full justify-start text-xs"
                      onClick={() => {
                        addReferenceLine("y");
                        setReferenceMenuOpen(false);
                      }}
                    >
                      Horizontal (y = …)
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full justify-start text-xs"
                      onClick={() => {
                        addReferenceLine("x");
                        setReferenceMenuOpen(false);
                      }}
                    >
                      Vertical (x = …)
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full justify-start text-xs"
                      onClick={() => {
                        addReferenceLine("segment");
                        setReferenceMenuOpen(false);
                      }}
                    >
                      Segment (two points)
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full justify-start text-xs"
                      onClick={() => {
                        addReferenceLine("equation", { equation: "y = x", label: "Custom equation" });
                        setReferenceMenuOpen(false);
                      }}
                    >
                      Custom equation…
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {normalizedReferenceLines.length > 0 ? (
              <div className="space-y-2">
                {normalizedReferenceLines.map((line, refIdx) => {
                  const kind = ["x", "y", "segment", "equation"].includes(line.kind) ? line.kind : "y";
                  const equationValidation =
                    kind === "equation" && line.equation
                      ? validateReferenceEquation(line.equation)
                      : { ok: true };
                  return (
                    <div key={line.id || refIdx} className="space-y-2 rounded-lg border border-border/70 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Reference {refIdx + 1}
                        </span>
                        <button
                          type="button"
                          className="inline-flex h-2 w-2 items-center justify-center rounded-full bg-red-500 hover:bg-red-600"
                          aria-label={`Remove reference line ${refIdx + 1}`}
                          onClick={() => removeReferenceLine(line.id)}
                        />
                      </div>
                      <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-1.5">
                        <Select value={kind} onValueChange={(v) => updateReferenceLine(line.id, { kind: v })}>
                          <SelectTrigger className="h-8 min-w-0 text-xs">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="equation" className="text-xs">Equation (y = …)</SelectItem>
                            <SelectItem value="y" className="text-xs">Horizontal y</SelectItem>
                            <SelectItem value="x" className="text-xs">Vertical x</SelectItem>
                            <SelectItem value="segment" className="text-xs">Segment</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={line.label ?? ""}
                          onChange={(e) => updateReferenceLine(line.id, { label: e.target.value })}
                          placeholder="Label"
                          className="h-8 text-xs"
                        />
                      </div>
                      {kind === "equation" ? (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Equation</Label>
                            <Input
                              value={line.equation ?? ""}
                              onChange={(e) =>
                                updateReferenceLine(line.id, {
                                  equation: e.target.value,
                                  label: line.label || e.target.value,
                                })
                              }
                              placeholder="y = x^2"
                              className="h-8 font-mono text-xs"
                              spellCheck={false}
                            />
                            {!equationValidation.ok ? (
                              <p className="text-[10px] text-destructive">{equationValidation.error}</p>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">
                                Use x as the horizontal axis variable. Supports +, −, ×, ÷, ^, sqrt(), abs().
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {REFERENCE_EQUATION_PRESETS.map((preset) => (
                              <Button
                                key={`${line.id}-${preset.equation}`}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 font-mono text-[10px]"
                                onClick={() =>
                                  updateReferenceLine(line.id, {
                                    equation: preset.equation,
                                    label: preset.label,
                                  })
                                }
                              >
                                {preset.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : kind === "segment" ? (
                        <div className="grid grid-cols-2 gap-1.5">
                          <Input value={line.x1 ?? ""} onChange={(e) => updateReferenceLine(line.id, { x1: e.target.value })} placeholder="x1" className="h-8 text-xs" />
                          <Input value={line.y1 ?? ""} onChange={(e) => updateReferenceLine(line.id, { y1: e.target.value })} placeholder="y1" className="h-8 text-xs" />
                          <Input value={line.x2 ?? ""} onChange={(e) => updateReferenceLine(line.id, { x2: e.target.value })} placeholder="x2" className="h-8 text-xs" />
                          <Input value={line.y2 ?? ""} onChange={(e) => updateReferenceLine(line.id, { y2: e.target.value })} placeholder="y2" className="h-8 text-xs" />
                        </div>
                      ) : (
                        <Input
                          value={kind === "x" ? (line.x ?? "") : (line.y ?? "")}
                          onChange={(e) => updateReferenceLine(line.id, kind === "x" ? { x: e.target.value } : { y: e.target.value })}
                          placeholder={kind === "x" ? "X value" : "Y value"}
                          className="h-8 text-xs"
                        />
                      )}
                      <div className="grid grid-cols-[2.2rem_minmax(0,1fr)_minmax(0,0.8fr)] gap-1.5">
                        <Input
                          type="color"
                          value={line.color || "#ef4444"}
                          onChange={(e) => updateReferenceLine(line.id, { color: e.target.value })}
                          aria-label={`Reference line ${refIdx + 1} color`}
                          className="h-8 w-9 p-1"
                        />
                        <Select value={line.style || "dashed"} onValueChange={(v) => updateReferenceLine(line.id, { style: v })}>
                          <SelectTrigger className="h-8 min-w-0 text-xs">
                            <SelectValue placeholder="Style" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="solid" className="text-xs">Solid</SelectItem>
                            <SelectItem value="dashed" className="text-xs">Dashed</SelectItem>
                            <SelectItem value="dotted" className="text-xs">Dotted</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="1"
                          max="8"
                          value={String(line.strokeWidth || 1)}
                          onChange={(e) => updateReferenceLine(line.id, { strokeWidth: Math.max(1, Math.min(8, Number(e.target.value) || 1)) })}
                          placeholder="Width"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                No reference lines yet.
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
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
              <AccordionItem value="chartMeta">
                <AccordionTrigger className="py-2 text-xs font-bold text-muted-foreground hover:no-underline">
                  Chart Meta
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="chart-meta-name" className="text-xs text-muted-foreground">
                      Name your chart
                    </Label>
                    <Input
                      id="chart-meta-name"
                      value={chartName}
                      onChange={(e) => setChartName(e.target.value)}
                      placeholder="my-chart"
                      className="h-8 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Used for export, publish, and URL slug:{" "}
                      <span className="font-mono text-foreground/80">{chartSlugPreview}</span>
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

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
                          if (!value) return;
                          setSelChartType(value);
                          setOpenSection("data");
                        }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="area"
                              aria-label="Area chart"
                              className={chartTypeItemClassName("area")}
                            >
                              <MdOutlineAreaChart className={chartTypeIconClass} />
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
                              className={chartTypeItemClassName("bar")}
                            >
                              <IoStatsChart className={chartTypeIconClass} />
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
                              className={chartTypeItemClassName("line")}
                            >
                              <PiChartLine className={chartTypeIconClass} />
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
                              className={chartTypeItemClassName("pie")}
                            >
                              <IoPieChartOutline className={chartTypeIconClass} />
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
                              className={chartTypeItemClassName("radar")}
                            >
                              <AiOutlineRadarChart className={chartTypeIconClass} />
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
                              className={chartTypeItemClassName("treemap")}
                            >
                              <LayoutGrid className={chartTypeIconClass} />
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
                              value="heatmap"
                              aria-label="Heatmap"
                              className={chartTypeItemClassName("heatmap")}
                            >
                              <Grid2X2 className={chartTypeIconClass} />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                            Heatmap — market-style squarified map. Label sets tiles, weight sets area, change sets
                            color intensity (diverging up/down).
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="scatter"
                              aria-label="Scatter / bubble chart"
                              className={chartTypeItemClassName("scatter")}
                            >
                              <CircleDot className={chartTypeIconClass} />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            Scatter / bubble — points from X and Y; optional Z column for bubble size.
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="candlestick"
                              aria-label="Candlestick chart"
                              className={chartTypeItemClassName("candlestick")}
                            >
                              <CandlestickChart className={cn(chartTypeIconClass, "fill-none")} />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                            Candlestick — TradingView Lightweight Charts. Requires Kalshi-style rows with
                            end_period_ts and a full OHLC set (trade price, YES bid, or YES ask).
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="liveline"
                              aria-label="Liveline chart"
                              className={chartTypeItemClassName("liveline")}
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
                <AccordionContent className="pt-1">
                  <FieldGroup className="gap-5">
                  {selChartType === "candlestick" ? (
                    <>
                      <FieldDescription className="text-xs">
                        Candlesticks auto-map from Kalshi-style columns:{" "}
                        <span className="font-mono text-[10px]">end_period_ts</span> plus a full OHLC
                        quartet. Bars missing any open/high/low/close value are skipped.
                      </FieldDescription>

                      <Field>
                        <FieldLabel className="text-xs">Data sheet</FieldLabel>
                        <Select
                          value={candlestickSheetId || "__active__"}
                          onValueChange={(v) =>
                            setCandlestickSheetId(v === "__active__" ? "" : v)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Sheet" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="__active__" className="text-xs">
                              Active sheet
                            </SelectItem>
                            {(candlestickSheetOptions || []).map((sheet) => (
                              <SelectItem key={sheet.id} value={sheet.id} className="text-xs">
                                {sheet.name || sheet.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      {candlestickMapped?.available?.length ? (
                        <Field>
                          <FieldLabel className="text-xs">OHLC series</FieldLabel>
                          <Select
                            value={candlestickOhlcSetId || "auto"}
                            onValueChange={(v) => setCandlestickOhlcSetId(v || "auto")}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="OHLC set" />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                              <SelectItem value="auto" className="text-xs">
                                Auto (most valid bars)
                              </SelectItem>
                              {candlestickMapped.available.map((set) => (
                                <SelectItem key={set.id} value={set.id} className="text-xs">
                                  {set.label}
                                  {set.open ? ` · ${set.open.replace(/_dollars$/, "")}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {candlestickMapped.ok ? (
                            <FieldDescription className="text-xs">
                              Using {candlestickMapped.ohlc?.label || "OHLC"} ·{" "}
                              {candlestickMapped.data.length.toLocaleString()} bars
                              {candlestickMapped.skipped
                                ? ` · ${candlestickMapped.skipped.toLocaleString()} skipped`
                                : ""}
                            </FieldDescription>
                          ) : (
                            <FieldDescription className="text-xs text-amber-700 dark:text-amber-300">
                              Columns found, but no bars have all four OHLC values filled in.
                            </FieldDescription>
                          )}
                        </Field>
                      ) : (
                        <FieldDescription className="text-xs text-amber-700 dark:text-amber-300">
                          This sheet does not match the candlestick shape. Pull Get Market Candlesticks
                          (or provide end_period_ts + price_/yes_bid_/yes_ask_ OHLC columns).
                        </FieldDescription>
                      )}
                    </>
                  ) : selChartType === "line" ? (
                    <>
                      <Field>
                        <FieldLabel className="text-xs">Pivot (x-axis)</FieldLabel>
                        <Select value={xAxisSelectValue} onValueChange={handleXAxisChange}>
                          <SelectTrigger className="h-8 min-w-0 text-xs font-normal">
                            <SelectValue placeholder="X axis" className="text-xs font-normal" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value={CHART_X_AXIS_NONE} className="text-xs font-normal">
                              — Select X axis —
                            </SelectItem>
                            <GroupedColumnSelectItems
                              groups={lineSheetColumnGroups}
                              allowedValues={xOptions}
                              itemClassName="text-xs font-normal"
                            />
                          </SelectContent>
                        </Select>
                      </Field>
                      {selX ? (
                        <Field orientation="horizontal" className="items-center gap-2">
                          {(() => {
                            const xType = getAxisType(selX, dataTypes, chartData);
                            const isCategorical = xType === "string" && !lineIsTemporalX;
                            const ascendingLabel = isCategorical
                              ? "Sort alphabetical"
                              : lineIsTemporalX
                                ? "Sort chronological"
                                : "Sort ascending";
                            const descendingLabel = isCategorical
                              ? "Sort reverse-alphabetical"
                              : lineIsTemporalX
                                ? "Sort reverse chronological"
                                : "Sort descending";
                            const sortLabel = sortXDir === "desc" ? descendingLabel : ascendingLabel;
                            return (
                              <>
                                <Switch
                                  id="chart-line-sort-x-dir"
                                  checked={sortXDir === "desc"}
                                  onCheckedChange={(checked) => setSortXDir(checked ? "desc" : "asc")}
                                  className="h-4 w-7 shrink-0 [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-3"
                                />
                                <FieldLabel
                                  htmlFor="chart-line-sort-x-dir"
                                  className="cursor-pointer text-xs font-normal"
                                >
                                  {sortLabel}
                                </FieldLabel>
                              </>
                            );
                          })()}
                        </Field>
                      ) : null}
                      <TimeseriesXAxisFormatSection
                        dark={dark}
                        canUseTimeSeriesX={canUseTimeSeriesX}
                        xTimeScale={xTimeScale}
                        setXTimeScale={setXTimeScale}
                        lineHumanReadableTime={lineHumanReadableTime}
                        setLineHumanReadableTime={setLineHumanReadableTime}
                        xDateFormatPreset={xDateFormatPreset}
                        setXDateFormatPreset={setXDateFormatPreset}
                        X_DATE_FORMAT_PRESETS={X_DATE_FORMAT_PRESETS}
                        showDaySeparationBlocks={showDaySeparationBlocks}
                        setShowDaySeparationBlocks={setShowDaySeparationBlocks}
                      />

                      {yAxisFormatControls}
                      {normalizeValuesControl}
                      {lineSeriesControls}
                    </>
                  ) : (selChartType === "area") ? (
                    <>
                      <Field>
                        <FieldLabel className="text-xs">X axis</FieldLabel>
                        <Select value={xAxisSelectValue} onValueChange={handleXAxisChange}>
                          <SelectTrigger className="h-8 min-w-0 text-xs">
                            <SelectValue placeholder="X axis" className="text-xs" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value={CHART_X_AXIS_NONE} className="text-xs">
                              — Select X axis —
                            </SelectItem>
                            <GroupedColumnSelectItems
                              groups={lineSheetColumnGroups}
                              allowedValues={xOptions}
                            />
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel className="text-xs">Areas</FieldLabel>
                        {selY.length > 0 &&
                          selY.map((yValue, index) => (
                            <div
                              className="flex min-w-0 place-items-center gap-2"
                              key={`${yValue}-${index}`}
                            >
                              <Select value={yValue} onValueChange={(val) => handleSelectY(val, index)}>
                                <SelectTrigger className="h-8 min-w-0 flex-1 text-xs">
                                  <SelectValue className="text-xs">{formatColumnLabel(yValue)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent className="text-xs">
                                  <GroupedColumnSelectItems
                                    groups={lineSheetColumnGroups}
                                    allowedValues={availableYOptions}
                                  />
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
                        {renderSeriesLabelInputs(selY)}
                        {selY.length === 0 && (
                          <Select onValueChange={(val) => handleSelectY(val)}>
                            <SelectTrigger className="h-8 min-w-0 text-xs">
                              <SelectValue placeholder="Y column" className="text-xs" />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                              <GroupedColumnSelectItems
                                groups={lineSheetColumnGroups}
                                allowedValues={availableYOptions}
                              />
                            </SelectContent>
                          </Select>
                        )}
                      </Field>
                      <TimeseriesXAxisFormatSection
                        dark={dark}
                        canUseTimeSeriesX={canUseTimeSeriesX}
                        xTimeScale={xTimeScale}
                        setXTimeScale={setXTimeScale}
                        lineHumanReadableTime={lineHumanReadableTime}
                        setLineHumanReadableTime={setLineHumanReadableTime}
                        xDateFormatPreset={xDateFormatPreset}
                        setXDateFormatPreset={setXDateFormatPreset}
                        X_DATE_FORMAT_PRESETS={X_DATE_FORMAT_PRESETS}
                        showDaySeparationBlocks={showDaySeparationBlocks}
                        setShowDaySeparationBlocks={setShowDaySeparationBlocks}
                      />
                      {yAxisFormatControls}
                      {normalizeValuesControl}
                    </>
                  ) : selChartType === "heatmap" ? (
                    <>
                      <Field>
                        <FieldLabel className="text-xs">Label</FieldLabel>
                        <FieldDescription className="text-xs">
                          Category for each tile (e.g. question, slug, ticker).
                        </FieldDescription>
                        <Select value={xAxisSelectValue} onValueChange={handleXAxisChange}>
                          <SelectTrigger className="h-8 min-w-0 text-xs">
                            <SelectValue placeholder="Label column" className="text-xs" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value={CHART_X_AXIS_NONE} className="text-xs">
                              — Select label —
                            </SelectItem>
                            <GroupedColumnSelectItems
                              groups={lineSheetColumnGroups}
                              allowedValues={xOptions}
                            />
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel className="text-xs">Weight</FieldLabel>
                        <FieldDescription className="text-xs">
                          Numeric column that sets tile area (square size).
                        </FieldDescription>
                        {selY.length > 0 ? (
                          selY.slice(0, 1).map((yValue, index) => (
                            <Select
                              key={`${yValue}-${index}`}
                              value={yValue}
                              onValueChange={(val) => handleSelectY(val, index)}
                            >
                              <SelectTrigger className="h-8 min-w-0 text-xs">
                                <SelectValue className="text-xs">{formatColumnLabel(yValue)}</SelectValue>
                              </SelectTrigger>
                              <SelectContent className="text-xs">
                                <GroupedColumnSelectItems
                                  groups={lineSheetColumnGroups}
                                  allowedValues={availableYOptions}
                                />
                              </SelectContent>
                            </Select>
                          ))
                        ) : (
                          <Select onValueChange={(val) => handleSelectY(val)}>
                            <SelectTrigger className="h-8 min-w-0 text-xs">
                              <SelectValue placeholder="Weight column" className="text-xs" />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                              <GroupedColumnSelectItems
                                groups={lineSheetColumnGroups}
                                allowedValues={availableYOptions}
                              />
                            </SelectContent>
                          </Select>
                        )}
                      </Field>
                      <Field>
                        <FieldLabel className="text-xs">Change</FieldLabel>
                        <FieldDescription className="text-xs">
                          Numeric column for color intensity (positive = up, negative = down).
                        </FieldDescription>
                        <Select
                          value={heatmapChangeCol || CHART_X_AXIS_NONE}
                          onValueChange={(v) =>
                            setHeatmapChangeCol(v === CHART_X_AXIS_NONE ? null : v)
                          }
                        >
                          <SelectTrigger className="h-8 min-w-0 text-xs">
                            <SelectValue placeholder="Change column" className="text-xs" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value={CHART_X_AXIS_NONE} className="text-xs">
                              — Select change —
                            </SelectItem>
                            <GroupedColumnSelectItems
                              groups={lineSheetColumnGroups}
                              allowedValues={xOptions}
                            />
                          </SelectContent>
                        </Select>
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field>
                        <AxisFieldLabel
                          scaleValue={scaleX}
                          onScaleChange={setScaleX}
                          scaleAriaLabel="X axis settings"
                        >
                          X axis
                        </AxisFieldLabel>
                        <Select value={xAxisSelectValue} onValueChange={handleXAxisChange}>
                          <SelectTrigger className="h-8 min-w-0 text-xs">
                            <SelectValue placeholder="X axis" className="text-xs" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value={CHART_X_AXIS_NONE} className="text-xs">
                              — Select X axis —
                            </SelectItem>
                            <GroupedColumnSelectItems
                              groups={lineSheetColumnGroups}
                              allowedValues={xOptions}
                            />
                          </SelectContent>
                        </Select>
                      </Field>
                      {barXAxisSpacingConfigurable ? (
                        <Field>
                          <FieldLabel className="text-xs">X-axis spacing</FieldLabel>
                          <FieldDescription className="text-xs">
                            {barXAxisIsDate
                              ? "Date mode spaces bars by calendar time. Categorical mode places each date at equal intervals."
                              : "Numeric mode spaces bars by their X value. Categorical mode places each bar at equal intervals."}
                          </FieldDescription>
                          <ToggleGroup
                            type="single"
                            variant="outline"
                            size="sm"
                            className="flex w-full min-w-0 justify-stretch [&>button]:min-w-0 [&>button]:flex-1"
                            value={barXAxisMode}
                            onValueChange={(v) => {
                              if (v === "date" || v === "categorical") setBarXAxisMode(v);
                            }}
                            aria-label="Bar chart X-axis scaled or categorical spacing"
                          >
                            <ToggleGroupItem value="date" className="text-xs">
                              {barXAxisIsDate ? "Date" : "Numeric"}
                            </ToggleGroupItem>
                            <ToggleGroupItem value="categorical" className="text-xs">
                              Categorical
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </Field>
                      ) : null}
                      <Field>
                        <AxisFieldLabel
                          scaleValue={scaleY}
                          onScaleChange={setScaleY}
                          scaleAriaLabel="Y axis settings"
                        >
                          Y axis
                        </AxisFieldLabel>
                        {selY.length > 0 &&
                          selY.map((yValue, index) => (
                            <div className="flex min-w-0 place-items-center gap-2" key={index}>
                              <Select value={yValue} onValueChange={(val) => handleSelectY(val, index)}>
                                <SelectTrigger className="h-8 min-w-0 flex-1 text-xs">
                                <SelectValue className="text-xs">{formatColumnLabel(yValue)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent className="text-xs">
                                  <GroupedColumnSelectItems
                                    groups={lineSheetColumnGroups}
                                    allowedValues={availableYOptions}
                                  />
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
                          <Select onValueChange={(val) => handleSelectY(val)}>
                            <SelectTrigger className="h-8 min-w-0 text-xs">
                              <SelectValue placeholder="Y axis" className="text-xs" />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                              <GroupedColumnSelectItems
                                groups={lineSheetColumnGroups}
                                allowedValues={availableYOptions}
                              />
                            </SelectContent>
                          </Select>
                        )}
                      </Field>
                      {selChartType === "bar" && selY.length > 0 && (
                        <>
                          <Field>
                            <FieldLabel className="text-xs">Break down bars by</FieldLabel>
                            <FieldDescription className="text-xs">
                              Pivot long data (e.g. outcome) into stacked or grouped series on the same X value.
                            </FieldDescription>
                            <Select
                              value={barSeriesColumn ?? "__none__"}
                              onValueChange={(v) => setBarSeriesColumn(v === "__none__" ? null : v)}
                            >
                              <SelectTrigger className="h-8 min-w-0 text-xs">
                                <SelectValue placeholder="None" className="text-xs" />
                              </SelectTrigger>
                              <SelectContent className="text-xs">
                                <SelectItem value="__none__" className="text-xs">
                                  None (one bar per Y column)
                                </SelectItem>
                                <GroupedColumnSelectItems
                                  groups={lineSheetColumnGroups}
                                  allowedValues={xOptions}
                                  excludeValues={[selX, ...(selY || [])].filter(Boolean)}
                                />
                              </SelectContent>
                            </Select>
                          </Field>
                          {barSeriesColumn ? (
                            <Field>
                              <FieldLabel className="text-xs">Bar layout</FieldLabel>
                              <ToggleGroup
                                type="single"
                                variant="outline"
                                size="sm"
                                className="flex w-full min-w-0 justify-stretch [&>button]:min-w-0 [&>button]:flex-1"
                                value={stackedBar ? "stacked" : "grouped"}
                                onValueChange={(v) => {
                                  if (v === "stacked") handleToggleStack(true);
                                  if (v === "grouped") handleToggleStack(false);
                                }}
                                aria-label="Stacked or grouped bars"
                              >
                                <ToggleGroupItem value="grouped" className="text-xs">
                                  Grouped
                                </ToggleGroupItem>
                                <ToggleGroupItem value="stacked" className="text-xs">
                                  Stacked
                                </ToggleGroupItem>
                              </ToggleGroup>
                            </Field>
                          ) : null}
                          {barSeriesColumn && barBreakdownSeriesKeys.length > 0 ? (
                            <Field>
                              <FieldLabel className="text-xs">Category colors</FieldLabel>
                              <FieldDescription className="text-xs">
                                Pick a color for each {formatColumnLabel(barSeriesColumn)} value.
                              </FieldDescription>
                              <div className="flex flex-wrap gap-2">
                                {barBreakdownSeriesKeys.map((seriesKey, index) => (
                                  <div key={`${seriesKey}-${index}`} className="inline-flex items-center gap-1">
                                    <Badge variant="secondary" className="gap-2 py-1 pl-2 pr-1 text-xs">
                                      <span className="inline-flex items-center gap-1">
                                        <span
                                          className="inline-block h-2 w-2 rounded-full"
                                          style={{ backgroundColor: getSeriesColor(seriesKey, index) }}
                                        />
                                        {seriesKey}
                                      </span>
                                    </Badge>
                                    <ChartColorPalettePopover
                                      value={
                                        lineColorOverrides?.[seriesInstanceKey(index)] ??
                                        lineColorOverrides?.[seriesKey] ??
                                        null
                                      }
                                      swatchColor={getSeriesColor(seriesKey, index)}
                                      onChange={(color) =>
                                        setBreakdownSeriesColorOverride(seriesKey, index, color)
                                      }
                                      onClear={() => clearBreakdownSeriesColorOverride(seriesKey, index)}
                                      ariaLabel={`Pick color for ${seriesKey}`}
                                    />
                                  </div>
                                ))}
                              </div>
                            </Field>
                          ) : null}
                        </>
                      )}
                      {selChartType === "bar" && selY.length > 0 && !barSeriesColumn && (
                        <Field>
                          <FieldLabel className="text-xs">Bars</FieldLabel>
                          <div className="flex flex-wrap gap-2">
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
                          {renderSeriesLabelInputs(selY)}
                        </Field>
                      )}
                      {yAxisFormatControls}
                      {selChartType === "bar" ? normalizeValuesControl : null}
                    </>
                  )}

                  {/* Scatter/bubble: Z (bubble size) and Color column */}
                  {selChartType === "scatter" && (
                    <>
                      <Field>
                        <div className="flex items-start justify-between gap-3">
                          <FieldContent className="gap-1">
                            <FieldTitle className="text-xs">Bubble size (Z)</FieldTitle>
                            <FieldDescription className="text-xs">
                              Optional numeric column for bubble radius
                            </FieldDescription>
                          </FieldContent>
                          <Switch
                            checked={!!scatterZEnabled}
                            onCheckedChange={(checked) => {
                              setScatterZEnabled(!!checked);
                              if (!checked) setSelZ(null);
                            }}
                            aria-label="Enable bubble size Z column"
                            className="h-4 w-7 shrink-0 [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-3"
                          />
                        </div>
                        {scatterZEnabled ? (
                          <Select value={selZ || ""} onValueChange={(v) => setSelZ(v || null)}>
                            <SelectTrigger className="h-8 min-w-0 text-xs">
                              <SelectValue placeholder="Select Z column" className="text-xs" />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                              <GroupedColumnSelectItems
                                groups={lineSheetColumnGroups}
                                allowedValues={xOptions}
                                excludeValues={selX ? [selX] : []}
                              />
                            </SelectContent>
                          </Select>
                        ) : null}
                      </Field>
                      <Field>
                        <div className="flex items-start justify-between gap-3">
                          <FieldContent className="gap-1">
                            <FieldTitle className="text-xs">Color by</FieldTitle>
                            <FieldDescription className="text-xs">
                              Optional column for point color
                            </FieldDescription>
                          </FieldContent>
                          <Switch
                            checked={!!scatterColorEnabled}
                            onCheckedChange={(checked) => {
                              setScatterColorEnabled(!!checked);
                              if (!checked) setSelColorCol(null);
                            }}
                            aria-label="Enable scatter color by column"
                            className="h-4 w-7 shrink-0 [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-3"
                          />
                        </div>
                        {scatterColorEnabled ? (
                          <Select value={selColorCol ?? "__none__"} onValueChange={(v) => setSelColorCol(v === "__none__" ? null : v)}>
                            <SelectTrigger className="h-8 min-w-0 text-xs">
                              <SelectValue placeholder="None or select column" className="text-xs" />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                              <SelectItem value="__none__" className="text-xs">
                                None
                              </SelectItem>
                              <GroupedColumnSelectItems
                                groups={lineSheetColumnGroups}
                                allowedValues={xOptions}
                              />
                            </SelectContent>
                          </Select>
                        ) : null}
                      </Field>
                      {scatterZEnabled && selZ && (
                        <Field orientation="horizontal" className="items-center gap-2">
                          <FieldLabel className="text-xs">Z scale</FieldLabel>
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className={`flex items-center gap-1 rounded border border-border p-1.5 ${scaleZ === "log" ? "bg-muted" : "bg-background"}`}
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
                        </Field>
                      )}
                    </>
                  )}

                  {selChartType === "liveline" && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        const next = (availableYOptions || []).find((opt) => !(selY || []).includes(opt));
                        if (next) handleSelectY(next);
                      }}
                      disabled={
                        !availableYOptions?.length ||
                        (availableYOptions || []).every((opt) => (selY || []).includes(opt))
                      }
                    >
                      {(availableYOptions || []).every((opt) => (selY || []).includes(opt))
                        ? "No more columns to add"
                        : "+ Add line"}
                    </Button>
                  )}
                  {selChartType !== "pie" && selChartType !== "scatter" && selChartType !== "liveline" && selChartType !== "candlestick" && selChartType !== "line" && selChartType !== "treemap" && selChartType !== "heatmap" && !(selChartType === "bar" && barSeriesColumn) && (
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
                  </FieldGroup>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="design">
                <AccordionTrigger className="py-2 text-xs font-bold text-muted-foreground hover:no-underline">
                  Design
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <div className="flex min-w-0 items-center gap-2 border-b border-border/60 pb-3">
                    <Label className="w-24 shrink-0 text-xs text-muted-foreground">Inner box</Label>
                    <ChartColorPalettePopover
                      value={innerBoxColor}
                      onChange={setInnerBoxColor}
                      ariaLabel="Inner box background"
                      onClear={() => setInnerBoxColor(null)}
                    />
                  </div>

                  {selChartType === "heatmap" && (
                    <div className="min-w-0 space-y-3 border-b border-border/60 pb-3 pt-1">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Color cap</Label>
                        <p className="text-[10px] leading-snug text-muted-foreground">
                          Saturates the diverging ramp at ±cap. Auto uses the max absolute change in the data.
                        </p>
                        <ToggleGroup
                          type="single"
                          variant="outline"
                          size="sm"
                          className="flex w-full min-w-0 justify-stretch [&>button]:min-w-0 [&>button]:flex-1"
                          value={heatmapCapMode === "manual" ? "manual" : "auto"}
                          onValueChange={(v) => {
                            if (v === "auto" || v === "manual") setHeatmapCapMode(v);
                          }}
                          aria-label="Heatmap color cap mode"
                        >
                          <ToggleGroupItem value="auto" className="text-xs">
                            Auto
                          </ToggleGroupItem>
                          <ToggleGroupItem value="manual" className="text-xs">
                            Manual
                          </ToggleGroupItem>
                        </ToggleGroup>
                        {heatmapCapMode === "manual" ? (
                          <Input
                            type="number"
                            min="0.1"
                            step="0.5"
                            value={String(heatmapCap ?? 6)}
                            onChange={(e) =>
                              setHeatmapCap(Math.max(0.1, Number(e.target.value) || 6))
                            }
                            className="h-8 text-xs"
                            aria-label="Heatmap color cap value"
                          />
                        ) : null}
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <Label className="w-28 shrink-0 text-xs text-muted-foreground">Up color</Label>
                        <ChartColorPalettePopover
                          value={heatmapUpColor}
                          onChange={setHeatmapUpColor}
                          ariaLabel="Heatmap up (positive) color"
                          onClear={() => setHeatmapUpColor(null)}
                        />
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <Label className="w-28 shrink-0 text-xs text-muted-foreground">Down color</Label>
                        <ChartColorPalettePopover
                          value={heatmapDownColor}
                          onChange={setHeatmapDownColor}
                          ariaLabel="Heatmap down (negative) color"
                          onClear={() => setHeatmapDownColor(null)}
                        />
                      </div>
                    </div>
                  )}

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
                          <GroupedColumnSelectItems
                            groups={lineSheetColumnGroups}
                            allowedValues={xOptions}
                          />
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
                      {selChartType === "line" && (
                        <div className="space-y-1.5">
                          <Label htmlFor="chart-design-line-thickness" className="text-xs text-muted-foreground">
                            Line thickness
                          </Label>
                          <Input
                            id="chart-design-line-thickness"
                            type="number"
                            min="1"
                            max="8"
                            value={String(lineStrokeWidth ?? 2)}
                            onChange={(e) =>
                              setLineStrokeWidth(Math.max(1, Math.min(8, Number(e.target.value) || 2)))
                            }
                            className="h-8 text-xs"
                          />
                          <p className="text-[10px] leading-snug text-muted-foreground">Stroke width in pixels (1–8).</p>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Stroke pattern</Label>
                            <Select value={lineStrokeStyle} onValueChange={setLineStrokeStyle}>
                              <SelectTrigger className="h-8 min-w-0 text-xs">
                                <SelectValue placeholder="Stroke pattern" />
                              </SelectTrigger>
                              <SelectContent className="text-xs">
                                <SelectItem value="solid" className="text-xs">Solid</SelectItem>
                                <SelectItem value="dashed" className="text-xs">Dashed</SelectItem>
                                <SelectItem value="dotted" className="text-xs">Dotted</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
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

                  {(selChartType === "area" ||
                    selChartType === "line" ||
                    selChartType === "bar" ||
                    selChartType === "scatter") && (
                    <div className="space-y-2 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="chart-design-enable-zoom"
                          checked={enableZoom}
                          onCheckedChange={setEnableZoom}
                          className="scale-75 origin-left"
                        />
                        <Label
                          htmlFor="chart-design-enable-zoom"
                          className="cursor-pointer text-xs text-muted-foreground"
                        >
                          Enable zoom
                        </Label>
                      </div>
                      <p className="text-[10px] leading-snug text-muted-foreground">
                        Scroll over the chart to zoom into a time or value range (numeric X).
                        Double-click to reset. Works like candlestick scroll zoom.
                      </p>
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

              {/* Scatter/bubble: Z (bubble size) and Color column */}
              {selChartType === "scatter" && (
                <>
                  <div className="min-w-0 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Bubble size (Z)</p>
                        <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"}`}>Optional numeric column for bubble radius</p>
                      </div>
                      <Switch
                        checked={!!scatterZEnabled}
                        onCheckedChange={(checked) => {
                          setScatterZEnabled(!!checked);
                          if (!checked) setSelZ(null);
                        }}
                        aria-label="Enable bubble size Z column"
                      />
                    </div>
                    {scatterZEnabled ? (
                      <Select value={selZ || ""} onValueChange={(v) => setSelZ(v || null)}>
                        <SelectTrigger className="mt-1 min-w-0">
                          <SelectValue placeholder="Select Z column" className="text-xs" />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <GroupedColumnSelectItems
                            groups={lineSheetColumnGroups}
                            allowedValues={xOptions}
                            excludeValues={selX ? [selX] : []}
                          />
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                  <div className="min-w-0 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Color by</p>
                        <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"}`}>Optional column for point color</p>
                      </div>
                      <Switch
                        checked={!!scatterColorEnabled}
                        onCheckedChange={(checked) => {
                          setScatterColorEnabled(!!checked);
                          if (!checked) setSelColorCol(null);
                        }}
                        aria-label="Enable scatter color by column"
                      />
                    </div>
                    {scatterColorEnabled ? (
                      <Select value={selColorCol ?? "__none__"} onValueChange={(v) => setSelColorCol(v === "__none__" ? null : v)}>
                        <SelectTrigger className="mt-1 min-w-0">
                          <SelectValue placeholder="None or select column" className="text-xs" />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="__none__" className="text-xs">
                            None
                          </SelectItem>
                          <GroupedColumnSelectItems
                            groups={lineSheetColumnGroups}
                            allowedValues={xOptions}
                          />
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                  {scatterZEnabled && selZ && (
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
                  selChartType === "pie" ||
                  selChartType === "heatmap" ||
                  selChartType === "treemap") && (
                  <div className="min-w-0 space-y-3 border-b border-border/60 py-3">
                    <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"}`}>Tooltip</p>
                    <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"}`}>
                      Hover over your chart to view tooltip
                    </p>
                    <div className="flex flex-col gap-2">
                      {selChartType !== "heatmap" && selChartType !== "treemap" ? (
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
                      ) : null}
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
                          <GroupedColumnSelectItems
                            groups={lineSheetColumnGroups}
                            allowedValues={xOptions}
                            excludeValues={tooltipExtraColumns}
                          />
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
                                <GroupedColumnSelectItems
                                  groups={lineSheetColumnGroups}
                                  allowedValues={xOptions}
                                />
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
                    {selChartType !== "heatmap" && selChartType !== "candlestick" && selChartType !== "liveline" ? (
                      <Toggle area-label="Toggle Legend" pressed={legendVisible} onPressedChange={handleToggleLegend}>
                        <IdCardIcon className="h-4 w-4 text-foreground" />
                      </Toggle>
                    ) : null}
                    {legendVisible ? (
                      <div className="min-w-0 flex-1 basis-full space-y-1">
                        <Label htmlFor="chart-legend-title" className="text-xs text-muted-foreground">
                          Legend title
                        </Label>
                        <Input
                          id="chart-legend-title"
                          type="text"
                          value={legendTitle}
                          placeholder="e.g. Score range"
                          className="h-8 text-xs"
                          onChange={(e) => setLegendTitle(e.target.value)}
                        />
                      </div>
                    ) : null}
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

              <AccordionItem value="text">
                <AccordionTrigger className="py-2 text-xs font-bold text-muted-foreground hover:no-underline">
                  Text
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <ItemGroup className="gap-2">
                    {[
                      {
                        id: "chart-text-title",
                        label: "Title",
                        value: title,
                        setValue: setTitle,
                        placeholder: "Give your chart a title",
                        color: titleColor,
                        setColor: setTitleColor,
                        visible: !titleHidden,
                        setVisible: (on) => setTitleHidden(!on),
                        rows: 2,
                      },
                      {
                        id: "chart-text-desc",
                        label: selChartType === "heatmap" ? "Subtitle" : "Description",
                        value: subTitle,
                        setValue: setSubTitle,
                        placeholder: selChartType === "heatmap" ? "Subtitle" : "Description",
                        color: subTitleColor,
                        setColor: setSubTitleColor,
                        visible: !subTitleHidden,
                        setVisible: (on) => setSubTitleHidden(!on),
                        rows: 2,
                      },
                      {
                        id: "chart-text-body-h",
                        label: "Body heading",
                        value: bodyHeading,
                        setValue: setBodyHeading,
                        placeholder: "Body heading",
                        color: bodyHeadingColor,
                        setColor: setBodyHeadingColor,
                        visible: !bodyHeadingHidden,
                        setVisible: (on) => setHeadingHidden(!on),
                        rows: 2,
                      },
                      {
                        id: "chart-text-content",
                        label: "Content",
                        value: bodyContent,
                        setValue: setBodyContent,
                        placeholder: "Content",
                        color: bodyContentColor,
                        setColor: setBodyContentColor,
                        visible: !bodyContentHidden,
                        setVisible: (on) => setBodyContentHidden(!on),
                        rows: 4,
                      },
                      {
                        id: "chart-text-x-axis",
                        label: "X-axis label",
                        value: xAxisLabel,
                        setValue: setXAxisLabel,
                        placeholder: "X-axis label",
                        color: xAxisLabelColor,
                        setColor: setXAxisLabelColor,
                        visible: !xAxisLabelHidden,
                        setVisible: (on) => setXAxisLabelHidden(!on),
                        rows: 2,
                      },
                      {
                        id: "chart-text-y-axis",
                        label: "Y-axis label",
                        value: yAxisLabel,
                        setValue: setYAxisLabel,
                        placeholder: "Y-axis label",
                        color: yAxisLabelColor,
                        setColor: setYAxisLabelColor,
                        visible: !yAxisLabelHidden,
                        setVisible: (on) => setYAxisLabelHidden(!on),
                        rows: 2,
                      },
                    ]
                      .filter((field) => {
                        if (selChartType !== "heatmap") return true;
                        return field.id === "chart-text-title" || field.id === "chart-text-desc";
                      })
                      .map((field) => (
                      <Item
                        key={field.id}
                        variant="outline"
                        size="sm"
                        className="w-full flex-col items-stretch gap-2 px-2.5 py-2"
                      >
                        <ItemHeader>
                          <ItemTitle className="text-[11px] font-medium text-muted-foreground">
                            {field.label}
                          </ItemTitle>
                          <ItemActions>
                            <Switch
                              checked={field.visible}
                              onCheckedChange={field.setVisible}
                              aria-label={`Show ${field.label} on chart`}
                              className="h-4 w-7 data-[state=checked]:bg-slate-900 dark:data-[state=checked]:bg-slate-50 [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-3"
                            />
                          </ItemActions>
                        </ItemHeader>
                        {field.visible ? (
                          <div className="flex w-full min-w-0 items-start gap-2">
                            <ItemContent className="min-w-0 gap-0">
                              <Textarea
                                id={field.id}
                                value={field.value}
                                placeholder={field.placeholder}
                                rows={field.rows}
                                className="min-h-0 min-w-0 resize-y text-xs"
                                onChange={(e) => field.setValue(e.target.value)}
                              />
                            </ItemContent>
                            {selChartType === "heatmap" ? null : (
                              <ItemMedia variant="image" className="size-8 shrink-0 self-start p-0">
                                <ChartColorPalettePopover
                                  value={field.color}
                                  onChange={field.setColor}
                                  ariaLabel={`${field.label} color`}
                                  onClear={() => field.setColor(null)}
                                  triggerClassName="h-full w-full rounded-sm border-border"
                                />
                              </ItemMedia>
                            )}
                          </div>
                        ) : null}
                      </Item>
                    ))}
                  </ItemGroup>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
        </>
    </div>
  );
}

