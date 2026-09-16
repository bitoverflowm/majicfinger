"use client";

import { useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { GripVertical, Plus, X } from "lucide-react";

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
import { cn } from "@/lib/utils";

import { AgentSteps } from "./AiGenerating";
import {
  AreaSummaryChart,
  DepthChart,
  IndicatorChart,
  MarketCandlesChart,
  OrderBookLadder,
  PortfolioDonut,
  onResizePointerDown,
} from "./charts";
import { fetchHolderPositions, livelineSeriesFromState } from "./fetchDashboardLive";
import {
  DEFAULT_WIDGETS,
  KALSHI_GREEN,
  POLYMARKET_BLUE,
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

  const tabLabel = `${shortTitle(pair.kalshiTitle, 22)} vs ${shortTitle(pair.polyTitle, 22)}`;
  const live = livelineSeriesFromState(state);
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
                  className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                >
                  {widgets.map((widget, index) => (
                    <Draggable key={widget.id} draggableId={widget.id} index={index}>
                      {(drag, snapshot) => (
                        <section
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          className={cn(
                            "flex flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm",
                            widget.span === 2 && "lg:col-span-2",
                            snapshot.isDragging && "z-20 shadow-xl",
                          )}
                          style={{
                            ...drag.draggableProps.style,
                            height: widget.height,
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
                            {(widget.id === "market-candles" || widget.id === "depth") && (
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
                              id={widget.id}
                              pair={pair}
                              state={state}
                              live={live}
                              historyAsPoints={historyAsPoints}
                              candles={candles}
                              depthBook={depthBook}
                              heatmapData={heatmapData}
                              venue={venue}
                              onHolder={openHolder}
                            />
                          </div>
                          <div
                            className="h-2 shrink-0 cursor-ns-resize bg-transparent hover:bg-muted/50"
                            onPointerDown={onResizePointerDown(widget.height, (height) => {
                              setWidgets((prev) =>
                                prev.map((item) => (item.id === widget.id ? { ...item, height } : item)),
                              );
                            })}
                            aria-hidden
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
  id,
  pair,
  state,
  live,
  historyAsPoints,
  candles,
  depthBook,
  heatmapData,
  venue,
  onHolder,
}: {
  id: DashboardWidget["id"];
  pair: DashboardPair;
  state: DashboardLiveState;
  live: { kalshi: Record<string, unknown>[]; poly: Record<string, unknown>[] };
  historyAsPoints: Record<string, unknown>[];
  candles: DashboardLiveState["kalshiCandles"];
  depthBook: DashboardLiveState["kalshiBook"];
  heatmapData: { label: string; name: string; weight: number; change: number }[];
  venue: "kalshi" | "poly";
  onHolder: (row: HolderRow) => void;
}) {
  const sliceStatus = (key: string) => state.slices[key] || "idle";

  if (id === "liveline") {
    const loading = sliceStatus("trades") !== "ready" && !live.kalshi.length && !live.poly.length;
    return (
      <HubKalshiLiveDemoTradesLiveline
        series={[
          { id: "kalshi", label: "Kalshi", color: KALSHI_GREEN, trades: live.kalshi },
          {
            id: "poly",
            label: "Polymarket",
            color: POLYMARKET_BLUE,
            trades: live.poly.length ? live.poly : historyAsPoints,
          },
        ]}
        loading={loading}
        fill
        persistHistory
        fixedValueDomain={{ min: 0, max: 100 }}
      />
    );
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
