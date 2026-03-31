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
import { CircleDot, Expand, Lightbulb, ArrowUp, ArrowDown, LogIn, Tag, LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
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

import { useChartBuilder } from "@/components/chartView";
import { masterPalette } from "@/components/chartView/panels/masterPalette";
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
    scaleX,
    setScaleX,
    scaleY,
    setScaleY,
    yAxisDivisor,
    setYAxisDivisor,
    yAxisCompact,
    setYAxisCompact,
    dataTypes,
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

  // Only one section open at a time; default to Chart Type.
  const [openSection, setOpenSection] = useState("chartType");
  const [lineAddValue, setLineAddValue] = useState("");
  const addableLineColumns = (xOptions || []).filter((c) => c !== selX && !(selY || []).includes(c));
  const palettePreview = selectedPalette && selectedPalette.length
    ? selectedPalette
    : (selectedCategory && masterPalette?.[selectedCategory]?.[0]) || [];

  return (
    <div className="gradualEffect flex flex-col min-w-0 max-w-full w-full overflow-x-hidden px-4 py-4 border rounded-lg" style={{ zIndex: 20 }}>
      <>
        {!demo && !effectiveData && (
            <div className="flex place-items-center text-xs gap-2 place-items-center bg-indigo-500/80 rounded-lg px-4 py-2 mx-8 mb-4">
              <div className="rounded-full bg-white h-2 w-2 mr-1 animate-bounce" />
              <small className="text-xs text-white"> You haven't connected any data yet. </small>
              <span className="flex place-items-center ml-2 text-[10px] rounded-md bg-white text-black cursor-pointer hover:bg-black hover:text-white px-2" onClick={() => setViewing("dataStart")}>
                Fix<CaretRightIcon />
              </span>
            </div>
          )}
          {!demo && chartDataOverride && chartDataOverrideMeta && (
            <div className="flex place-items-center text-xs gap-2 place-items-center bg-lychee_blue/80 rounded-lg px-4 py-2 mx-8 mb-4">
              <small className="text-xs text-white"> Viewing summary: {chartDataOverrideMeta.title} </small>
              <span
                className="flex place-items-center ml-2 text-[10px] rounded-md bg-white text-black cursor-pointer hover:bg-black hover:text-white px-2"
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
                            <ToggleGroupItem value="area" aria-label="Area chart">
                              <MdOutlineAreaChart className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            Area chart — filled band under the line; emphasizes magnitude and stacked totals.
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem value="bar" aria-label="Bar chart">
                              <IoStatsChart className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            Bar chart — compare categories side by side along the X axis.
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem value="line" aria-label="Line chart">
                              <PiChartLine className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            Line chart — show change and trends over the X axis (often time).
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem value="pie" aria-label="Pie chart">
                              <IoPieChartOutline className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            Pie chart — each slice is a share of the whole (uses one numeric Y column).
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem value="radar" aria-label="Radar chart">
                              <AiOutlineRadarChart className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            Radar chart — compare several variables on radial axes from the center.
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem value="treemap" aria-label="Treemap">
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
                            <ToggleGroupItem value="scatter" aria-label="Scatter / bubble chart">
                              <CircleDot className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            Scatter / bubble — points from X and Y; optional Z column for bubble size.
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem value="liveline" aria-label="Liveline chart">
                              <span className="relative inline-flex h-3 w-3">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                              </span>
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            Liveline — compact live canvas for streaming or high-frequency numeric series.
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
                <AccordionContent className="pt-2">
                  {selChartType === "line" ? (
                    <>
                      <div className="py-2 space-y-2">
                        <div className="flex min-w-0 items-center gap-2 text-black">
                          <span className={`text-xs font-semibold ${dark ? "text-slate-200" : "text-muted-foreground"}`}>index:</span>
                          <Select value={selX} onValueChange={(value) => setSelX(value)}>
                            <SelectTrigger className="min-w-0 flex-1">
                              <SelectValue placeholder="x axis" className="text-xs" />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                              {(xOptions || []).map((i) => (
                                <SelectItem key={i} value={i} className="text-xs">
                                  {i}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="pt-2">
                          <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} mb-1`}>Lines</p>

                          <div className="py-2 flex flex-wrap gap-2">
                            {(selY || []).map((lineColumn, index) => (
                              <Badge key={`${lineColumn}-${index}`} variant="secondary" className="text-xs gap-2 pr-1 pl-2 py-1">
                                <span className="inline-flex items-center gap-1">
                                  <span
                                    className="inline-block h-2 w-2 rounded-full"
                                    style={{ backgroundColor: palettePreview?.[index] || palettePreview?.[3] || (dark ? "#ffffff" : "#000000") }}
                                  />
                                  {`Line ${index + 1}: ${lineColumn}`}
                                </span>
                                <button
                                  type="button"
                                  className="inline-flex h-4 w-4 items-center justify-center rounded-sm hover:bg-muted-foreground/20"
                                  aria-label={`Remove Line ${index + 1}`}
                                  onClick={() => removeY(lineColumn, index)}
                                >
                                  x
                                </button>
                              </Badge>
                            ))}
                          </div>

                          <div className="flex items-center gap-2">
                            <Select
                              value={lineAddValue}
                              onValueChange={(val) => {
                                if (!val) return;
                                handleSelectY(val);
                                setLineAddValue("");
                              }}
                            >
                              <SelectTrigger
                                className="min-w-[140px] h-8 bg-black text-white rounded-md text-xs disabled:opacity-50"
                                disabled={!addableLineColumns.length}
                              >
                                <SelectValue placeholder="+ Add Line" className="text-xs" />
                              </SelectTrigger>
                              <SelectContent className="text-xs">
                                {(addableLineColumns || []).map((c) => (
                                  <SelectItem key={c} value={c} className="text-xs">
                                    {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {!addableLineColumns.length && (
                              <span className={`text-[10px] ${dark ? "text-slate-300" : "text-muted-foreground"}`}>
                                No more columns to plot
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (selChartType === "area") ? (
                    <>
                      <div className="min-w-0 py-2 text-black">
                        <Select value={selX} onValueChange={(value) => setSelX(value)}>
                          <SelectTrigger className="min-w-0">
                            <SelectValue placeholder="x axis" className="text-xs" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
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
                            <div className="py-1 flex min-w-0 place-items-center gap-2 text-black" key={index}>
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
                                <SelectValue placeholder="desktop" className="text-xs" />
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
                      <div className="min-w-0 py-2 text-black">
                        <Select value={selX} onValueChange={(value) => setSelX(value)}>
                          <SelectTrigger className="min-w-0">
                            <SelectValue placeholder="x axis" className="text-xs" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
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
                            <div className="py-1 flex min-w-0 place-items-center gap-2 text-black" key={index}>
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
                                <SelectValue placeholder="desktop" className="text-xs" />
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
                    <button className="p-2 bg-black text-white rounded-md text-xs" onClick={() => handleSelectY(availableYOptions[0])} disabled={availableYOptions && availableYOptions.length === 0}>
                      {availableYOptions && availableYOptions.length === 0 ? "You have no more columns" : "+ Stack Another Value"}
                    </button>
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
              {selChartType !== "pie" && selChartType !== "scatter" && selChartType !== "liveline" && selChartType !== "treemap" && (
                <button className="p-2 bg-black text-white rounded-md text-xs" onClick={() => handleSelectY(availableYOptions[0])} disabled={availableYOptions && availableYOptions.length === 0}>
                  {availableYOptions && availableYOptions.length === 0 ? "You have no more columns" : "+ Stack Another Value"}
                </button>
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
                        className="h-7 text-xs"
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
                        className="h-7 text-xs"
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
              <div className="py-2 space-y-2">
                <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"}`}>Sort axis</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`text-[10px] ${dark ? "text-slate-400" : "text-muted-foreground"}`}>X:</span>
                  <button
                    type="button"
                    className={`text-xs px-2 py-1 rounded border ${sortXDir === "asc" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}
                    onClick={() => setSortXDir((d) => (d === "asc" ? null : "asc"))}
                    title="X ascending (chronological / alphabetical / low→high)"
                  >
                    <ArrowUp className="h-3 w-3 inline mr-0.5" /> Asc
                  </button>
                  <button
                    type="button"
                    className={`text-xs px-2 py-1 rounded border ${sortXDir === "desc" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}
                    onClick={() => setSortXDir((d) => (d === "desc" ? null : "desc"))}
                    title="X descending (reverse chronological / Z→A / high→low)"
                  >
                    <ArrowDown className="h-3 w-3 inline mr-0.5" /> Desc
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`text-[10px] ${dark ? "text-slate-400" : "text-muted-foreground"}`}>Y:</span>
                  <button
                    type="button"
                    className={`text-xs px-2 py-1 rounded border ${sortYDir === "asc" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}
                    onClick={() => setSortYDir((d) => (d === "asc" ? null : "asc"))}
                    title="Y ascending"
                  >
                    <ArrowUp className="h-3 w-3 inline mr-0.5" /> Asc
                  </button>
                  <button
                    type="button"
                    className={`text-xs px-2 py-1 rounded border ${sortYDir === "desc" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}
                    onClick={() => setSortYDir((d) => (d === "desc" ? null : "desc"))}
                    title="Y descending"
                  >
                    <ArrowDown className="h-3 w-3 inline mr-0.5" /> Desc
                  </button>
                </div>
              </div>
              {(selX && chartData && chartData.length && getAxisType(selX, dataTypes, chartData) === "number") ||
              (selY && selY[0] && chartData && chartData.length && getAxisType(selY[0], dataTypes, chartData) === "number") ? (
                <div className="py-2 space-y-2">
                  <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"}`}>Axis scale</p>
                  <div className="flex flex-wrap gap-2">
                    {selX && chartData && chartData.length && getAxisType(selX, dataTypes, chartData) === "number" && (
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={`p-1.5 rounded border ${scaleX === "log" ? "bg-muted" : "bg-background"} border-border`}
                              onClick={() => setScaleX((s) => (s === "log" ? "linear" : "log"))}
                            >
                              <LogIn className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                            {scaleX === "linear"
                              ? "Linear scale: values map proportionally (equal spacing per unit)."
                              : "Log scale: for values spanning orders of magnitude (e.g. 1 → 1000)."}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {selY && selY[0] && chartData && chartData.length && getAxisType(selY[0], dataTypes, chartData) === "number" && (
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={`p-1.5 rounded border ${scaleY === "log" ? "bg-muted" : "bg-background"} border-border flex items-center gap-1`}
                              onClick={() => setScaleY((s) => (s === "log" ? "linear" : "log"))}
                            >
                              <LogIn className="h-4 w-4" />
                              <span className="text-[10px]">Y</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                            {scaleY === "linear" ? "Y: Linear scale." : "Y: Log scale (for large ranges)."}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  {selY && selY[0] && chartData && chartData.length && getAxisType(selY[0], dataTypes, chartData) === "number" && (
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
                  )}
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
              <div className="p-1 cursor-pointer" onClick={() => shufflePalette()}>
                <IoShuffleOutline className="h-4 w-4 text-slate-600" />
              </div>
              <Toggle area-label="Toggle Expand" pressed={dark} onPressedChange={handleToggleDark}>
                {dark ? <Lightbulb className="h-4 w-4 text-slate-800" /> : <Moon className="h-4 w-4 text-slate-800" />}
              </Toggle>
            </div>
            <div>
              {colorVisible && (
                <div>
                  <div className="cursor-pointer bg-yellow-300/40 w-16 hover:bg-slate-300/40  text-xs pl-1 my-2" onClick={() => setColorVisible(false)}>
                    close
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {categories.map((category, index) => (
                      <code
                        className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono cursor-pointer text-xs hover:bg-lychee_green"
                        key={index}
                        onClick={() => setSelectedCategory(category)}
                      >
                        {category}
                      </code>
                    ))}
                  </div>
                  {selectedCategory && (
                    <div className="flex flex-wrap place-items-center place-content-center gap-3">
                      {masterPalette[selectedCategory].map((palette, index) => (
                        <div key={index} className="flex cursor-pointer rounded-full hover:shadow-inner hover:bg-slate-100 p-1" onClick={() => selectedPaletteHandler(index)}>
                          {palette.map((color, colorIndex) => (
                            <div key={colorIndex} className="p-2 rounded-full" style={{ backgroundColor: color }} />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {(selChartType === "area" || selChartType === "line") && (
            <div className="min-w-0 py-2">
              <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Line Style</p>
              <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"} pt-2`}>How do you want your line</p>
              <Select className="min-w-0 text-black" value={lineStyle} onValueChange={(value) => setLineStyle(value)}>
                <SelectTrigger className="min-w-0 text-black">
                  <SelectValue placeholder="y axis" className="text-xs" />
                </SelectTrigger>
                <SelectContent className="text-xs text-black">
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
              <IdCardIcon className="h-4 w-4 text-slate-800" />
            </Toggle>
            {selChartType === "bar" && (
              <>
                <Toggle area-label="Toggle Horizontal" pressed={horizontal} onPressedChange={handleToggleHorizontal}>
                  <PiChartBarHorizontalLight className="h-4 w-4 text-slate-800" />
                </Toggle>
                <Toggle area-label="Toggle Stack" pressed={stackedBar} onPressedChange={handleToggleStack}>
                  <MdStackedBarChart className="h-4 w-4 text-slate-800" />
                </Toggle>
              </>
            )}
            {selChartType === "line" && (
              <>
                <Toggle area-label="Toggle Dots" pressed={dots} onPressedChange={handleToggleDots}>
                  <GoDotFill className="h-4 w-4 text-black" />
                </Toggle>
                <Toggle area-label="Toggle label line" pressed={labelLine} onPressedChange={handleToggleLabelLine}>
                  <Tag className="h-4 w-4 text-black" />
                </Toggle>
              </>
            )}
            {(selChartType === "line" || selChartType === "pie") && (
              <Toggle area-label="Toggle label line" pressed={labelLine} onPressedChange={handleToggleLabelLine}>
                <Tag className="h-4 w-4 text-black" />
              </Toggle>
            )}
            {selChartType === "pie" && (
              <Toggle area-label="Toggle donut" pressed={donut} onPressedChange={handleToggleDonut}>
                <PiChartDonut className="h-4 w-4 text-black" />
              </Toggle>
            )}
          </div>
          <div className="flex place-items-center gap-3 text-xs">
            <Input id="title" type="text" placeholder="Give Your Chart a Title" className="text-xs" onChange={(e) => setTitle(e.target.value)} />
            <div
              className="bg-yellow-400/30 p-2 w-6 h-6 rounded-full flex place-items-center place-content-center text-black cursor-pointer hover:bg-lychee_green/40 hover:text-slate-600"
              onClick={() => setTitleHidden(!titleHidden)}
            >
              {titleHidden ? <EyeOpenIcon className="w-3 h-3" /> : <EyeClosedIcon className="w-3 h-3" />}
            </div>
          </div>
          <div className="flex gap-2 place-items-center py-1">
            <Input id="subTitle" type="text" className="text-xs" placeholder="Add a Description" onChange={(e) => setSubTitle(e.target.value)} />
            <div
              className="bg-yellow-400/30 p-2 w-6 h-6 rounded-full flex place-items-center place-content-center text-black cursor-pointer hover:bg-lychee_green/40 hover:text-slate-600"
              onClick={() => setSubTitleHidden(!subTitleHidden)}
            >
              {subTitleHidden ? <EyeOpenIcon className="w-3 h-3" /> : <EyeClosedIcon className="w-3 h-3" />}
            </div>
          </div>
          <div className="flex gap-2 place-items-center py-1">
            <Input id="bodyHeading" type="text" className="text-xs" placeholder="Add a body Heading" onChange={(e) => setBodyHeading(e.target.value)} />
            <div
              className="bg-yellow-400/30 p-2 w-6 h-6 rounded-full flex place-items-center place-content-center text-black cursor-pointer hover:bg-lychee_green/40 hover:text-slate-600"
              onClick={() => setHeadingHidden(!bodyHeadingHidden)}
            >
              {bodyHeadingHidden ? <EyeOpenIcon className="w-3 h-3" /> : <EyeClosedIcon className="w-3 h-3" />}
            </div>
          </div>
          <div className="flex gap-2 place-items-center pb-10">
            <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Content</p>
            <Input id="BodyContent" type="text" className="text-xs" placeholder="Add a Description" onChange={(e) => setBodyContent(e.target.value)} />
            <div
              className="bg-yellow-400/30 p-2 w-6 h-6 rounded-full flex place-items-center place-content-center text-black cursor-pointer hover:bg-lychee_green/40 hover:text-slate-600"
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

