"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  GripVertical,
  Layers,
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
import { HubKalshiLiveDemoCandlesticksProfessionalChart } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoCandlesticksProfessionalChart";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  POLYMARKET_REALTIME_FEED_OPTIONS,
  polymarketRealtimeMarketKey,
} from "@/lib/polymarketLive/polymarketRealtimeCompose";
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

function marketsRows(rows, markets) {
  const tokens = new Set(
    (markets || []).flatMap((market) => market.selectedTokenIds || []),
  );
  return (rows || []).filter((row) => tokens.has(String(row?.asset_id || "")));
}

function marketDisplayLabel(market) {
  return market.title || market.slug || market.id || "Market";
}

function outcomeLabel(market, tokenId) {
  return (
    market.outcomePairs?.find((pair) => String(pair.tokenId) === String(tokenId))?.outcome ||
    `${String(tokenId).slice(0, 6)}…`
  );
}

function priceSeries(rows, market, valueKey = "price") {
  return multiMarketPriceSeries(rows, [market], valueKey);
}

function multiMarketPriceSeries(rows, markets, valueKey = "price") {
  let colorIndex = 0;
  const labelWithMarket = (markets || []).length > 1;
  return (markets || []).flatMap((market) => {
    const marketKey = polymarketRealtimeMarketKey(market);
    return (market.selectedTokenIds || []).map((tokenId) => {
      const outcome = outcomeLabel(market, tokenId);
      const colorToken = COLOR_TOKENS[colorIndex % COLOR_TOKENS.length];
      colorIndex += 1;
      return {
        id: labelWithMarket ? `${marketKey}:${tokenId}` : tokenId,
        label: labelWithMarket
          ? `${outcome} · ${marketDisplayLabel(market)}`
          : outcome,
        color: `var(--${colorToken})`,
        colorToken,
        trades: rows
          .filter((row) => String(row?.asset_id || "") === tokenId)
          .map((row) => ({
            created_time: row.time || new Date(Number(row.timestamp || Date.now())).toISOString(),
            yes_price_dollars: Number(row[valueKey]),
          }))
          .filter((row) => Number.isFinite(row.yes_price_dollars)),
      };
    });
  });
}

