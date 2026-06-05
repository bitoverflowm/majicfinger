"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, LayoutGrid, Link2, Percent, Plus, Rows3, Table2 } from "lucide-react";
import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dock, DockIcon } from "@/components/ui/dock";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { clampChartCardRowSpan } from "@/lib/dashboardLayoutDefaults";
import { chartSlotLabel } from "@/lib/chartSlotLabel";
import { CHART_WIDTH_PRESETS } from "@/lib/chartWidthPresets";
import { patchChartDashboardColumn } from "@/lib/patchChartDashboardColumn";
import { mapSavedChartsToPickerOptions } from "@/lib/dashboardChartPickerLabels";
import { resolveFormatDockTarget } from "@/lib/formatDockResolve";
import {
  isPageFormatDockChartHeadingTarget,
  isPageFormatDockChartMicrotextTarget,
  isPageFormatDockChartSubheadingTarget,
} from "@/lib/chartCardTextTheme";
import { composerBottomDockChromeClass } from "@/lib/composerBottomDockChromeClass";
import {
  composerDockFixedZClass,
  composerDockPopoverContentZClass,
  composerDockTooltipContentClass,
} from "@/lib/composerDockLayers";
import { TextFormatDockStrip, textFormatDockSegmentClassName } from "@/components/dashboardComposer/TextFormatDockStrip";
import {
  CARD_GRID_FIELD_SLOTS,
  CARD_GRID_ROW_LIMIT_OPTIONS,
  getSheetColumnNames,
} from "@/lib/dashboardCardGrid";
import {
  patchDashboardCardGridField,
  patchDashboardCardGridRowLimit,
  patchDashboardCardGridSheet,
} from "@/lib/patchDashboardCardGrid";
import { Switch } from "@/components/ui/switch";

const dockIconButtonClass = cn(
  buttonVariants({ variant: "ghost", size: "icon" }),
  "box-border aspect-square h-full w-full min-h-0 min-w-0 shrink-0 rounded-full p-0 [&_svg]:size-3.5",
);

const ROW_SPAN_OPTIONS = [
  { value: 1, label: "1 row" },
  { value: 2, label: "2 rows" },
  { value: 3, label: "3 rows" },
  { value: 4, label: "4 rows" },
  { value: 5, label: "5 rows" },
];

/**
 * Persistent bottom dock: Add Chart / Add Text, then page title formatting or chart-slot tools
 * when something relevant is selected.
 * @param {{ editorInset: { left: number; width: number } | null }} props
 */
