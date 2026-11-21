"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Liveline } from "liveline";

import { openPolymarketMarketFeed } from "@/lib/polymarketLive/openPolymarketMarketSocket";
import { fetchPriceHistory } from "@/components/terminals/holder/useMarketPriceHistory";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { formatAge, formatCents } from "./format";

type LivePoint = { time: number; value: number };
type TradeRow = {
  id: string;
  price: number;
  size?: number | null;
  side?: string | null;
  at: number;
};

/** Seed enough history that “All” can show the full line we fetched. */
const FULL_HISTORY_SECS = 90 * 24 * 3600;
const DEFAULT_WINDOW_SECS = 3600;
const ALL_WINDOW_SECS = FULL_HISTORY_SECS;

const LIVELINE_WINDOWS = [
  { label: "1h", secs: DEFAULT_WINDOW_SECS },
  { label: "6h", secs: 6 * 3600 },
  { label: "1d", secs: 24 * 3600 },
  { label: "7d", secs: 7 * 24 * 3600 },
  { label: "All", secs: ALL_WINDOW_SECS },
];

/** Polymarket/Kalshi prices as 0–1. Rejects garbage that would read as 800¢. */
function asProb(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n > 1 && n <= 100) return n / 100;
  if (n < 0 || n > 1) return null;
  return n;
}

function formatProb(value: number) {
  const p = asProb(value);
  if (p == null) return "—";
  return `${Math.round(p * 100)}¢`;
}

async function seedPolymarketHistory(tokenId: string, signal: AbortSignal): Promise<LivePoint[]> {
  const end = Math.floor(Date.now() / 1000);
  const start = end - FULL_HISTORY_SECS;
  const histories = await fetchPriceHistory([tokenId], start, end, signal);
  return (histories[0] || [])
    .map((point) => {
      const value = asProb(point.p);
      if (value == null) return null;
      return {
        time: point.t > 1e12 ? point.t / 1000 : point.t,
        value,
      };
    })
    .filter(Boolean) as LivePoint[];
}

