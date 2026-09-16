"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Columns2, GitMerge, GripVertical, Plus, X } from "lucide-react";

import { HubKalshiLiveDemoTradesLiveline } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTradesLiveline";
import { MarketHeatmap } from "@/components/spectrumui/charts/market-heatmap";
import { ChartSkeleton } from "@/components/spectrumui/charts/chart-engine";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { AgentSteps } from "./AiGenerating";
import {
  AreaSummaryChart,
  BoxResizeHandles,
  DepthChart,
  IndicatorChart,
  MarketCandlesChart,
  OrderBookLadder,
  PortfolioDonut,
} from "./charts";
import { fetchHolderPositions, livelineSeriesFromState } from "./fetchDashboardLive";
import { CompareSummaryTable, DashboardStatCards } from "./statCards";
import {
  DASHBOARD_INTERVALS,
  DEFAULT_WIDGETS,
  KALSHI_GREEN,
  MERGED_LIVELINE_HEIGHT,
  POLYMARKET_BLUE,
  SPLIT_LIVELINE_HEIGHT,
  type DashboardIntervalId,
  type DashboardLiveState,
  type DashboardPair,
  type DashboardWidget,
  type HolderRow,
} from "./types";

function shortTitle(value: string, max = 28) {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function formatMoney(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatPct(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}¢`;
}

function holderName(row: HolderRow) {
  return row.name || row.pseudonym || `${row.proxyWallet.slice(0, 6)}…${row.proxyWallet.slice(-4)}`;
}

function widgetType(widget: DashboardWidget) {
  return widget.type || (widget.id as DashboardWidget["type"]);
}

function widgetVenue(widget: DashboardWidget): NonNullable<DashboardWidget["venue"]> {
  if (widget.venue) return widget.venue;
  if (widget.id === "liveline-kalshi") return "kalshi";
  if (widget.id === "liveline-poly") return "poly";
  return "both";
}

function widgetLayout(widget: DashboardWidget): DashboardWidget["layout"] {
  if (widget.layout) return widget.layout;
  const type = widgetType(widget);
  if (type === "liveline" || type === "market-candles" || type === "stats" || type === "summary") return "full";
  return "half";
}

function widgetBoxStyle(widget: DashboardWidget): CSSProperties {
  const layout = widgetLayout(widget);
  const mergedDefault =
    widgetType(widget) === "liveline" &&
    widgetVenue(widget) === "both" &&
    layout !== "custom" &&
    widget.height < MERGED_LIVELINE_HEIGHT;
  const height = mergedDefault ? MERGED_LIVELINE_HEIGHT : widget.height;
  if (layout === "custom") {
    return { width: widget.width, height, maxWidth: "100%", flex: "0 0 auto" };
  }
  if (layout === "full") {
    return { width: "100%", height, flex: "1 0 100%" };
  }
  return {
    width: "calc((100% - 1rem) / 2)",
    minWidth: 240,
    maxWidth: "100%",
    height,
    flex: "1 1 calc((100% - 1rem) / 2)",
  };
}

function filterRowsByInterval(
  rows: Record<string, unknown>[],
  interval: DashboardIntervalId,
): Record<string, unknown>[] {
  const spec = DASHBOARD_INTERVALS.find((item) => item.id === interval);
  if (!spec?.ms) return rows;
  const cutoff = Date.now() - spec.ms;
  return rows.filter((row) => {
    const ts = Date.parse(String(row.created_time || row.time || ""));
    return Number.isFinite(ts) && ts >= cutoff;
  });
}

function splitLivelineWidgets(widgets: DashboardWidget[]): DashboardWidget[] {
  const index = widgets.findIndex((item) => widgetType(item) === "liveline" && widgetVenue(item) === "both");
  if (index < 0) return widgets;
  const base = widgets[index]!;
  const height = Math.max(SPLIT_LIVELINE_HEIGHT, Math.round(base.height * 0.72));
  const kalshi: DashboardWidget = {
    id: "liveline-kalshi",
    type: "liveline",
    title: "Live YES · Kalshi",
    description: "Kalshi prints on their own tape.",
    layout: "half",
    width: 0,
    height,
    venue: "kalshi",
  };
  const poly: DashboardWidget = {
    id: "liveline-poly",
    type: "liveline",
    title: "Live YES · Polymarket",
    description: "Polymarket prints on their own tape.",
    layout: "half",
    width: 0,
    height,
    venue: "poly",
  };
  const next = [...widgets];
  next.splice(index, 1, kalshi, poly);
  return next;
}

function mergeLivelineWidgets(widgets: DashboardWidget[]): DashboardWidget[] {
  const lines = widgets.filter((item) => widgetType(item) === "liveline");
  if (!lines.length) return widgets;
  const venues = new Set(lines.map((item) => widgetVenue(item)));
  const venue: DashboardWidget["venue"] =
    venues.has("kalshi") && venues.has("poly")
      ? "both"
      : venues.has("both")
        ? "both"
        : venues.has("poly")
          ? "poly"
          : "kalshi";
  const merged: DashboardWidget = {
    id: "liveline",
    type: "liveline",
    title: venue === "both" ? "Live YES overlay" : venue === "kalshi" ? "Live YES · Kalshi" : "Live YES · Polymarket",
    description:
      venue === "both"
        ? "Kalshi and Polymarket prints on one tape."
        : "Live YES prints on one tape.",
    layout: "full",
    width: 0,
    height: Math.max(MERGED_LIVELINE_HEIGHT, ...lines.map((item) => item.height)),
    venue,
  };
  const next: DashboardWidget[] = [];
  let inserted = false;
  for (const item of widgets) {
    if (widgetType(item) === "liveline") {
      if (!inserted) {
        next.push(merged);
        inserted = true;
      }
      continue;
    }
    next.push(item);
  }
  return next;
}

export function DashboardBoard({
  pair,
  state,
  generating,
  onUpgrade,
}: {
  pair: DashboardPair;
  state: DashboardLiveState;
  generating: boolean;
  onUpgrade: () => void;
}) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS);
  const [addOpen, setAddOpen] = useState(false);
  const [holder, setHolder] = useState<HolderRow | null>(null);
  const [portfolio, setPortfolio] = useState<Record<string, unknown>[] | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [venue, setVenue] = useState<"kalshi" | "poly">("kalshi");
  const [interval, setInterval] = useState<DashboardIntervalId>("1d");

  const tabLabel = `${shortTitle(pair.kalshiTitle, 22)} vs ${shortTitle(pair.polyTitle, 22)}`;
  const live = livelineSeriesFromState(state);
  const livelineMerged = widgets.some(
    (item) => widgetType(item) === "liveline" && widgetVenue(item) === "both",
  );
  const livelineCount = widgets.filter((item) => widgetType(item) === "liveline").length;
  const filteredLive = useMemo(
    () => ({
      kalshi: filterRowsByInterval(live.kalshi, interval),
      poly: filterRowsByInterval(live.poly, interval),
    }),
    [interval, live.kalshi, live.poly],
  );
  const historyAsPoints = useMemo(
    () =>
      state.polyHistory.map((point) => ({
        created_time: new Date(point.t).toISOString(),
        yes_price_dollars: point.v / 100,
        price: point.v / 100,
      })),
    [state.polyHistory],
  );

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const next = [...widgets];
    const [moved] = next.splice(result.source.index, 1);
    if (!moved) return;
    next.splice(result.destination.index, 0, moved);
    setWidgets(next);
  };

  const openHolder = async (row: HolderRow) => {
    setHolder(row);
    setPortfolio(null);
    setPortfolioLoading(true);
    try {
      const ac = new AbortController();
      const positions = await fetchHolderPositions(row.proxyWallet, ac.signal);
      setPortfolio(positions);
    } catch {
      setPortfolio([]);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const heatmapData = useMemo(() => {
    const items = [
      {
        label: "Kalshi 24h",
        name: "Kalshi volume",
        weight: Math.max(1, state.kalshiVolume24h || 1),
        change: (state.kalshiLastPct || 50) - 50,
      },
      {
        label: "Poly 24h",
        name: "Polymarket volume",
        weight: Math.max(1, state.polyVolume24h || 1),
        change: (state.polyLastPct || 50) - 50,
      },
      {
        label: "Kalshi book",
        name: "Bid depth",
        weight: Math.max(
          1,
          state.kalshiBook.bids.reduce((sum, l) => sum + l.size, 0),
        ),
        change: -(state.kalshiSpread || 0),
      },
      {
        label: "Poly book",
        name: "Ask depth",
        weight: Math.max(
          1,
          state.polyBook.asks.reduce((sum, l) => sum + l.size, 0) +
            state.polyBook.bids.reduce((sum, l) => sum + l.size, 0),
        ),
        change: -(state.polySpread || 0),
      },
    ];
    return items;
  }, [state]);

  const candles = venue === "kalshi" ? state.kalshiCandles : state.polyCandles;
  const depthBook = venue === "kalshi" ? state.kalshiBook : state.polyBook;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-end gap-1 border-b border-border/60 px-2 pt-2">
        <button
          type="button"
          className="relative -mb-px rounded-t-lg border border-border/70 border-b-background bg-background px-3 py-2 text-[12px] font-medium text-foreground"
        >
          {tabLabel}
        </button>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="mb-0.5 inline-flex items-center gap-1 rounded-t-lg px-2.5 py-2 text-[12px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <Plus className="size-3.5" />
          Add another tab
        </button>
      </div>

      <div className={cn("grid min-h-0 flex-1 gap-0", generating && "lg:grid-cols-[16.5rem_minmax(0,1fr)]")}>
        {generating ? (
          <aside className="hidden border-r border-border/60 p-4 lg:block">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Agent steps
            </p>
            <AgentSteps steps={state.steps} />
          </aside>
        ) : null}

        <div className="min-h-0 overflow-y-auto p-4">
          {generating ? (
            <div className="mb-4 rounded-xl border border-border/60 bg-muted/20 p-3 lg:hidden">
              <AgentSteps steps={state.steps} />
            </div>
          ) : null}

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="compare-live-dashboard">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex flex-wrap content-start gap-4"
                >
                  {widgets.map((widget, index) => (
                    <Draggable key={widget.id} draggableId={widget.id} index={index}>
                      {(drag, snapshot) => (
                        <section
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          data-dash-widget={widget.id}
                          className={cn(
                            "relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm",
                            snapshot.isDragging && "z-20 shadow-xl",
                          )}
                          style={{
                            ...drag.draggableProps.style,
                            ...widgetBoxStyle(widget),
                          }}
                        >
                          <header className="flex shrink-0 items-start gap-2 border-b border-border/50 px-3 py-2">
                            <button
                              type="button"
                              className="mt-0.5 text-muted-foreground hover:text-foreground"
                              aria-label={`Reorder ${widget.title}`}
                              {...drag.dragHandleProps}
                            >
                              <GripVertical className="size-3.5" />
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-foreground">{widget.title}</p>
                              <p className="text-[11px] text-muted-foreground">{widget.description}</p>
                            </div>
                            {widgetType(widget) === "liveline" ? (
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                <div
                                  className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background p-0.5"
                                  role="group"
                                  aria-label="Liveline interval"
                                >
                                  {DASHBOARD_INTERVALS.map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => setInterval(item.id)}
                                      className={cn(
                                        "h-6 rounded px-1.5 text-[10px] font-medium transition-colors",
                                        interval === item.id
                                          ? "bg-muted text-foreground shadow-sm"
                                          : "text-muted-foreground hover:text-foreground",
                                      )}
                                    >
                                      {item.label}
                                    </button>
                                  ))}
                                </div>
                                <TooltipProvider delayDuration={200}>
                                  {livelineMerged && livelineCount > 0 ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          aria-pressed={false}
                                          aria-label="Split charts into side by side"
                                          className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground hover:text-foreground"
                                          onClick={() => setWidgets((prev) => splitLivelineWidgets(prev))}
                                        >
                                          <Columns2 className="size-3.5" aria-hidden />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="text-xs">
                                        Split into side by side charts
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : livelineCount > 0 ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          aria-pressed
                                          aria-label="Merge charts into one chart"
                                          className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 bg-muted text-foreground shadow-sm"
                                          onClick={() => setWidgets((prev) => mergeLivelineWidgets(prev))}
                                        >
                                          <GitMerge className="size-3.5" aria-hidden />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="text-xs">
                                        Merge charts into one chart
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : null}
                                </TooltipProvider>
                              </div>
                            ) : null}
                            {(widgetType(widget) === "market-candles" || widgetType(widget) === "depth") && (
                              <div className="flex rounded-md border border-border/60 p-0.5 text-[10px]">
                                <button
                                  type="button"
                                  className={cn(
                                    "rounded px-1.5 py-0.5",
                                    venue === "kalshi" && "bg-muted text-foreground",
                                  )}
                                  onClick={() => setVenue("kalshi")}
                                >
                                  Kalshi
                                </button>
                                <button
                                  type="button"
                                  className={cn(
                                    "rounded px-1.5 py-0.5",
                                    venue === "poly" && "bg-muted text-foreground",
                                  )}
                                  onClick={() => setVenue("poly")}
                                >
                                  Poly
                                </button>
                              </div>
                            )}
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={`Remove ${widget.title}`}
                              onClick={() => setWidgets((prev) => prev.filter((item) => item.id !== widget.id))}
                            >
                              <X className="size-3.5" />
                            </button>
                          </header>
                          <div className="min-h-0 flex-1 overflow-hidden p-2">
                            <WidgetBody
                              widget={widget}
                              pair={pair}
                              state={state}
                              live={filteredLive}
                              historyAsPoints={historyAsPoints}
                              candles={candles}
                              depthBook={depthBook}
                              heatmapData={heatmapData}
                              venue={venue}
                              interval={interval}
                              onHolder={openHolder}
                            />
                          </div>
                          <BoxResizeHandles
                            onChange={({ width, height }) => {
                              setWidgets((prev) =>
                                prev.map((item) =>
                                  item.id === widget.id
                                    ? { ...item, layout: "custom", width, height }
                                    : item,
                                ),
                              );
                            }}
                          />
                        </section>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add another tab</DialogTitle>
            <DialogDescription>
              Extra tabs, blank pages, and more comparisons are part of Lychee Pro.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {[
              { id: "single", label: "Another single market" },
              { id: "blank", label: "Blank page" },
              { id: "compare", label: "Another comparison" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                className="rounded-xl border border-border/70 px-3 py-3 text-left text-sm hover:bg-muted/40"
                onClick={onUpgrade}
              >
                {option.label}
                <span className="mt-0.5 block text-[11px] text-muted-foreground">Requires Lychee Pro</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(holder)}
        onOpenChange={(open) => {
          if (!open) {
            setHolder(null);
            setPortfolio(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{holder ? holderName(holder) : "Holder"}</DialogTitle>
            <DialogDescription>
              {holder ? `${holder.outcome} · ${holder.amount.toLocaleString()} shares` : ""}
            </DialogDescription>
          </DialogHeader>
          {portfolioLoading ? (
            <ChartSkeleton height={180} variant="grid" />
          ) : (
            <PortfolioDonut
              slices={(portfolio || [])
                .slice(0, 6)
                .map((row, index) => ({
                  label: String(row.title || row.slug || row.asset || `Pos ${index + 1}`).slice(0, 28),
                  value: Math.abs(Number(row.currentValue ?? row.size ?? 0)) || 1,
                  color: [POLYMARKET_BLUE, KALSHI_GREEN, "#a78bfa", "#f59e0b", "#fb7185", "#22d3ee"][index]!,
                }))}
            />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHolder(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WidgetBody({
  widget,
  pair,
  state,
  live,
  historyAsPoints,
  candles,
  depthBook,
  heatmapData,
  venue,
  interval,
  onHolder,
}: {
  widget: DashboardWidget;
  pair: DashboardPair;
  state: DashboardLiveState;
  live: { kalshi: Record<string, unknown>[]; poly: Record<string, unknown>[] };
  historyAsPoints: Record<string, unknown>[];
  candles: DashboardLiveState["kalshiCandles"];
  depthBook: DashboardLiveState["kalshiBook"];
  heatmapData: { label: string; name: string; weight: number; change: number }[];
  venue: "kalshi" | "poly";
  interval: DashboardIntervalId;
  onHolder: (row: HolderRow) => void;
}) {
  const sliceStatus = (key: string) => state.slices[key] || "idle";
  const id = widgetType(widget);
  const chartVenue = widgetVenue(widget);
  const historyFiltered = filterRowsByInterval(historyAsPoints, interval);

  if (id === "liveline") {
    const showKalshi = chartVenue !== "poly";
    const showPoly = chartVenue !== "kalshi";
    const kalshiTrades = showKalshi ? live.kalshi : [];
    const polyTrades = showPoly ? (live.poly.length ? live.poly : historyFiltered) : [];
    const loading =
      sliceStatus("trades") !== "ready" && !kalshiTrades.length && !polyTrades.length;
    const series = [
      ...(showKalshi
        ? [{ id: "kalshi", label: "Kalshi", color: KALSHI_GREEN, trades: kalshiTrades }]
        : []),
      ...(showPoly
        ? [{ id: "poly", label: "Polymarket", color: POLYMARKET_BLUE, trades: polyTrades }]
        : []),
    ];
    return (
      <HubKalshiLiveDemoTradesLiveline
        series={series}
        loading={loading}
        fill
        persistHistory
        fullHistory={interval === "6h" || interval === "1d" || interval === "all"}
        fixedValueDomain={series.length > 1 ? { min: 0, max: 100 } : undefined}
        className="h-full min-h-0"
      />
    );
  }

  if (id === "stats") {
    return <DashboardStatCards pair={pair} state={state} />;
  }

  if (id === "summary") {
    return <CompareSummaryTable pair={pair} state={state} />;
  }

  if (id === "market-candles") {
    if (sliceStatus("candles") !== "ready" && !candles.length) {
      return <ChartSkeleton height={220} variant="grid" />;
    }
    return (
      <MarketCandlesChart
        candles={candles}
        accent={venue === "kalshi" ? KALSHI_GREEN : POLYMARKET_BLUE}
        label={venue === "kalshi" ? pair.kalshiTicker : "Polymarket"}
      />
    );
  }

  if (id === "area") {
    if (sliceStatus("candles") !== "ready" && !state.polyHistory.length) {
      return <ChartSkeleton height={220} variant="line" />;
    }
    const kalshiPts = live.kalshi
      .map((row) => ({
        t: Date.parse(String(row.created_time || "")),
        v: Number(row.yes_price_dollars) * 100,
      }))
      .filter((row) => Number.isFinite(row.t) && Number.isFinite(row.v));
    return <AreaSummaryChart kalshi={kalshiPts} poly={state.polyHistory} />;
  }

  if (id === "indicators") {
    if (sliceStatus("candles") !== "ready" && !candles.length) {
      return <ChartSkeleton height={220} variant="line" />;
    }
    return <IndicatorChart candles={candles.length ? candles : state.kalshiCandles} />;
  }

  if (id === "depth") {
    if (sliceStatus("books") !== "ready") return <ChartSkeleton height={220} variant="grid" />;
    return (
      <DepthChart
        bids={depthBook.bids}
        asks={depthBook.asks}
        accentBid={venue === "kalshi" ? KALSHI_GREEN : POLYMARKET_BLUE}
      />
    );
  }

  if (id === "orderbook") {
    if (sliceStatus("books") !== "ready") return <ChartSkeleton height={220} variant="rows" />;
    return (
      <OrderBookLadder
        left={state.kalshiBook}
        right={state.polyBook}
        leftLabel="Kalshi"
        rightLabel="Polymarket"
      />
    );
  }

  if (id === "trades") {
    if (sliceStatus("trades") !== "ready" && !state.trades.length) {
      return <ChartSkeleton height={220} variant="rows" />;
    }
    return (
      <div className="h-full overflow-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="sticky top-0 bg-background text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 font-medium">Venue</th>
              <th className="px-2 py-1.5 font-medium">Side</th>
              <th className="px-2 py-1.5 font-medium">Price</th>
              <th className="px-2 py-1.5 font-medium">Size</th>
              <th className="px-2 py-1.5 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {state.trades.slice(0, 24).map((row) => (
              <tr key={row.id} className="border-t border-border/40">
                <td className="px-2 py-1.5" style={{ color: row.venue === "kalshi" ? KALSHI_GREEN : POLYMARKET_BLUE }}>
                  {row.venue === "kalshi" ? "Kalshi" : "Poly"}
                </td>
                <td className="px-2 py-1.5 text-foreground">{row.side}</td>
                <td className="px-2 py-1.5 font-mono">{formatPct(row.price)}</td>
                <td className="px-2 py-1.5 font-mono text-muted-foreground">
                  {row.size == null ? "—" : row.size.toLocaleString()}
                </td>
                <td className="px-2 py-1.5 text-muted-foreground">
                  {new Date(row.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (id === "holders") {
    if (sliceStatus("holders") !== "ready" && !state.holders.length) {
      return <ChartSkeleton height={220} variant="rows" />;
    }
    return (
      <div className="h-full overflow-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="sticky top-0 bg-background text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 font-medium">#</th>
              <th className="px-2 py-1.5 font-medium">Holder</th>
              <th className="px-2 py-1.5 font-medium">Outcome</th>
              <th className="px-2 py-1.5 font-medium">Size</th>
            </tr>
          </thead>
          <tbody>
            {state.holders.map((row, index) => (
              <tr key={row.proxyWallet} className="border-t border-border/40">
                <td className="px-2 py-1.5 text-muted-foreground">{index + 1}</td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                    onClick={() => onHolder(row)}
                  >
                    {holderName(row)}
                  </button>
                </td>
                <td className="px-2 py-1.5 text-muted-foreground">{row.outcome}</td>
                <td className="px-2 py-1.5 font-mono">{row.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (id === "watchlist") {
    if (sliceStatus("markets") !== "ready" && sliceStatus("books") !== "ready") {
      return <ChartSkeleton height={220} variant="rows" />;
    }
    const rows = [
      {
        asset: "Kalshi",
        ticker: pair.kalshiTicker,
        price: state.kalshiLastPct,
        change: state.kalshiSpread,
        volume: state.kalshiVolume24h,
      },
      {
        asset: "Polymarket",
        ticker: String(pair.polyMarket.slug || "").slice(0, 18),
        price: state.polyLastPct,
        change: state.polySpread,
        volume: state.polyVolume24h,
      },
    ];
    return (
      <table className="w-full text-left text-[12px]">
        <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5 font-medium">Venue</th>
            <th className="px-2 py-1.5 font-medium">Last</th>
            <th className="px-2 py-1.5 font-medium">Spread</th>
            <th className="px-2 py-1.5 font-medium">24h</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.asset} className="border-t border-border/40">
              <td className="px-2 py-2">
                <p className="font-medium text-foreground">{row.asset}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{row.ticker}</p>
              </td>
              <td className="px-2 py-2 font-mono">{formatPct(row.price)}</td>
              <td className="px-2 py-2 font-mono text-muted-foreground">{formatPct(row.change)}</td>
              <td className="px-2 py-2 font-mono">{formatMoney(row.volume)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (id === "heatmap") {
    if (sliceStatus("books") !== "ready" && sliceStatus("markets") !== "ready") {
      return <ChartSkeleton height={220} variant="grid" />;
    }
    return (
      <MarketHeatmap
        data={heatmapData}
        height={200}
        title=""
        subtitle=""
        metricLabel="vs 50¢"
        status="ready"
      />
    );
  }

  return null;
}
