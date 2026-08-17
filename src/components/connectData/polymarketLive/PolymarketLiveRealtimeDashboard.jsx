"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  GripVertical,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  Radio,
  SlidersHorizontal,
  Square,
} from "lucide-react";

import { HubKalshiLiveDemoTradesLiveline } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTradesLiveline";
import { Button } from "@/components/ui/button";
import { useMyStateV2 } from "@/context/stateContextV2";
import { POLYMARKET_REALTIME_FEED_OPTIONS } from "@/lib/polymarketLive/polymarketRealtimeCompose";
import { cn } from "@/lib/utils";

const FEED_LABELS = Object.fromEntries(
  POLYMARKET_REALTIME_FEED_OPTIONS.map((option) => [option.id, option.label]),
);
const COLOR_TOKENS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];

function parseLevels(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function levelValue(level, key, index) {
  if (level && typeof level === "object" && !Array.isArray(level)) return Number(level[key]);
  if (Array.isArray(level)) return Number(level[index]);
  return NaN;
}

function latestBookRows(rows, tokenIds) {
  const wanted = new Set(tokenIds);
  const latest = new Map();
  for (const row of rows) {
    const assetId = String(row?.asset_id || "");
    if (wanted.has(assetId)) latest.set(assetId, row);
  }
  return [...latest.values()];
}

function marketRows(rows, market) {
  const tokens = new Set(market.selectedTokenIds || []);
  return (rows || []).filter((row) => tokens.has(String(row?.asset_id || "")));
}

function outcomeLabel(market, tokenId) {
  return (
    market.outcomePairs?.find((pair) => String(pair.tokenId) === String(tokenId))?.outcome ||
    `${String(tokenId).slice(0, 6)}…`
  );
}

function priceSeries(rows, market, valueKey = "price") {
  return (market.selectedTokenIds || []).map((tokenId, index) => ({
    id: tokenId,
    label: outcomeLabel(market, tokenId),
    color: `var(--${COLOR_TOKENS[index % COLOR_TOKENS.length]})`,
    colorToken: COLOR_TOKENS[index % COLOR_TOKENS.length],
    trades: rows
      .filter((row) => String(row?.asset_id || "") === tokenId)
      .map((row) => ({
        created_time: row.time || new Date(Number(row.timestamp || Date.now())).toISOString(),
        yes_price_dollars: Number(row[valueKey]),
      }))
      .filter((row) => Number.isFinite(row.yes_price_dollars)),
  }));
}

function OrderbookDepth({ rows, market }) {
  const books = latestBookRows(rows, market.selectedTokenIds || []);
  if (!books.length) return <WaitingForData label="Waiting for the first orderbook snapshot…" />;

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-auto sm:grid-cols-2">
      {books.map((book) => {
        const bids = parseLevels(book.bids).slice(-12).reverse();
        const asks = parseLevels(book.asks).slice(0, 12);
        const levels = [...bids.map((level) => ({ level, side: "bid" })), ...asks.map((level) => ({
          level,
          side: "ask",
        }))];
        const maxSize = Math.max(1, ...levels.map(({ level }) => levelValue(level, "size", 1) || 0));
        return (
          <div key={book.asset_id} className="min-w-0 space-y-1.5">
            <p className="truncate text-[10px] font-medium text-muted-foreground">
              {outcomeLabel(market, book.asset_id)}
            </p>
            <div className="space-y-1">
              {levels.map(({ level, side }, index) => {
                const price = levelValue(level, "price", 0);
                const size = levelValue(level, "size", 1);
                return (
                  <div
                    key={`${side}:${price}:${index}`}
                    className="relative flex h-5 items-center justify-between overflow-hidden rounded bg-muted/40 px-1.5 font-mono text-[9px]"
                  >
                    <span
                      className={cn(
                        "absolute inset-y-0 opacity-20",
                        side === "bid" ? "left-0 bg-emerald-500" : "right-0 bg-rose-500",
                      )}
                      style={{ width: `${Math.max(3, (size / maxSize) * 100)}%` }}
                    />
                    <span className="relative">{Number.isFinite(price) ? price.toFixed(3) : "—"}</span>
                    <span className="relative">{Number.isFinite(size) ? size.toLocaleString() : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WaitingForData({ label }) {
  return (
    <div className="relative flex h-full min-h-40 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-muted/5 p-5 text-center">
      <div className="pointer-events-none absolute inset-3 grid grid-cols-6 grid-rows-4 opacity-50" aria-hidden>
        {Array.from({ length: 24 }, (_, index) => (
          <span key={index} className="border-l border-t border-border/60" />
        ))}
      </div>
      <div className="relative rounded-md border border-border/60 bg-background/90 px-3 py-2 shadow-sm">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Radio className="size-3.5 animate-pulse text-emerald-500" aria-hidden />
          {label}
        </p>
        <p className="mt-1 text-[9px] text-muted-foreground">
          This chart stays pinned while it waits for data.
        </p>
      </div>
    </div>
  );
}

function FeedVisualization({ feedType, rows, market, paused }) {
  if (feedType === "book") return <OrderbookDepth rows={rows} market={market} />;

  if (feedType === "last_trade_price") {
    const series = priceSeries(rows, market);
    return series.some((item) => item.trades.length) ? (
      <HubKalshiLiveDemoTradesLiveline series={series} paused={paused} compact fill className="min-h-0" />
    ) : (
      <WaitingForData label="Waiting for a live trade…" />
    );
  }

  if (feedType === "best_bid_ask" || feedType === "price_change") {
    const bidSeries = priceSeries(rows, market, "best_bid").map((item) => ({
      ...item,
      id: `bid:${item.id}`,
      label: `${item.label} bid`,
    }));
    const askSeries = priceSeries(rows, market, "best_ask").map((item, index) => ({
      ...item,
      id: `ask:${item.id}`,
      label: `${item.label} ask`,
      colorToken: COLOR_TOKENS[(index + 2) % COLOR_TOKENS.length],
    }));
    const topOfBookSeries = [...bidSeries, ...askSeries];
    const series =
      feedType === "price_change"
        ? [...priceSeries(rows, market), ...topOfBookSeries]
        : topOfBookSeries;
    const latest = [...rows].reverse().find(
      (row) => Number.isFinite(Number(row?.best_bid)) || Number.isFinite(Number(row?.best_ask)),
    );
    const bid = Number(latest?.best_bid);
    const ask = Number(latest?.best_ask);
    const spread =
      Number.isFinite(Number(latest?.spread))
        ? Number(latest.spread)
        : Number.isFinite(bid) && Number.isFinite(ask)
          ? ask - bid
          : NaN;
    return series.some((item) => item.trades.length) ? (
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-1.5 grid grid-cols-3 gap-1.5">
          {[
            ["Best bid", bid],
            ["Best ask", ask],
            ["Spread", spread],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
              <p className="text-[8px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="font-mono text-xs font-medium text-foreground">
                {Number.isFinite(value) ? Number(value).toFixed(3) : "—"}
              </p>
            </div>
          ))}
        </div>
        <HubKalshiLiveDemoTradesLiveline
          series={series}
          paused={paused}
          compact
          fill
          className="min-h-0 flex-1"
        />
      </div>
    ) : (
      <WaitingForData
        label={feedType === "price_change" ? "Waiting for orderbook price changes…" : "Waiting for top-of-book updates…"}
      />
    );
  }

  const latest = rows[rows.length - 1];
  return latest ? (
    <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-lg bg-muted/15 p-5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Current tick size</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
        {latest.new_tick_size ?? "—"}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Previous {latest.old_tick_size ?? "—"} · {latest.time || "Live"}
      </p>
    </div>
  ) : (
    <WaitingForData label="Waiting for a tick-size update…" />
  );
}

export function PolymarketLiveRealtimeDashboard({
  session,
  onSubscribeMore,
  onStop,
  onOpenEditor,
}) {
  const ctx = useMyStateV2() ?? {};
  const dataSheets = ctx.dataSheets || {};
  const streams = ctx.liveStreamState?.streamsBySheetId || {};
  const actions = ctx.liveStreamActions;
  const dragRef = useRef(null);
  const [orderByMarket, setOrderByMarket] = useState({});
  const [wideCards, setWideCards] = useState(new Set());

  const rowsByFeed = useMemo(
    () =>
      Object.fromEntries(
        session.feedTypes.map((feedType) => [
          feedType,
          dataSheets[session.sheetsByFeed[feedType]]?.data || [],
        ]),
      ),
    [dataSheets, session.feedTypes, session.sheetsByFeed],
  );

  const runningCount = session.feedTypes.filter(
    (feedType) => streams[session.sheetsByFeed[feedType]]?.isRunning,
  ).length;
  const paused = session.feedTypes.some(
    (feedType) => streams[session.sheetsByFeed[feedType]]?.isPaused,
  );

  const togglePause = () => {
    for (const feedType of session.feedTypes) {
      const sheetId = session.sheetsByFeed[feedType];
      if (paused) actions?.resume?.(sheetId);
      else actions?.pause?.(sheetId);
    }
  };

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 rounded-xl border border-border/70 bg-background/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              {runningCount}/{session.feedTypes.length} feeds connected
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Polymarket live dashboard</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Real-time charts are grouped by market. Drag cards to reorder them or expand any card.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={onSubscribeMore}>
              <Plus className="size-3.5" aria-hidden />
              Add markets
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={togglePause}>
              {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={onOpenEditor}>
              <SlidersHorizontal className="size-3.5" aria-hidden />
              Editor mode
            </Button>
            <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" onClick={onStop}>
              <Square className="size-3.5" aria-hidden />
              Stop
            </Button>
          </div>
        </div>
      </div>

      <p className="rounded-lg border border-secondary/20 bg-secondary/5 px-3 py-2 text-[11px] text-muted-foreground">
        Historical REST data is loaded first and remains in each chart while live WebSocket updates
        are appended. You can always subscribe to more markets later.
      </p>
      {session.seedErrors?.length ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
          Live feeds are connected, but some REST seed requests failed: {session.seedErrors.join(" · ")}
          . Empty chart frames will stay visible until data arrives.
        </p>
      ) : null}

      {session.markets.map((market) => {
        const marketKey = String(market.conditionId || market.id || market.slug);
        const order = orderByMarket[marketKey] || session.feedTypes;
        return (
          <section key={marketKey} className="space-y-2">
            <div className="border-b border-border/60 pb-2">
              {market.eventTitle ? (
                <p className="text-[9px] font-medium uppercase tracking-wide text-secondary">
                  {market.eventTitle}
                </p>
              ) : null}
              <h3 className="text-sm font-semibold text-foreground">
                {market.title || market.slug || market.id}
              </h3>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {(market.selectedOutcomes || []).join(" · ")}
              </p>
            </div>
            <div className="grid auto-rows-[24rem] grid-cols-1 gap-3 xl:grid-cols-2">
              {order.map((feedType) => {
                const cardKey = `${marketKey}:${feedType}`;
                const wide = wideCards.has(cardKey);
                const sheetId = session.sheetsByFeed[feedType];
                const stream = streams[sheetId];
                const rows = marketRows(rowsByFeed[feedType], market);
                const seedCount = rows.filter((row) => row?.source === "rest_seed").length;
                const liveCount = Math.max(0, rows.length - seedCount);
                return (
                  <article
                    key={cardKey}
                    draggable
                    onDragStart={() => {
                      dragRef.current = { marketKey, feedType };
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      const dragged = dragRef.current;
                      if (!dragged || dragged.marketKey !== marketKey || dragged.feedType === feedType) return;
                      setOrderByMarket((current) => {
                        const next = [...(current[marketKey] || session.feedTypes)];
                        const from = next.indexOf(dragged.feedType);
                        const to = next.indexOf(feedType);
                        next.splice(from, 1);
                        next.splice(to, 0, dragged.feedType);
                        return { ...current, [marketKey]: next };
                      });
                    }}
                    className={cn(
                      "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm",
                      wide && "xl:col-span-2",
                    )}
                  >
                    <header className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-foreground">{FEED_LABELS[feedType]}</p>
                          <p className="text-[9px] text-muted-foreground">
                            {stream?.isRunning ? "Live" : stream?.connecting ? "Connecting…" : "Waiting"}
                            {" · "}{seedCount} REST seed{seedCount === 1 ? "" : "s"}
                            {" · "}{liveCount} live
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() =>
                          setWideCards((current) => {
                            const next = new Set(current);
                            if (next.has(cardKey)) next.delete(cardKey);
                            else next.add(cardKey);
                            return next;
                          })
                        }
                      >
                        {wide ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                        <span className="sr-only">{wide ? "Restore card size" : "Expand card"}</span>
                      </Button>
                    </header>
                    <div className="min-h-0 flex-1 overflow-hidden p-2.5">
                      <FeedVisualization feedType={feedType} rows={rows} market={market} paused={paused} />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs" onClick={onSubscribeMore}>
        <ArrowLeft className="size-3.5 rotate-180" aria-hidden />
        Subscribe to more markets
      </Button>
    </div>
  );
}
