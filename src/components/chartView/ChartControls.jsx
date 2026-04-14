"use client";

import Link from "next/link";
import { useState } from "react";
import { CaretRightIcon, EyeClosedIcon, EyeOpenIcon, IdCardIcon } from "@radix-ui/react-icons";
import { MinusCircle, Moon } from "react-feather";
import { IoPieChartOutline, IoShuffleOutline, IoStatsChart } from "react-icons/io5";
import { PiChartBarHorizontalLight, PiChartDonut, PiChartLine, PiChartLineThin } from "react-icons/pi";
import { MdOutlineAreaChart, MdStackedBarChart } from "react-icons/md";
import { GoDotFill } from "react-icons/go";
import { AiOutlineRadarChart } from "react-icons/ai";
import { CircleDot, CircleHelp, Expand, Lightbulb, ArrowUp, ArrowDown, LogIn, Tag, LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toggle } from "@/components/ui/toggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import {
  getShadcnChartPaletteArray,
  getShadcnChartBaseSwatch950,
  getShadcnSingleColors,
} from "@/components/chartView/panels/shadcnChartPalettes";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

    colorVisible,
    setColorVisible,

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
    shufflePalette,
    shadcnChartBases,
    selectedShadBaseId,
    selectedPaletteHandler,
    handleToggleDark,

    lineStyle,
    setLineStyle,
    lineHumanReadableTime,
    setLineHumanReadableTime,
    xTimeScale,
    setXTimeScale,
    expanded,
    handleToggleChange,
    legendVisible,
    handleToggleLegend,
    horizontal,
    handleToggleHorizontal,
    stackedBar,
    handleToggleStack,
    dots,
    handleToggleDots,
    labelLine,
    handleToggleLabelLine,
    donut,
    handleToggleDonut,

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
  const xAxisSelectValue = selX ?? CHART_X_AXIS_NONE;
  const handleXAxisChange = (v) => setSelX(v === CHART_X_AXIS_NONE ? undefined : v);

  const addableLineColumns = (xOptions || []).filter((c) => c !== selX && !(selY || []).includes(c));
  const parseScopedLineKey = (value) => {
    const raw = String(value || "");
    const splitIdx = raw.indexOf("::");
    if (splitIdx <= 0) return { sheetId: "", column: raw, isScoped: false };
    return { sheetId: raw.slice(0, splitIdx), column: raw.slice(splitIdx + 2), isScoped: true };
  };
  const groupedLineOptions = (lineSheetColumnGroups || [])
    .map((group) => {
      const options = (group.options || []).filter((opt) => {
        if ((selY || []).includes(opt.value)) return false;
        const parsed = parseScopedLineKey(opt.value);
        if (group.sheetId === parsed.sheetId && opt.column === selX) return false;
        return true;
      });
      return { ...group, options };
    })
    .filter((group) => group.options.length > 0);
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
  const palettePreview =
    selectedPalette && selectedPalette.length
      ? selectedPalette
      : getShadcnChartPaletteArray(selectedShadBaseId || "");
  const singleColors = getShadcnSingleColors(600);
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
  const getLineColor = (lineColumn, index) => lineColorOverrides?.[lineColumn] || defaultSeriesColorAt(index);

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
                                  {i}
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
                        <div className="pt-2">
                          <p className="text-xs font-bold mb-1 text-muted-foreground">Lines</p>

                          <div className="py-2 flex flex-wrap gap-2">
                            {(selY || []).map((lineColumn, index) => (
                              <div key={`${lineColumn}-${index}`} className="inline-flex items-center gap-1">
                                <Badge variant="secondary" className="text-xs gap-2 pr-1 pl-2 py-1">
                                  <span className="inline-flex items-center gap-1">
                                    <span
                                      className="inline-block h-2 w-2 rounded-full"
                                      style={{ backgroundColor: getLineColor(lineColumn, index) }}
                                    />
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
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border"
                                      style={{ backgroundColor: getLineColor(lineColumn, index) }}
                                      aria-label={`Pick color for Line ${index + 1}`}
                                    />
                                  </PopoverTrigger>
                                  <PopoverContent align="start" className="w-56 p-2">
                                    <div className="grid grid-cols-8 gap-1.5">
                                      {singleColors.map(({ baseId, color }) => (
                                        <button
                                          key={`${lineColumn}-${baseId}`}
                                          type="button"
                                          className="h-5 w-5 rounded-full border border-border"
                                          style={{ backgroundColor: color }}
                                          onClick={() =>
                                            setLineColorOverrides((prev) => ({
                                              ...(prev || {}),
                                              [lineColumn]: color,
                                            }))
                                          }
                                          aria-label={`Use ${baseId} for ${lineColumn}`}
                                          title={baseId}
                                        />
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
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
                                  {i}
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
                                  <SelectValue className="text-xs">{yValue}</SelectValue>
                                </SelectTrigger>
                                <SelectContent className="text-xs">
                                  {availableYOptions &&
                                    availableYOptions.map((i) => (
                                      <SelectItem key={i} value={i} className="text-xs">
                                        {i}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              {!(selY.length === 1) && (
                                <div className="p-1 text-red-400 cursor-pointer hover:text-red-700">
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
                                      {i}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
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
                                  {i}
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
                                  <SelectValue className="text-xs">{yValue}</SelectValue>
                                </SelectTrigger>
                                <SelectContent className="text-xs">
                                  {availableYOptions &&
                                    availableYOptions.map((i) => (
                                      <SelectItem key={i} value={i} className="text-xs">
                                        {i}
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
                                      {i}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
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
                                  {i}
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
                                  {i}
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
                {/* Remount when palette picker toggles so height re-measures */}
                <AccordionContent key={colorVisible ? "palette-open" : "palette-closed"} className="pt-2">
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
                              {i}
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
                              {i}
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
              {!demo && effectiveData?.length > 0 && xOptions?.length > 0 && (
                <div className="min-w-0 py-2 space-y-2">
                  <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"}`}>Filter by column</p>
                  <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"}`}>Plot only rows matching filter</p>
                  <Select
                    value={chartFilterColumn ?? "__none__"}
                    onValueChange={(v) => {
                      setChartFilterColumn(v === "__none__" ? null : v);
                      setChartFilterConfig({});
                    }}
                  >
                    <SelectTrigger className="h-8 min-w-0 text-xs">
                      <SelectValue placeholder="No filter" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="__none__" className="text-xs">
                        No filter
                      </SelectItem>
                      {xOptions.map((k) => (
                        <SelectItem key={k} value={k} className="text-xs">
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {chartFilterColumn && chartFilterType === "string" && (
                    <div className="max-h-[100px] overflow-y-auto space-y-1">
                      {chartFilterDistinct.slice(0, 20).map((v) => {
                        const selected = chartFilterConfig.selectedValues || [];
                        const checked = selected.length === 0 || selected.includes(v);
                        return (
                          <label key={v} className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) => {
                                const prev = chartFilterConfig.selectedValues || [];
                                let next;
                                if (c) {
                                  next = prev.length === 0 ? prev : prev.includes(v) ? prev : [...prev, v];
                                } else {
                                  next = prev.length === 0 ? chartFilterDistinct.filter((x) => x !== v) : prev.filter((x) => x !== v);
                                }
                                setChartFilterConfig({ ...chartFilterConfig, selectedValues: next });
                              }}
                            />
                            <span className="truncate">
                              {String(v).slice(0, 40)}
                              {String(v).length > 40 ? "…" : ""}
                            </span>
                          </label>
                        );
                      })}
                      {chartFilterDistinct.length > 20 && <p className="text-[10px] text-muted-foreground">+{chartFilterDistinct.length - 20} more</p>}
                    </div>
                  )}
                  {chartFilterColumn && chartFilterType === "number" && (
                    <div className="space-y-1">
                      <Select value={chartFilterConfig.operator ?? ""} onValueChange={(v) => setChartFilterConfig({ ...chartFilterConfig, operator: v })}>
                        <SelectTrigger className="h-7 min-w-0 text-xs">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="gt">&gt;</SelectItem>
                          <SelectItem value="gte">≥</SelectItem>
                          <SelectItem value="lt">&lt;</SelectItem>
                          <SelectItem value="lte">≤</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={chartFilterConfig.value ?? ""}
                        onChange={(e) => setChartFilterConfig({ ...chartFilterConfig, value: parseFloat(e.target.value) || 0 })}
                        placeholder="Value"
                              className="h-8 text-xs"
                        type="number"
                      />
                    </div>
                  )}
                  {chartFilterColumn && chartFilterType === "date" && (
                    <div className="space-y-1">
                      <Input
                        value={chartFilterConfig.from ?? ""}
                        onChange={(e) => setChartFilterConfig({ ...chartFilterConfig, from: e.target.value || undefined })}
                        placeholder="From date"
                        className="h-8 text-xs"
                        type="date"
                      />
                      <Input
                        value={chartFilterConfig.to ?? ""}
                        onChange={(e) => setChartFilterConfig({ ...chartFilterConfig, to: e.target.value || undefined })}
                        placeholder="To date"
                        className="h-7 text-xs"
                        type="date"
                      />
                    </div>
                  )}
                </div>
              )}
              {selY && selY[0] && chartData && chartData.length && getAxisType(selY[0], dataTypes, chartData) === "number" ? (
                <div className="py-2 space-y-2">
                  <div className="space-y-2">
                    <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"}`}>Y-axis format</p>
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
                  </div>
                </div>
              ) : null}
          <div className="py-2">
            <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Palette</p>
            <div className="flex gap-3 place-items-center">
              <button
                type="button"
                className="flex text-xs rounded-md py-2 cursor-pointer"
                onClick={() => {
                  setOpenSection("design");
                  setColorVisible(true);
                }}
              >
                {palettePreview.map((color, idx) => (
                  <div key={`${color}-${idx}`} className="p-3" style={{ backgroundColor: color }} />
                ))}
              </button>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="p-1.5 rounded-md border border-border/60 hover:bg-muted/60 text-slate-600 dark:text-slate-300"
                      aria-label="Rotate palette colors"
                      onClick={() => shufflePalette()}
                    >
                      <IoShuffleOutline className="h-4 w-4" aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-[220px]">
                    Rotate the palette array: each shade moves to the next slot. Frame tints use the light end; lines and
                    bars use the dark end of the ramp.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Toggle area-label="Toggle Expand" pressed={dark} onPressedChange={handleToggleDark}>
                {dark ? <Lightbulb className="h-4 w-4 text-foreground" /> : <Moon className="h-4 w-4 text-foreground" />}
              </Toggle>
            </div>
            <div>
              {colorVisible && (
                <div className="space-y-3">
                  <div
                    className="cursor-pointer bg-yellow-300/40 w-16 hover:bg-slate-300/40 text-xs pl-1 my-2"
                    onClick={() => setColorVisible(false)}
                  >
                    close
                  </div>
                  <p className={`text-[11px] ${dark ? "text-slate-400" : "text-muted-foreground"}`}>
                    Shadcn-style palettes: each option is the full Tailwind shade ramp (50–950) for that base. See{" "}
                    <a
                      href="https://ui.shadcn.com/colors#colors"
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      Tailwind colors (shadcn)
                    </a>
                    .
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(shadcnChartBases || []).map((id) => {
                      const active = selectedShadBaseId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs capitalize transition-colors ${
                            active
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-background hover:bg-muted/60"
                          }`}
                          onClick={() => selectedPaletteHandler(id)}
                        >
                          <span
                            className="inline-block h-3 w-3 shrink-0 rounded-sm border border-border/60"
                            style={{ backgroundColor: getShadcnChartBaseSwatch950(id) }}
                            aria-hidden
                          />
                          {id}
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className={`text-xs font-medium ${dark ? "text-slate-200" : "text-muted-foreground"}`}>
                        Shades in this palette
                      </p>
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background hover:bg-muted/60 text-slate-600 dark:text-slate-300"
                              aria-label="Rotate palette colors"
                              onClick={() => shufflePalette()}
                            >
                              <IoShuffleOutline className="h-4 w-4" aria-hidden />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs max-w-[220px]">
                            Rotate palette: shift each shade forward. Outer frame uses the lightest stops; chart series
                            stay mapped to the darker stops for contrast.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex flex-wrap gap-0.5 rounded-md border border-border/60 bg-muted/20 p-2">
                      {(palettePreview || []).map((color, idx) => (
                        <div
                          key={`${color}-${idx}`}
                          className="h-9 w-9 shrink-0 rounded-sm border border-border/40"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {(selChartType === "area" || selChartType === "line") && (
            <div className="min-w-0 py-2">
              <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Line Style</p>
              <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"} pt-2`}>How do you want your line</p>
              <Select className="min-w-0" value={lineStyle} onValueChange={(value) => setLineStyle(value)}>
                <SelectTrigger className="min-w-0 text-foreground">
                  <SelectValue placeholder="y axis" className="text-xs" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {["natural", "linear", "step"].map((i) => (
                    <SelectItem key={i} value={i} className="text-xs">
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="py-2 flex gap-2">
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
              <>
                <Toggle area-label="Toggle Dots" pressed={dots} onPressedChange={handleToggleDots}>
                  <GoDotFill className="h-4 w-4 text-foreground" />
                </Toggle>
                <Toggle area-label="Toggle label line" pressed={labelLine} onPressedChange={handleToggleLabelLine}>
                  <Tag className="h-4 w-4 text-foreground" />
                </Toggle>
              </>
            )}
            {(selChartType === "line" || selChartType === "pie") && (
              <Toggle area-label="Toggle label line" pressed={labelLine} onPressedChange={handleToggleLabelLine}>
                <Tag className="h-4 w-4 text-foreground" />
              </Toggle>
            )}
            {selChartType === "pie" && (
              <Toggle area-label="Toggle donut" pressed={donut} onPressedChange={handleToggleDonut}>
                <PiChartDonut className="h-4 w-4 text-foreground" />
              </Toggle>
            )}
          </div>
          <div className="flex place-items-center gap-3 text-xs">
            <Input id="title" type="text" placeholder="Give Your Chart a Title" className="text-xs" onChange={(e) => setTitle(e.target.value)} />
            <div
              className="flex h-6 w-6 cursor-pointer place-content-center place-items-center rounded-full bg-yellow-400/30 p-2 text-foreground hover:bg-lychee_green/40 hover:text-foreground"
              onClick={() => setTitleHidden(!titleHidden)}
            >
              {titleHidden ? <EyeOpenIcon className="w-3 h-3" /> : <EyeClosedIcon className="w-3 h-3" />}
            </div>
          </div>
          <div className="flex gap-2 place-items-center py-1">
            <Input id="subTitle" type="text" className="text-xs" placeholder="Add a Description" onChange={(e) => setSubTitle(e.target.value)} />
            <div
              className="flex h-6 w-6 cursor-pointer place-content-center place-items-center rounded-full bg-yellow-400/30 p-2 text-foreground hover:bg-lychee_green/40 hover:text-foreground"
              onClick={() => setSubTitleHidden(!subTitleHidden)}
            >
              {subTitleHidden ? <EyeOpenIcon className="w-3 h-3" /> : <EyeClosedIcon className="w-3 h-3" />}
            </div>
          </div>
          <div className="flex gap-2 place-items-center py-1">
            <Input id="bodyHeading" type="text" className="text-xs" placeholder="Add a body Heading" onChange={(e) => setBodyHeading(e.target.value)} />
            <div
              className="flex h-6 w-6 cursor-pointer place-content-center place-items-center rounded-full bg-yellow-400/30 p-2 text-foreground hover:bg-lychee_green/40 hover:text-foreground"
              onClick={() => setHeadingHidden(!bodyHeadingHidden)}
            >
              {bodyHeadingHidden ? <EyeOpenIcon className="w-3 h-3" /> : <EyeClosedIcon className="w-3 h-3" />}
            </div>
          </div>
          <div className="flex gap-2 place-items-center pb-10">
            <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Content</p>
            <Input id="BodyContent" type="text" className="text-xs" placeholder="Add a Description" onChange={(e) => setBodyContent(e.target.value)} />
            <div
              className="flex h-6 w-6 cursor-pointer place-content-center place-items-center rounded-full bg-yellow-400/30 p-2 text-foreground hover:bg-lychee_green/40 hover:text-foreground"
              onClick={() => setBodyContentHidden(!bodyContentHidden)}
            >
              {bodyContentHidden ? <EyeOpenIcon className="w-3 h-3" /> : <EyeClosedIcon className="w-3 h-3" />}
            </div>
          </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
        </>
    </div>
  );
}

