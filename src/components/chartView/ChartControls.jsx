"use client";

import Link from "next/link";
import { CaretRightIcon, EyeClosedIcon, EyeOpenIcon, IdCardIcon } from "@radix-ui/react-icons";
import { MinusCircle, Moon } from "react-feather";
import { IoPieChartOutline, IoShuffleOutline, IoStatsChart } from "react-icons/io5";
import { PiChartBarHorizontalLight, PiChartDonut, PiChartLine, PiChartLineThin } from "react-icons/pi";
import { MdOutlineAreaChart, MdStackedBarChart } from "react-icons/md";
import { GoDotFill } from "react-icons/go";
import { AiOutlineRadarChart } from "react-icons/ai";
import { CircleDot, Expand, Lightbulb, ArrowUp, ArrowDown, LogIn, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
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

export default function ChartControls({ variant = "panel" }) {
  const {
    demo,
    effectiveData,
    setViewing,
    dark,
    editHidden,
    setEditHidden,
    downloadChart,

    chartDataOverride,
    chartDataOverrideMeta,
    setChartDataOverride,
    setChartDataOverrideMeta,

    colorVisible,
    setColorVisible,

    selChartType,
    setSelChartType,
    useLiveline,
    setUseLiveline,

    selX,
    setSelX,
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

  const wrapperClassName =
    variant === "floating"
      ? `gradualEffect absolute right-10 rounded-xl flex flex-col ${dark ? "bg-slate-900/60" : "bg-white"} shadow-lg px-10 py-5 ${
          editHidden
            ? "bg-opacity-20 w-1/12 border-0 top-14 md:top-14"
            : "top-1/4 md:top-14 w-9/12 md:w-2/5 xl:w-1/4"
        }`
      : `gradualEffect rounded-xl flex flex-col ${dark ? "bg-slate-900/60" : "bg-white"} shadow-lg px-4 py-4 w-full border border-border`;

  return (
    <div className={wrapperClassName} style={{ zIndex: 20 }}>
      <div className="flex gap-1 place-items-center place-content-center py-2">
        {editHidden ? (
          <Toggle area-label="Toggle edit close" onClick={() => setEditHidden(false)} pressed={false} className="bg-slate-100/40 mr-10">
            <EyeOpenIcon />
          </Toggle>
        ) : (
          <Toggle area-label="Toggle edit open" onClick={() => setEditHidden(true)} pressed={false} className="bg-slate-100/40 mr-10">
            <EyeClosedIcon />
          </Toggle>
        )}
        <Toggle area-label="Toggle png" onClick={() => downloadChart("png")} pressed={false} className="bg-slate-100/40">
          <div className="text-[10px] text-slate-800">png</div>
        </Toggle>
        <Toggle area-label="Toggle svg" onClick={() => downloadChart("svg")} pressed={false} className="bg-slate-100/40">
          <div className="text-[10px] text-slate-800">svg</div>
        </Toggle>
        <Toggle area-label="Toggle jpg" onClick={() => downloadChart("jpg")} pressed={false} className="bg-slate-100/40">
          <div className="text-[10px] text-slate-800">jpeg</div>
        </Toggle>
      </div>
      {!editHidden && (
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
          {!colorVisible && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <ToggleGroup
                  variant="outline"
                  type="single"
                  area-label="Chart Type"
                  value={useLiveline ? "" : selChartType}
                  onValueChange={(value) => {
                    if (value) {
                      setSelChartType(value);
                      setUseLiveline(false);
                    }
                  }}
                >
                  <ToggleGroupItem value="area" aria-label="Toggle area">
                    <MdOutlineAreaChart className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="bar" aria-label="Toggle bar">
                    <IoStatsChart className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="line" aria-label="Toggle line">
                    <PiChartLine className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="pie" aria-label="Toggle pie">
                    <IoPieChartOutline className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="radar" aria-label="Toggle radar">
                    <AiOutlineRadarChart className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="scatter" aria-label="Toggle bubble (scatter)">
                    <CircleDot className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant={useLiveline ? "default" : "outline"} size="icon" type="button" onClick={() => setUseLiveline((v) => !v)}>
                        <span className="relative inline-flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Liveline chart
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Select your x-axis </p>
              <p className="text-xs text-muted-foreground" />
              <div className="py-2 text-black">
                <Select value={selX} onValueChange={(value) => setSelX(value)}>
                  <SelectTrigger>
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
                <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Select your y-axis</p>
                <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"} pt-2`}>Typically this should be something quantifiable (numerical)</p>
                {selY.length > 0 &&
                  selY.map((yValue, index) => (
                    <div className="py-1 flex place-items-center gap-2 text-black" key={index}>
                      <Select value={yValue} onValueChange={(val) => handleSelectY(val, index)}>
                        <SelectTrigger>
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
                  <div>
                    <Select onValueChange={(val) => handleSelectY(val)}>
                      <SelectTrigger>
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
              {/* Scatter/bubble: Z (bubble size) and Color column */}
              {selChartType === "scatter" && (
                <>
                  <div className="py-2">
                    <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Bubble size (Z)</p>
                    <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"}`}>Numeric column for bubble radius</p>
                    <Select value={selZ || ""} onValueChange={(v) => setSelZ(v || null)}>
                      <SelectTrigger className="mt-1">
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
                  <div className="py-2">
                    <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Color by</p>
                    <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"}`}>Optional column for point color</p>
                    <Select value={selColorCol ?? "__none__"} onValueChange={(v) => setSelColorCol(v === "__none__" ? null : v)}>
                      <SelectTrigger className="mt-1">
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
              {selChartType !== "pie" && selChartType !== "scatter" && (
                <button className="p-2 bg-black text-white rounded-md text-xs" onClick={() => handleSelectY(availableYOptions[0])} disabled={availableYOptions && availableYOptions.length === 0}>
                  {availableYOptions && availableYOptions.length === 0 ? "You have no more columns" : "+ Stack Another Value"}
                </button>
              )}
              {useLiveline && (
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
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <div className="space-y-1">
                      <p className={`text-[11px] ${dark ? "text-slate-300" : "text-muted-foreground"}`}>Badge variant</p>
                      <Select value={livelineBadgeVariant} onValueChange={(v) => setLivelineBadgeVariant(v)} disabled={!livelineBadge}>
                        <SelectTrigger className="h-8 text-xs">
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
                        <SelectTrigger className="h-8 text-xs">
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
                <div className="py-2 space-y-2">
                  <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"}`}>Filter by column</p>
                  <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"}`}>Plot only rows matching filter</p>
                  <Select
                    value={chartFilterColumn ?? "__none__"}
                    onValueChange={(v) => {
                      setChartFilterColumn(v === "__none__" ? null : v);
                      setChartFilterConfig({});
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
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
                        <SelectTrigger className="h-7 text-xs">
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
                </div>
              ) : null}
            </>
          )}
          <div className="py-2">
            <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Paletter</p>
            <div className="flex gap-3 place-items-center">
              <div className="flex text-xs rounded-md py-2 cursor-pointer" onClick={() => setColorVisible(true)}>
                {selectedPalette &&
                  selectedPalette.map((color) => <div key={color} className="p-3" style={{ backgroundColor: color }} />)}
              </div>
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
            <div className="py-2">
              <p className={`text-xs font-bold ${dark ? "text-slate-200" : "text-muted-foreground"} pt-2`}>Line Style</p>
              <p className={`text-xs ${dark ? "text-slate-300" : "text-muted-foreground"} pt-2`}>How do you want your line</p>
              <Select className="text-black" value={lineStyle} onValueChange={(value) => setLineStyle(value)}>
                <SelectTrigger className="text-black">
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
          <Link rel="noopener noreferrer" target="_blank" href="https://misterrpink.beehiiv.com/p/how-to-create-crarts-on-lychee">
            <div className="bottom-0 flex place-items-center place-content-center w-5/6 py-3 bg-slate-200/40 rounded-t-md hover:bg-slate-300/30">
              <div className="flex place-content-center gap-2 place-items-center text-center w-full">
                <small className="text-xs">
                  New? <span className="underline">Click</span> to get up to speed on MajicCharts in no time.
                </small>
                <CaretRightIcon />
              </div>
            </div>
          </Link>
        </>
      )}
    </div>
  );
}