function LastTradeOverlayMenu({
  primaryMarketKey,
  sessionMarkets,
  overlayKeys,
  onToggle,
}) {
  const otherMarkets = (sessionMarkets || []).filter(
    (market) => polymarketRealtimeMarketKey(market) !== primaryMarketKey,
  );
  if (!otherMarkets.length) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 gap-1 px-2 text-[11px] font-normal"
        >
          <Layers className="size-3" aria-hidden />
          {overlayKeys.length ? `Overlay · ${overlayKeys.length}` : "Overlay markets"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-sm">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Overlay other workspace markets
        </DropdownMenuLabel>
        {otherMarkets.map((market) => {
          const key = polymarketRealtimeMarketKey(market);
          return (
            <DropdownMenuCheckboxItem
              key={key}
              checked={overlayKeys.includes(key)}
              onCheckedChange={(checked) => onToggle(key, Boolean(checked))}
              onSelect={(event) => event.preventDefault()}
              className="text-xs"
            >
              <span className="truncate">{marketDisplayLabel(market)}</span>
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function OrderbookDepth({ rows, market }) {
  const books = latestBookRows(rows, market.selectedTokenIds || []);
  if (!books.length) return <WaitingForData label="Waiting for the first orderbook snapshot…" />;

  return (
    <div
      className={cn(
        "grid h-full min-h-0 gap-3 overflow-auto",
        books.length > 1 && "lg:grid-cols-2",
      )}
    >
      {books.map((book) => {
        const bids = parseLevels(book.bids).slice(-5).reverse();
        const asks = parseLevels(book.asks).slice(0, 5).reverse();
        const levels = [
          ...asks.map((level) => ({ level, side: "ask" })),
          ...bids.map((level) => ({ level, side: "bid" })),
        ];
        const maxSize = Math.max(1, ...levels.map(({ level }) => levelValue(level, "size", 1) || 0));
        return (
          <div key={book.asset_id} className="min-w-0 space-y-1">
            <p className="truncate text-[11px] font-medium leading-snug text-muted-foreground">
              {outcomeLabel(market, book.asset_id)}
            </p>
            <div className="space-y-0.5">
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
    <div className="relative flex h-full min-h-32 items-center justify-center overflow-hidden rounded-md border border-dashed border-border/60 bg-muted/10 p-4 text-center">
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

function CandlestickFeed({ rows, market }) {
  const availableTokens = (market.selectedTokenIds || []).filter((tokenId) =>
    rows.some((row) => String(row?.asset_id || "") === String(tokenId)),
  );
  const [activeToken, setActiveToken] = useState(
    () => availableTokens[0] || market.selectedTokenIds?.[0] || "",
  );
  const token = availableTokens.includes(activeToken) ? activeToken : availableTokens[0];
  const candles = token
    ? rows.filter((row) => String(row?.asset_id || "") === String(token))
    : [];

  if (!candles.length) {
    return <WaitingForData label="Waiting for candlestick history or the first trade…" />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {availableTokens.length > 1 ? (
        <div className="mb-1 flex shrink-0 gap-1 overflow-x-auto">
          {availableTokens.map((tokenId) => (
            <button
              key={tokenId}
              type="button"
              onClick={() => setActiveToken(tokenId)}
              className={cn(
                "shrink-0 rounded-full border px-2 py-1 text-[10px] transition-colors",
                tokenId === token
                  ? "border-secondary/40 bg-secondary/10 text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {outcomeLabel(market, tokenId)}
            </button>
          ))}
        </div>
      ) : null}
      <HubKalshiLiveDemoCandlesticksProfessionalChart
        candles={candles}
        className="min-h-0 flex-1"
        chartClassName="min-h-0 border-0 rounded-none"
      />
    </div>
  );
}

/** Liveline draws nothing from a lone reading, so keep the pinned frame until a series has a line. */
function hasPlottableSeries(series) {
  return series.some((item) => item.trades.length >= 2);
}

function FeedVisualization({ feedType, rows, market, chartMarkets, paused }) {
  if (feedType === "book") return <OrderbookDepth rows={rows} market={market} />;
  if (feedType === "candlesticks") return <CandlestickFeed rows={rows} market={market} />;

  if (feedType === "last_trade_price") {
    const seriesMarkets = chartMarkets?.length ? chartMarkets : [market];
    const series = multiMarketPriceSeries(rows, seriesMarkets);
    return hasPlottableSeries(series) ? (
      <HubKalshiLiveDemoTradesLiveline
        series={series}
        paused={paused}
        compact
        fill
        persistHistory
        className="min-h-0"
      />
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
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-1.5 grid grid-cols-3 gap-1.5">
          {[
            ["Best bid", bid],
            ["Best ask", ask],
            ["Spread", spread],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-muted/25 px-2 py-1.5 text-center">
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="font-mono text-xs font-medium text-foreground">
                {Number.isFinite(value) ? Number(value).toFixed(3) : "—"}
              </p>
            </div>
          ))}
        </div>
        {hasPlottableSeries(series) ? (
          <HubKalshiLiveDemoTradesLiveline
            series={series}
            paused={paused}
            compact
            fill
            persistHistory
            className="min-h-0 flex-1"
          />
        ) : (
          <div className="min-h-0 flex-1">
            <WaitingForData
              label={
                feedType === "price_change"
                  ? "Waiting for orderbook price changes…"
                  : "Waiting for top-of-book updates…"
              }
            />
          </div>
        )}
      </div>
    );
  }

  const latest = rows[rows.length - 1];
  return latest ? (
    <div className="flex h-full min-h-32 flex-col items-center justify-center rounded-md bg-muted/10 p-4 text-center">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current tick size</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
        {latest.new_tick_size ?? "—"}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
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
  const [lastTradeOverlays, setLastTradeOverlays] = useState({});
  const [activeMarketKey, setActiveMarketKey] = useState(() => {
    const first = session.markets?.[0];
    return first ? String(first.conditionId || first.id || first.slug) : "";
  });
  const separateMarketTabs = session.dashboardLayout === "separate_tabs";
  useEffect(() => {
    const keys = session.markets.map((market) =>
      String(market.conditionId || market.id || market.slug),
    );
    if (!keys.includes(activeMarketKey)) setActiveMarketKey(keys[0] || "");
  }, [activeMarketKey, session.markets]);
  const visibleMarkets = separateMarketTabs
    ? session.markets.filter(
        (market) =>
          String(market.conditionId || market.id || market.slug) === activeMarketKey,
      )
    : session.markets;

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
    <div className="pb-8">
      <div className="sticky top-0 z-20 -mx-1 mb-6 border-b border-border/60 bg-background/90 px-1 pb-4 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1">
            <h2 className="text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Polymarket live dashboard
            </h2>
            <p className="text-sm text-muted-foreground">
              {session.markets.length} market{session.markets.length === 1 ? "" : "s"}
              {" · "}
              {session.feedTypes.length} feed{session.feedTypes.length === 1 ? "" : "s"} per market
              {" · "}
              seeded with REST history, then streamed live
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-medium text-foreground">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full bg-emerald-500",
                  !paused && runningCount > 0 && "animate-pulse",
                )}
                aria-hidden
              />
              {paused ? "Paused" : `Live ${runningCount}/${session.feedTypes.length}`}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={onSubscribeMore}
            >
              <Plus className="size-3.5" aria-hidden />
              Add markets
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={togglePause}
            >
              {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={onOpenEditor}
            >
              <SlidersHorizontal className="size-3.5" aria-hidden />
              Editor mode
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs text-muted-foreground"
              onClick={onStop}
            >
              <Square className="size-3.5" aria-hidden />
              Stop
            </Button>
          </div>
        </div>
      </div>

      {session.seedErrors?.length ? (
        <p className="mb-6 rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Live feeds are connected, but some REST seed requests failed:{" "}
          {session.seedErrors.join(" · ")}. Those charts stay pinned until live data arrives.
        </p>
      ) : null}

      {separateMarketTabs && session.markets.length > 1 ? (
        <div
          className="mb-6 flex gap-1 overflow-x-auto border-b border-border/60"
          role="tablist"
          aria-label="Live markets"
        >
          {session.markets.map((market) => {
            const key = String(market.conditionId || market.id || market.slug);
            const active = key === activeMarketKey;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveMarketKey(key)}
                className={cn(
                  "max-w-64 shrink-0 border-b-2 px-3 py-2 text-left text-xs font-medium transition-colors",
                  active
                    ? "border-secondary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="block truncate">
                  {market.title || market.slug || market.id}
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-normal text-muted-foreground">
                  {(market.selectedOutcomes || []).join(" · ")}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {visibleMarkets.map((market) => {
        const marketKey = String(market.conditionId || market.id || market.slug);
        const order = orderByMarket[marketKey] || session.feedTypes;
        return (
          <section key={marketKey} className="mb-8 last:mb-6">
            <div className="mb-4 min-w-0 space-y-1">
              {market.eventTitle ? (
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {market.eventTitle}
                </p>
              ) : null}
              <h3 className="text-balance text-base font-semibold tracking-tight text-foreground sm:text-lg">
                {market.title || market.slug || market.id}
              </h3>
              <p className="text-sm text-muted-foreground">
                {(market.selectedOutcomes || []).join(" · ")}
              </p>
            </div>
            <div className="grid auto-rows-[20rem] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {order.map((feedType) => {
                const cardKey = `${marketKey}:${feedType}`;
                const wide = wideCards.has(cardKey);
                const sheetId = session.sheetsByFeed[feedType];
                const stream = streams[sheetId];
                const overlayKeys =
                  feedType === "last_trade_price" ? lastTradeOverlays[marketKey] || [] : [];
                const overlayMarkets =
                  feedType === "last_trade_price"
                    ? overlayKeys
                        .map((key) =>
                          session.markets.find(
                            (candidate) => polymarketRealtimeMarketKey(candidate) === key,
                          ),
                        )
                        .filter(Boolean)
                    : [];
                const chartMarkets =
                  feedType === "last_trade_price" && overlayMarkets.length
                    ? [market, ...overlayMarkets]
                    : null;
                const rows = chartMarkets
                  ? marketsRows(rowsByFeed[feedType], chartMarkets)
                  : marketRows(rowsByFeed[feedType], market);
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
                      "group flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-card/40",
                      wide && "sm:col-span-2",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-border/50 px-3 py-2.5">
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="truncate text-sm font-medium leading-snug text-foreground">
                          {FEED_LABELS[feedType]}
                          {feedType === "candlesticks" ? ` · ${session.candleInterval}` : ""}
                          <span className="font-normal text-muted-foreground">
                            {" — "}
                            {stream?.isRunning ? "live" : stream?.connecting ? "connecting…" : "waiting"}
                          </span>
                        </h4>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          {seedCount} REST seed{seedCount === 1 ? "" : "s"}
                          {" · "}
                          {liveCount} live update{liveCount === 1 ? "" : "s"}
                          {overlayMarkets.length
                            ? ` · ${overlayMarkets.length + 1} markets`
                            : ""}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex shrink-0 items-center gap-0.5",
                          feedType !== "last_trade_price" &&
                            "opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100",
                        )}
                      >
                        {feedType === "last_trade_price" && session.markets.length > 1 ? (
                          <LastTradeOverlayMenu
                            primaryMarketKey={marketKey}
                            sessionMarkets={session.markets}
                            overlayKeys={overlayKeys}
                            onToggle={(overlayKey, checked) =>
                              setLastTradeOverlays((current) => {
                                const previous = current[marketKey] || [];
                                const next = checked
                                  ? [...new Set([...previous, overlayKey])]
                                  : previous.filter((key) => key !== overlayKey);
                                return { ...current, [marketKey]: next };
                              })
                            }
                          />
                        ) : null}
                        <GripVertical
                          className="size-3.5 cursor-grab text-muted-foreground"
                          aria-hidden
                        />
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
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden p-2">
                      <FeedVisualization
                        feedType={feedType}
                        rows={rows}
                        market={market}
                        chartMarkets={chartMarkets}
                        paused={paused}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-muted/15 px-4 py-3">
        <p className="min-w-0 flex-1 text-pretty text-sm text-muted-foreground">
          Historical REST data stays pinned in every chart while live updates stream in. You can
          always subscribe to more markets later.
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 shrink-0 gap-1.5 px-3 text-xs"
          onClick={onSubscribeMore}
        >
          <ArrowLeft className="size-3.5 rotate-180" aria-hidden />
          Subscribe to more markets
        </Button>
      </div>
    </div>
  );
}
