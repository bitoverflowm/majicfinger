"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Link2, Percent, Rows3 } from "lucide-react";
import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
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
import { chartSlotLabel } from "@/lib/chartSlotLabel";
import { CHART_WIDTH_PRESETS } from "@/lib/chartWidthPresets";
import { patchChartDashboardColumn } from "@/lib/patchChartDashboardColumn";
import { resolveFormatDockTarget } from "@/lib/formatDockResolve";
import { composerBottomDockChromeClass } from "@/lib/composerBottomDockChromeClass";
import {
  composerDockFixedZClass,
  composerDockPopoverContentZClass,
  composerDockTooltipContentClass,
} from "@/lib/composerDockLayers";
import { TextFormatDockStrip, textFormatDockSegmentClassName } from "@/components/dashboardComposer/TextFormatDockStrip";

const dockIconButtonClass = cn(
  buttonVariants({ variant: "ghost", size: "icon" }),
  "box-border aspect-square h-full w-full min-h-0 min-w-0 shrink-0 rounded-full p-0 [&_svg]:size-3.5",
);

const ROW_SPAN_OPTIONS = [
  { value: 1, label: "1 row" },
  { value: 2, label: "2 rows" },
  { value: 3, label: "3 rows" },
  { value: 4, label: "4 rows" },
];

/**
 * Bottom dock for the selected dashboard chart (chart picker, layout width / row span).
 * @param {{ editorInset: { left: number; width: number } | null }} props
 */
export function ChartComposerDock({ editorInset = null }) {
  const [chartPickOpen, setChartPickOpen] = useState(false);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const {
    chartComposerDock,
    setChartComposerDock,
    chartDashboardDraft,
    setChartDashboardDraft,
    savedCharts,
    setChartPickerEmphasis,
    pageFormatDockTarget,
    setPageFormatDockTarget,
  } = useMyStateV2();

  const chartOptions = useMemo(() => {
    const list = Array.isArray(savedCharts) ? savedCharts : [];
    return list.map((c) => ({ id: String(c._id), name: c.chart_name || "Chart" }));
  }, [savedCharts]);

  useEffect(() => {
    if (!chartComposerDock || !chartDashboardDraft) return;
    const { rowId, colId } = chartComposerDock;
    const rows = chartDashboardDraft.layout?.rows ?? [];
    const row = rows.find((r) => r.id === rowId);
    const ok = row?.type === "cards" && row.columns?.some((c) => c.id === colId);
    if (!ok) setChartComposerDock?.(null);
  }, [chartDashboardDraft?.layout, chartComposerDock, setChartComposerDock]);

  useEffect(() => {
    if (!chartComposerDock) return;
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
      setChartComposerDock?.(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [chartComposerDock, pageFormatDockTarget, setChartComposerDock, setPageFormatDockTarget]);

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

  if (!chartComposerDock || !chartDashboardDraft || !column) return null;

  const barPositionStyle = editorInset
    ? { position: "fixed", left: editorInset.left, width: editorInset.width, bottom: 24 }
    : { position: "fixed", left: 0, right: 0, bottom: 24 };

  const dockLabel = chartSlotLabel(
    chartDashboardDraft.layout,
    chartComposerDock.rowId,
    chartComposerDock.colId,
  );

  const { rowId, colId } = chartComposerDock;
  const colSpan = Math.min(12, Math.max(1, column.colSpan ?? 12));
  const rowSpan = Math.min(4, Math.max(1, column.rowSpan ?? 1));
  const widthIsPreset = CHART_WIDTH_PRESETS.some((p) => p.colSpan === colSpan);
  const chartIdStr = column.chart_id ? String(column.chart_id) : "";
  const linkMode = column.link?.mode || "none";

  const patch = (partial) =>
    patchChartDashboardColumn(setChartDashboardDraft, rowId, colId, partial);

  const toolbarAriaLabel = textFormatExtension
    ? `${dockLabel} layout and ${textFormatExtension.dockLabel.toLowerCase()} formatting`
    : `${dockLabel} layout`;

  return (
    <div
      className={cn("pointer-events-auto flex justify-center overflow-visible px-4", composerDockFixedZClass)}
      style={barPositionStyle}
      onMouseDown={(e) => e.preventDefault()}
      role="toolbar"
      aria-label={toolbarAriaLabel}
    >
      <div className="flex max-w-full justify-center overflow-visible">
        <div className="inline-flex max-w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto overflow-y-visible overscroll-x-contain">
          <div className={composerBottomDockChromeClass}>
            <span className="shrink-0 select-none self-center text-sm font-medium text-muted-foreground">
              {dockLabel}
            </span>
            <TooltipProvider delayDuration={200}>
              <Dock
                direction="bottom"
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

              <Separator orientation="vertical" className="h-8 w-px shrink-0 self-center" />

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

              <Separator orientation="vertical" className="h-8 w-px shrink-0 self-center" />

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

              <Separator orientation="vertical" className="h-8 w-px shrink-0 self-center" />

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
                <Separator orientation="vertical" className="h-8 w-px shrink-0 self-center" />
                <span className="shrink-0 select-none self-center text-sm font-medium text-muted-foreground">
                  {textFormatExtension.dockLabel}
                </span>
                <TextFormatDockStrip
                  pt={textFormatExtension.pt}
                  patchPartial={textFormatExtension.patchPartial}
                />
              </>
            ) : null}
          </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