export function ChartComposerDock({ editorInset = null }) {
  const [chartPickOpen, setChartPickOpen] = useState(false);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [textBlockMenuOpen, setTextBlockMenuOpen] = useState(false);
  const [cardFieldsOpen, setCardFieldsOpen] = useState(false);
  const {
    chartComposerDock,
    setChartComposerDock,
    cardGridComposerDock,
    setCardGridComposerDock,
    chartDashboardDraft,
    setChartDashboardDraft,
    savedCharts,
    savedDataSets,
    loadedDataMeta,
    dataSheets,
    setChartPickerEmphasis,
    pageFormatDockTarget,
    setPageFormatDockTarget,
    dashboardComposerLayoutActions,
  } = useMyStateV2();

  const chartOptions = useMemo(
    () => mapSavedChartsToPickerOptions(savedCharts, savedDataSets, loadedDataMeta),
    [savedCharts, savedDataSets, loadedDataMeta],
  );

  const isChartTextTarget =
    isPageFormatDockChartHeadingTarget(pageFormatDockTarget) ||
    isPageFormatDockChartSubheadingTarget(pageFormatDockTarget) ||
    isPageFormatDockChartMicrotextTarget(pageFormatDockTarget);

  const isCardGridTextTarget =
    pageFormatDockTarget &&
    typeof pageFormatDockTarget === "object" &&
    (pageFormatDockTarget.type === "cardGridSectionHeading" ||
      pageFormatDockTarget.type === "cardGridSectionSubheading" ||
      pageFormatDockTarget.type === "cardGridField");

  const pageFormatResolved = useMemo(() => {
    if (isChartTextTarget) return null;
    return resolveFormatDockTarget(pageFormatDockTarget, chartDashboardDraft, setChartDashboardDraft);
  }, [isChartTextTarget, pageFormatDockTarget, chartDashboardDraft, setChartDashboardDraft]);

  const showPageExtension = Boolean(
    !isChartTextTarget &&
      !isCardGridTextTarget &&
      pageFormatDockTarget &&
      chartDashboardDraft &&
      pageFormatResolved &&
      pageFormatResolved.pt,
  );

  useEffect(() => {
    if (!chartComposerDock || !chartDashboardDraft) return;
    const { rowId, colId } = chartComposerDock;
    const rows = chartDashboardDraft.layout?.rows ?? [];
    const row = rows.find((r) => r.id === rowId);
    const ok = row?.type === "cards" && row.columns?.some((c) => c.id === colId);
    if (!ok) setChartComposerDock?.(null);
  }, [chartDashboardDraft?.layout, chartComposerDock, setChartComposerDock]);

  useEffect(() => {
    if (!cardGridComposerDock || !chartDashboardDraft) return;
    const { rowId } = cardGridComposerDock;
    const rows = chartDashboardDraft.layout?.rows ?? [];
    const row = rows.find((r) => r.id === rowId);
    if (row?.type !== "cardGrid") setCardGridComposerDock?.(null);
  }, [cardGridComposerDock, chartDashboardDraft, setCardGridComposerDock]);

  useEffect(() => {
    if (!chartDashboardDraft || !dashboardComposerLayoutActions) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const fmt = pageFormatDockTarget;
      if (
        fmt &&
        typeof fmt === "object" &&
        (fmt.type === "chartHeading" ||
          fmt.type === "chartSubheading" ||
          fmt.type === "chartMicrotext")
      ) {
        setPageFormatDockTarget?.(null);
        return;
      }
      if (
        fmt &&
        typeof fmt === "object" &&
        (fmt.type === "freeTextHeading" || fmt.type === "freeTextParagraph")
      ) {
        setPageFormatDockTarget?.(null);
        return;
      }
      if (
        fmt &&
        typeof fmt === "object" &&
        (fmt.type === "cardGridSectionHeading" ||
          fmt.type === "cardGridSectionSubheading" ||
          fmt.type === "cardGridField")
      ) {
        setPageFormatDockTarget?.(null);
        return;
      }
      if (fmt === "pageTitle" || fmt === "pageSubheading") {
        setPageFormatDockTarget?.(null);
        return;
      }
      if (chartComposerDock) {
        setChartComposerDock?.(null);
      }
      if (cardGridComposerDock) {
        setCardGridComposerDock?.(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [
    cardGridComposerDock,
    chartComposerDock,
    chartDashboardDraft,
    dashboardComposerLayoutActions,
    pageFormatDockTarget,
    setCardGridComposerDock,
    setChartComposerDock,
    setPageFormatDockTarget,
  ]);

  useEffect(() => {
    setChartPickOpen(false);
    setLinkPopoverOpen(false);
  }, [chartComposerDock?.rowId, chartComposerDock?.colId]);

  const column = useMemo(() => {
    if (!chartComposerDock || !chartDashboardDraft) return null;
    const rows = chartDashboardDraft.layout?.rows ?? [];
    const row = rows.find((r) => r.id === chartComposerDock.rowId);
    if (row?.type !== "cards" || !Array.isArray(row.columns)) return null;
    return row.columns.find((c) => c.id === chartComposerDock.colId) ?? null;
  }, [chartComposerDock, chartDashboardDraft]);

  const showChartExtension = Boolean(chartComposerDock && column);

  const cardGridRow = useMemo(() => {
    if (!cardGridComposerDock || !chartDashboardDraft) return null;
    const rows = chartDashboardDraft.layout?.rows ?? [];
    return rows.find((r) => r.id === cardGridComposerDock.rowId && r.type === "cardGrid") ?? null;
  }, [cardGridComposerDock, chartDashboardDraft]);

  const showCardGridExtension = Boolean(cardGridComposerDock && cardGridRow);

  const sheetOptions = useMemo(() => {
    const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
    return Object.entries(sheets).map(([id, sheet]) => ({
      id,
      name: sheet?.name || id,
    }));
  }, [dataSheets]);

  const cardGridSheet = useMemo(() => {
    if (!cardGridRow?.sheetId || !dataSheets) return null;
    return dataSheets[cardGridRow.sheetId] ?? null;
  }, [cardGridRow?.sheetId, dataSheets]);

  const cardGridColumns = useMemo(() => {
    const rows = Array.isArray(cardGridSheet?.data) ? cardGridSheet.data : [];
    return getSheetColumnNames(cardGridSheet, rows);
  }, [cardGridSheet]);

  const textFormatExtension = useMemo(() => {
    if (!chartComposerDock || !chartDashboardDraft) return null;
    const { rowId, colId } = chartComposerDock;
    const t = pageFormatDockTarget;
    if (!t || typeof t !== "object") return null;
    if (
      t.type !== "chartHeading" &&
      t.type !== "chartSubheading" &&
      t.type !== "chartMicrotext"
    ) {
      return null;
    }
    if (t.rowId !== rowId || t.colId !== colId) return null;
    return resolveFormatDockTarget(t, chartDashboardDraft, setChartDashboardDraft);
  }, [chartComposerDock, chartDashboardDraft, pageFormatDockTarget, setChartDashboardDraft]);

  const cardGridTextFormatExtension = useMemo(() => {
    if (!cardGridComposerDock || !chartDashboardDraft) return null;
    const t = pageFormatDockTarget;
    if (!t || typeof t !== "object" || !isCardGridTextTarget) return null;
    if (t.rowId !== cardGridComposerDock.rowId) return null;
    return resolveFormatDockTarget(t, chartDashboardDraft, setChartDashboardDraft);
  }, [cardGridComposerDock, chartDashboardDraft, isCardGridTextTarget, pageFormatDockTarget, setChartDashboardDraft]);

  if (!chartDashboardDraft) {
    return null;
  }
  const layoutActions = dashboardComposerLayoutActions;

  const barPositionStyle = editorInset
    ? { position: "fixed", left: editorInset.left, width: editorInset.width, bottom: 24 }
    : { position: "fixed", left: 0, right: 0, bottom: 24 };

  const dockLabel =
    showChartExtension && chartComposerDock
      ? chartSlotLabel(chartDashboardDraft.layout, chartComposerDock.rowId, chartComposerDock.colId)
      : "";

  const rowId = chartComposerDock?.rowId;
  const colId = chartComposerDock?.colId;
  const colSpan = column ? Math.min(12, Math.max(1, column.colSpan ?? 12)) : 12;
  const rowSpan = column ? clampChartCardRowSpan(column.rowSpan) : clampChartCardRowSpan(null);
  const widthIsPreset = CHART_WIDTH_PRESETS.some((p) => p.colSpan === colSpan);
  const chartIdStr = column?.chart_id ? String(column.chart_id) : "";
  const linkMode = column?.link?.mode || "none";

  const patch =
    column && rowId && colId
      ? (partial) => patchChartDashboardColumn(setChartDashboardDraft, rowId, colId, partial)
      : () => {};

  const cardGridRowId = cardGridComposerDock?.rowId;

  const toolbarAriaLabel = showPageExtension
    ? pageFormatResolved?.ariaLabel ?? "Title formatting"
    : showCardGridExtension
      ? cardGridTextFormatExtension
        ? `Card grid and ${cardGridTextFormatExtension.dockLabel.toLowerCase()} formatting`
        : "Card grid layout"
      : showChartExtension
        ? textFormatExtension
          ? `${dockLabel} layout and ${textFormatExtension.dockLabel.toLowerCase()} formatting`
          : `${dockLabel} layout`
        : "Dashboard composer";

  const FIELD_LABELS = {
    rank: "Row number",
    image: "Image",
    header: "Header",
    subheader: "Subheader",
    tags: "Tags",
    value: "Value",
  };

  return (
    <div
      className={cn("pointer-events-auto flex justify-center overflow-visible px-4", composerDockFixedZClass)}
      style={barPositionStyle}
      onMouseDown={(e) => e.preventDefault()}
      role="toolbar"
      aria-label={toolbarAriaLabel}
    >
      <div className="flex max-w-full justify-center overflow-visible">
        <div className="inline-flex max-w-full min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto overflow-y-visible overscroll-x-contain">
          <div className={composerBottomDockChromeClass}>
            <TooltipProvider delayDuration={200}>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 shrink-0 gap-1 px-2 text-[11px] font-medium leading-none [&_svg]:size-3"
                aria-label="Add chart"
                disabled={!layoutActions}
                onClick={() => layoutActions?.addChart()}
              >
                <Plus className="shrink-0" aria-hidden />
                Chart
              </Button>
              <Popover open={textBlockMenuOpen} onOpenChange={setTextBlockMenuOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 gap-1 px-2 text-[11px] font-medium leading-none [&_svg]:size-3"
                    aria-label="Insert text block"
                    disabled={!layoutActions}
                  >
                    <Plus className="shrink-0" aria-hidden />
                    Text
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className={cn(composerDockPopoverContentZClass, "w-48 p-2")}
                  align="start"
                  side="top"
                >
                  <p className="mb-1.5 px-1 text-[11px] font-medium text-muted-foreground">
                    Text block
                  </p>
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      className="rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        layoutActions?.addText("heading");
                        setTextBlockMenuOpen(false);
                      }}
                    >
                      Heading
                    </button>
                    <button
                      type="button"
                      className="rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        layoutActions?.addText("paragraph");
                        setTextBlockMenuOpen(false);
                      }}
                    >
                      Paragraph
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 shrink-0 gap-1 px-2 text-[11px] font-medium leading-none [&_svg]:size-3"
                aria-label="Add cards"
                disabled={!layoutActions}
                onClick={() => layoutActions?.addCards?.()}
              >
                <Plus className="shrink-0" aria-hidden />
                Cards
              </Button>

              {showPageExtension ? (
                <>
                  <Separator orientation="vertical" className="h-6 w-px shrink-0 self-center" />
                  <span className="shrink-0 select-none self-center text-[11px] font-medium text-muted-foreground">
                    {pageFormatResolved.dockLabel ?? "Title"}
                  </span>
                  <TextFormatDockStrip
                    pt={pageFormatResolved.pt}
                    patchPartial={pageFormatResolved.patchPartial}
                  />
                </>
              ) : showChartExtension && column ? (
                <>
                  <Separator orientation="vertical" className="h-6 w-px shrink-0 self-center" />
                  <span className="shrink-0 select-none self-center text-[11px] font-medium text-muted-foreground">
                    {dockLabel}
                  </span>
                  <Dock
                    direction="middle"
                    iconSize={36}
                    iconMagnification={46}
                    iconDistance={110}
                    className={textFormatDockSegmentClassName}
                  >
                    <DockIcon>
                      <Popover open={chartPickOpen} onOpenChange={setChartPickOpen}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                aria-label="Pick chart"
                                className={cn(
                                  dockIconButtonClass,
                                  chartIdStr && "bg-slate-200 dark:bg-slate-700",
                                )}
                              >
                                <BarChart3 className="size-3.5" />
                              </button>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top" className={composerDockTooltipContentClass}>
                            Pick chart
                          </TooltipContent>
                        </Tooltip>
                        <PopoverContent
                          className={cn(
                            composerDockPopoverContentZClass,
                            "max-h-72 w-56 overflow-y-auto p-2",
                          )}
                          align="center"
                          side="top"
                        >
                          <p className="mb-1.5 px-1 text-[11px] font-medium text-muted-foreground">
                            Chart
                          </p>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              className={cn(
                                "rounded px-2 py-1.5 text-left text-sm hover:bg-muted",
                                !chartIdStr && "bg-muted font-medium",
                              )}
                              onClick={() => {
                                patch({ chart_id: null });
                                setChartPickOpen(false);
                              }}
                            >
                              None
                            </button>
                            {chartOptions.map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                className={cn(
                                  "rounded px-2 py-1.5 text-left text-sm hover:bg-muted",
                                  chartIdStr === opt.id && "bg-muted font-medium",
                                )}
                                onClick={() => {
                                  patch({ chart_id: opt.id });
                                  setChartPickerEmphasis?.(null);
                                  setChartPickOpen(false);
                                }}
                              >
                                {opt.name}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </DockIcon>

                    <Separator orientation="vertical" className="h-6 w-px shrink-0 self-center" />

                    <DockIcon>
                      <Popover>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                aria-label="Width"
                                className={cn(
                                  dockIconButtonClass,
                                  widthIsPreset && "bg-slate-200 dark:bg-slate-700",
                                )}
                              >
                                <Percent className="size-3.5" />
                              </button>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top" className={composerDockTooltipContentClass}>
                            Width
                          </TooltipContent>
                        </Tooltip>
                        <PopoverContent
                          className={cn(composerDockPopoverContentZClass, "w-44 p-2")}
                          align="center"
                          side="top"
                        >
                          <p className="mb-1.5 px-1 text-[11px] font-medium text-muted-foreground">
                            Width (page)
                          </p>
                          <div className="flex flex-col gap-0.5">
                            {CHART_WIDTH_PRESETS.map((opt) => (
                              <button
                                key={opt.colSpan}
                                type="button"
                                className={cn(
                                  "rounded px-2 py-1.5 text-left text-sm hover:bg-muted",
                                  colSpan === opt.colSpan && "bg-muted font-medium",
                                )}
                                onClick={() => patch({ colSpan: opt.colSpan })}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </DockIcon>

                    <Separator orientation="vertical" className="h-6 w-px shrink-0 self-center" />

                    <DockIcon>
                      <Popover>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <button type="button" aria-label="Row span" className={dockIconButtonClass}>
                                <Rows3 className="size-3.5" />
                              </button>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top" className={composerDockTooltipContentClass}>
                            Row span
                          </TooltipContent>
                        </Tooltip>
                        <PopoverContent
                          className={cn(composerDockPopoverContentZClass, "w-44 p-2")}
                          align="center"
                          side="top"
                        >
                          <p className="mb-1.5 px-1 text-[11px] font-medium text-muted-foreground">
                            Row span
                          </p>
                          <div className="flex flex-col gap-0.5">
                            {ROW_SPAN_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={cn(
                                  "rounded px-2 py-1.5 text-left text-sm hover:bg-muted",
                                  rowSpan === opt.value && "bg-muted font-medium",
                                )}
                                onClick={() => patch({ rowSpan: opt.value })}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </DockIcon>

                    <Separator orientation="vertical" className="h-6 w-px shrink-0 self-center" />

                    <DockIcon>
                      <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                aria-label="Card link"
                                className={cn(
                                  dockIconButtonClass,
                                  linkMode !== "none" && "bg-slate-200 dark:bg-slate-700",
                                )}
                              >
                                <Link2 className="size-3.5" />
                              </button>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top" className={composerDockTooltipContentClass}>
                            Card link
                          </TooltipContent>
                        </Tooltip>
                        <PopoverContent
                          className={cn(composerDockPopoverContentZClass, "w-72 p-3")}
                          align="center"
                          side="top"
                        >
                          <div className="grid gap-2">
                            <Label className="text-xs font-medium text-muted-foreground">Link</Label>
                            <Select
                              value={linkMode}
                              onValueChange={(v) =>
                                patch({
                                  link: { mode: v, url: column.link?.url || "" },
                                })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className={composerDockPopoverContentZClass}>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="chart_public">Published chart page</SelectItem>
                                <SelectItem value="custom">Custom URL</SelectItem>
                              </SelectContent>
                            </Select>
                            {linkMode === "custom" ? (
                              <Input
                                className="h-8 text-xs"
                                placeholder="https://…"
                                value={column.link?.url || ""}
                                onChange={(e) =>
                                  patch({
                                    link: {
                                      mode: "custom",
                                      url: e.target.value,
                                    },
                                  })
                                }
                              />
                            ) : null}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </DockIcon>
                  </Dock>
                  {textFormatExtension ? (
                    <>
                      <Separator orientation="vertical" className="h-6 w-px shrink-0 self-center" />
                      <span className="shrink-0 select-none self-center text-[11px] font-medium text-muted-foreground">
                        {textFormatExtension.dockLabel}
                      </span>
                      <TextFormatDockStrip
                        pt={textFormatExtension.pt}
                        patchPartial={textFormatExtension.patchPartial}
                      />
                    </>
                  ) : null}
                </>
              ) : showCardGridExtension && cardGridRow ? (
                <>
                  <Separator orientation="vertical" className="h-6 w-px shrink-0 self-center" />
                  <span className="shrink-0 select-none self-center text-[11px] font-medium text-muted-foreground">
                    Cards
                  </span>
                  <Dock
                    direction="middle"
                    iconSize={36}
                    iconMagnification={46}
                    iconDistance={110}
                    className={textFormatDockSegmentClassName}
                  >
                    <DockIcon>
                      <Popover>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                aria-label="Pick table"
                                className={cn(
                                  dockIconButtonClass,
                                  cardGridRow.sheetId && "bg-slate-200 dark:bg-slate-700",
                                )}
                              >
                                <Table2 className="size-3.5" />
                              </button>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top" className={composerDockTooltipContentClass}>
                            Table
                          </TooltipContent>
                        </Tooltip>
                        <PopoverContent
                          className={cn(composerDockPopoverContentZClass, "max-h-72 w-56 overflow-y-auto p-2")}
                          align="center"
                          side="top"
                        >
                          <p className="mb-1.5 px-1 text-[11px] font-medium text-muted-foreground">
                            Data table
                          </p>
                          <div className="flex flex-col gap-0.5">
                            {sheetOptions.length === 0 ? (
                              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                                No tables in the linked project
                              </p>
                            ) : (
                              sheetOptions.map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  className={cn(
                                    "rounded px-2 py-1.5 text-left text-sm hover:bg-muted",
                                    String(cardGridRow.sheetId) === opt.id && "bg-muted font-medium",
                                  )}
                                  onClick={() => {
                                    if (!cardGridRowId) return;
                                    patchDashboardCardGridSheet(
                                      setChartDashboardDraft,
                                      cardGridRowId,
                                      opt.id,
                                      dataSheets?.[opt.id],
                                    );
                                  }}
                                >
                                  {opt.name}
                                </button>
                              ))
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </DockIcon>

                    <Separator orientation="vertical" className="h-6 w-px shrink-0 self-center" />

                    <DockIcon>
                      <Popover>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <button type="button" aria-label="Row count" className={dockIconButtonClass}>
                                <LayoutGrid className="size-3.5" />
                              </button>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top" className={composerDockTooltipContentClass}>
                            Rows to show
                          </TooltipContent>
                        </Tooltip>
                        <PopoverContent
                          className={cn(composerDockPopoverContentZClass, "w-44 p-2")}
                          align="center"
                          side="top"
                        >
                          <p className="mb-1.5 px-1 text-[11px] font-medium text-muted-foreground">
                            Data rows
                          </p>
                          <div className="flex flex-col gap-0.5">
                            {CARD_GRID_ROW_LIMIT_OPTIONS.map((n) => (
                              <button
                                key={n}
                                type="button"
                                className={cn(
                                  "rounded px-2 py-1.5 text-left text-sm hover:bg-muted",
                                  (cardGridRow.rowLimit ?? 8) === n && "bg-muted font-medium",
                                )}
                                onClick={() => {
                                  if (!cardGridRowId) return;
                                  patchDashboardCardGridRowLimit(
                                    setChartDashboardDraft,
                                    cardGridRowId,
                                    n,
                                  );
                                }}
                              >
                                {n} cards ({n / 4} rows)
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </DockIcon>

                    <Separator orientation="vertical" className="h-6 w-px shrink-0 self-center" />

                    <DockIcon>
                      <Popover open={cardFieldsOpen} onOpenChange={setCardFieldsOpen}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <button type="button" aria-label="Card fields" className={dockIconButtonClass}>
                                <Rows3 className="size-3.5" />
                              </button>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top" className={composerDockTooltipContentClass}>
                            Card fields
                          </TooltipContent>
                        </Tooltip>
                        <PopoverContent
                          className={cn(composerDockPopoverContentZClass, "w-80 max-h-80 overflow-y-auto p-3")}
                          align="center"
                          side="top"
                        >
                          <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                            Map columns to card fields
                          </p>
                          <div className="grid gap-3">
                            {CARD_GRID_FIELD_SLOTS.map((slot) => {
                              const mapping = cardGridRow.fields?.[slot] || {};
                              const visible = mapping.visible !== false;
                              return (
                                <div key={slot} className="grid gap-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <Label className="text-xs font-medium">
                                      {FIELD_LABELS[slot] || slot}
                                    </Label>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-muted-foreground">Show</span>
                                      <Switch
                                        checked={visible}
                                        onCheckedChange={(checked) => {
                                          if (!cardGridRowId) return;
                                          patchDashboardCardGridField(
                                            setChartDashboardDraft,
                                            cardGridRowId,
                                            slot,
                                            { visible: checked },
                                          );
                                        }}
                                        aria-label={`Show ${FIELD_LABELS[slot]}`}
                                      />
                                    </div>
                                  </div>
                                  {slot !== "rank" ? (
                                    <Select
                                      value={mapping.column || "__none__"}
                                      onValueChange={(v) => {
                                        if (!cardGridRowId) return;
                                        patchDashboardCardGridField(
                                          setChartDashboardDraft,
                                          cardGridRowId,
                                          slot,
                                          { column: v === "__none__" ? null : v },
                                        );
                                      }}
                                      disabled={!cardGridColumns.length}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Column" />
                                      </SelectTrigger>
                                      <SelectContent className={composerDockPopoverContentZClass}>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {cardGridColumns.map((col) => (
                                          <SelectItem key={col} value={col}>
                                            {col}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </DockIcon>
                  </Dock>
                  {cardGridTextFormatExtension ? (
                    <>
                      <Separator orientation="vertical" className="h-6 w-px shrink-0 self-center" />
                      <span className="shrink-0 select-none self-center text-[11px] font-medium text-muted-foreground">
                        {cardGridTextFormatExtension.dockLabel}
                      </span>
                      <TextFormatDockStrip
                        pt={cardGridTextFormatExtension.pt}
                        patchPartial={cardGridTextFormatExtension.patchPartial}
                      />
                    </>
                  ) : null}
                </>
              ) : null}
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