/** Hourly candles across the full seed window (same stitch as Connect trade history). */
async function seedKalshiCandles(ticker: string, signal: AbortSignal): Promise<LivePoint[]> {
  const end = Math.floor(Date.now() / 1000);
  const start = end - FULL_HISTORY_SECS;
  const params = new URLSearchParams({
    market_tickers: ticker,
    start_ts: String(start),
    end_ts: String(end),
    period_interval: "60",
    per_ticker: "1",
  });
  const res = await fetch(`/api/integrations/kalshi-live/markets/candlesticks?${params}`, {
    credentials: "same-origin",
    signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  const markets = Array.isArray(body?.markets) ? body.markets : [];
  const group =
    markets.find(
      (row: { market_ticker?: string }) =>
        String(row?.market_ticker || "").toUpperCase() === ticker.toUpperCase(),
    ) || markets[0];
  const candles = Array.isArray(group?.candlesticks) ? group.candlesticks : [];
  return candles
    .map((candle: Record<string, unknown>) => {
      const t = Number(candle.end_period_ts);
      const price = candle.price && typeof candle.price === "object" ? (candle.price as Record<string, unknown>) : null;
      const yesBid =
        candle.yes_bid && typeof candle.yes_bid === "object"
          ? (candle.yes_bid as Record<string, unknown>)
          : null;
      const value = asProb(price?.close_dollars ?? yesBid?.close_dollars ?? candle.price_close_dollars);
      if (!Number.isFinite(t) || value == null) return null;
      return { time: t, value };
    })
    .filter(Boolean)
    .sort((a: LivePoint, b: LivePoint) => a.time - b.time) as LivePoint[];
}

async function fetchKalshiRecentTrades(ticker: string, signal: AbortSignal): Promise<TradeRow[]> {
  const res = await fetch(
    `/api/integrations/kalshi-live/markets/trades?${new URLSearchParams({ ticker, limit: "100" })}`,
    { credentials: "same-origin", signal },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  const rows = Array.isArray(body?.trades) ? body.trades : [];
  return rows
    .map((row: Record<string, unknown>, index: number) => {
      const price = asProb(row.yes_price_dollars ?? row.yes_price);
      const at = Date.parse(String(row.created_time || "")) || Date.now() - index * 1000;
      const id = String(row.trade_id || row.id || `${ticker}-${at}`);
      if (price == null) return null;
      return {
        id,
        price,
        size: Number(row.count ?? row.count_fp) || null,
        side: String(row.taker_side || "") || null,
        at,
      };
    })
    .filter(Boolean) as TradeRow[];
}

function mergeSeedWithTrades(seed: LivePoint[], trades: TradeRow[]): LivePoint[] {
  if (!trades.length) return seed;
  const byTime = new Map<number, number>();
  for (const point of seed) byTime.set(point.time, point.value);
  for (const trade of trades) {
    byTime.set(trade.at / 1000, trade.price);
  }
  return [...byTime.entries()]
    .map(([time, value]) => ({ time, value }))
    .sort((a, b) => a.time - b.time);
}

function TradesFeed({ trades, tall }: { trades: TradeRow[]; tall?: boolean }) {
  if (!trades.length) {
    return <p className="py-2 text-[11px] text-slate-500">Waiting for live trades…</p>;
  }
  return (
    <ul className={cn("overflow-y-auto", tall ? "max-h-[14rem]" : "max-h-[7rem]")}>
      {trades.slice(0, 40).map((trade) => {
        const side = String(trade.side || "").toUpperCase();
        const buy = side.includes("BUY");
        const sell = side.includes("SELL");
        return (
          <li
            key={trade.id}
            className="flex items-center gap-2 border-b border-white/[0.04] py-1.5 text-[11px] last:border-b-0"
          >
            <span
              className={cn(
                "w-9 shrink-0 font-semibold uppercase",
                buy && "text-emerald-300",
                sell && "text-rose-300",
                !buy && !sell && "text-slate-500",
              )}
            >
              {buy ? "Buy" : sell ? "Sell" : "Print"}
            </span>
            <span className="font-mono tabular-nums text-slate-100">{formatCents(trade.price)}</span>
            <span className="ml-auto text-slate-500">
              {trade.size != null ? Math.round(trade.size) : "—"}
              <span className="mx-1 text-slate-600">·</span>
              {formatAge(new Date(trade.at).toISOString())}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ChartCanvas({
  data,
  value,
  windowSecs,
  onWindowChange,
  loading,
  className,
}: {
  data: LivePoint[];
  value: number;
  windowSecs: number;
  onWindowChange: (secs: number) => void;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Liveline
      data={data}
      value={value}
      theme="dark"
      color="#60a5fa"
      momentum
      showValue
      valueMomentumColor
      window={windowSecs}
      windows={LIVELINE_WINDOWS}
      onWindowChange={onWindowChange}
      windowStyle="rounded"
      exaggerate
      scrub
      degen
      badge
      badgeVariant="default"
      loading={loading}
      emptyText="Waiting for live prices"
      formatValue={formatProb}
      className={cn("h-full min-h-0 w-full", className)}
      style={{ backgroundColor: "transparent" }}
    />
  );
}

export function WarRoomMarketChart({
  venue,
  tokenIds,
  ticker,
  title,
  className,
  chartClassName,
  tall,
  onLivePrice,
  onMove,
}: {
  venue?: string | null;
  tokenIds?: string[] | null;
  ticker?: string | null;
  title?: string | null;
  className?: string;
  chartClassName?: string;
  /** Roomier chart + trade list for the left detail panel. */
  tall?: boolean;
  onLivePrice?: (price: number | null) => void;
  /** Move across the seeded history window when the desk quote has no move. */
  onMove?: (move: number | null) => void;
}) {
  const [points, setPoints] = useState<LivePoint[]>([]);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [windowSecs, setWindowSecs] = useState(DEFAULT_WINDOW_SECS);
  const [fullscreen, setFullscreen] = useState(false);
  const pointsRef = useRef<LivePoint[]>([]);
  const seedRef = useRef<LivePoint[]>([]);
  const onLivePriceRef = useRef(onLivePrice);
  const onMoveRef = useRef(onMove);
  onLivePriceRef.current = onLivePrice;
  onMoveRef.current = onMove;
  const tokenId = tokenIds?.[0] || null;

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    onLivePriceRef.current?.(livePrice);
  }, [livePrice]);

  const reportMove = useCallback((seed: LivePoint[]) => {
    if (!seed.length) {
      onMoveRef.current?.(null);
      return;
    }
    const last = seed[seed.length - 1].value;
    const cutoff = seed[seed.length - 1].time - DEFAULT_WINDOW_SECS;
    const first = seed.find((point) => point.time >= cutoff)?.value ?? seed[0].value;
    setLivePrice(last);
    onMoveRef.current?.(Number((last - first).toFixed(4)));
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    setPoints([]);
    setTrades([]);
    setLivePrice(null);
    setWindowSecs(DEFAULT_WINDOW_SECS);
    seedRef.current = [];
    onLivePriceRef.current?.(null);
    onMoveRef.current?.(null);

    if (venue === "polymarket" && tokenId) {
      seedPolymarketHistory(tokenId, abort.signal)
        .then((seed) => {
          if (abort.signal.aborted) return;
          seedRef.current = seed;
          setPoints(seed);
          reportMove(seed);
        })
        .catch(() => {});

      const close = openPolymarketMarketFeed({
        assetIds: [tokenId],
        onTrade: (trade: { asset_id?: string; price?: number; size?: number; side?: string }) => {
          const price = asProb(trade.price);
          if (price == null) return;
          const now = Date.now() / 1000;
          const nextPoints = [...pointsRef.current, { time: now, value: price }].slice(-4000);
          pointsRef.current = nextPoints;
          setPoints(nextPoints);
          setLivePrice(price);
          setTrades((prev) =>
            [
              {
                id: `${trade.asset_id || tokenId}-${now}-${price}`,
                price,
                size: Number(trade.size) || null,
                side: trade.side || null,
                at: Date.now(),
              },
              ...prev,
            ].slice(0, 40),
          );
        },
        onQuote: (quote: { mid?: number; price?: number }) => {
          const price = asProb(quote.mid ?? quote.price);
          if (price == null) return;
          setLivePrice(price);
        },
      });

      return () => {
        abort.abort();
        close();
      };
    }

    if (venue === "kalshi" && ticker) {
      seedKalshiCandles(ticker, abort.signal)
        .then((seed) => {
          if (abort.signal.aborted) return;
          seedRef.current = seed;
          if (seed.length) {
            setPoints(seed);
            reportMove(seed);
          }
        })
        .catch(() => {});

      const pull = () =>
        fetchKalshiRecentTrades(ticker, abort.signal)
          .then((rows) => {
            if (abort.signal.aborted || !rows.length) return;
            setTrades(rows);
            const merged = mergeSeedWithTrades(seedRef.current, rows);
            pointsRef.current = merged;
            setPoints(merged);
            reportMove(merged);
          })
          .catch(() => {});
      pull();
      const timer = window.setInterval(pull, 4000);
      return () => {
        abort.abort();
        window.clearInterval(timer);
      };
    }

    return () => abort.abort();
  }, [venue, tokenId, ticker, reportMove]);

  const liveData = useMemo(() => points, [points]);
  const value = livePrice ?? liveData[liveData.length - 1]?.value ?? 0;
  const chartTitle = String(title || ticker || "Market").trim() || "Market";

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      <div
        className={cn(
          "relative min-h-0 overflow-hidden rounded-md border border-white/10 bg-black/40",
          tall ? "h-[min(42%,18rem)] min-h-[12rem] flex-1" : "h-[7.5rem]",
          chartClassName,
        )}
      >
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="absolute right-1.5 top-1.5 z-10 inline-flex size-7 items-center justify-center rounded-md border border-white/10 bg-black/55 text-slate-300 backdrop-blur hover:bg-black/75 hover:text-white"
          aria-label="Open chart fullscreen"
          title="Fullscreen"
        >
          <Maximize2 className="size-3.5" />
        </button>
        <ChartCanvas
          data={liveData}
          value={value}
          windowSecs={windowSecs}
          onWindowChange={setWindowSecs}
          loading={!liveData.length}
        />
      </div>
      <div className="min-h-0">
        <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Live trades
        </p>
        <TradesFeed trades={trades} tall={tall} />
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="flex h-[min(92svh,52rem)] w-[min(96vw,72rem)] max-w-none flex-col gap-3 overflow-hidden border-white/10 bg-[#07090f] p-3 pt-10 text-slate-100 sm:rounded-xl">
          <div className="min-w-0 pr-8">
            <DialogTitle className="truncate text-[14px] font-medium text-slate-50">
              {chartTitle}
            </DialogTitle>
            <p className="mt-0.5 font-mono text-[12px] tabular-nums text-slate-400">
              {formatProb(value)}
              <span className="ml-2 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                Focus mode
              </span>
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-white/10 bg-black/40">
            <ChartCanvas
              data={liveData}
              value={value}
              windowSecs={windowSecs}
              onWindowChange={setWindowSecs}
              loading={!liveData.length}
            />
          </div>
          <div className="max-h-[10rem] shrink-0 overflow-hidden">
            <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Live trades
            </p>
            <TradesFeed trades={trades} tall />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
