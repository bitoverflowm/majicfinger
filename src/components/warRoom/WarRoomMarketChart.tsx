"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Liveline } from "liveline";

import { openPolymarketMarketFeed } from "@/lib/polymarketLive/openPolymarketMarketSocket";
import { fetchPriceHistory } from "@/components/terminals/holder/useMarketPriceHistory";
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

const LIVELINE_WINDOWS = [
  { label: "1m", secs: 60 },
  { label: "5m", secs: 300 },
  { label: "15m", secs: 900 },
  { label: "1h", secs: 3600 },
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
  const start = end - 60 * 60 * 6;
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

async function fetchKalshiRecentTrades(ticker: string, signal: AbortSignal): Promise<TradeRow[]> {
  const res = await fetch(
    `/api/integrations/kalshi-live/markets/trades?${new URLSearchParams({ ticker, limit: "40" })}`,
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

export function WarRoomMarketChart({
  venue,
  tokenIds,
  ticker,
  className,
  chartClassName,
  tall,
  onLivePrice,
  onMove,
}: {
  venue?: string | null;
  tokenIds?: string[] | null;
  ticker?: string | null;
  className?: string;
  chartClassName?: string;
  /** Roomier chart + trade list for the left detail panel. */
  tall?: boolean;
  onLivePrice?: (price: number | null) => void;
  /** 6h move from seeded history when the desk quote has no move. */
  onMove?: (move: number | null) => void;
}) {
  const [points, setPoints] = useState<LivePoint[]>([]);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const pointsRef = useRef<LivePoint[]>([]);
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

  useEffect(() => {
    const abort = new AbortController();
    setPoints([]);
    setTrades([]);
    setLivePrice(null);
    onLivePriceRef.current?.(null);
    onMoveRef.current?.(null);

    if (venue === "polymarket" && tokenId) {
      seedPolymarketHistory(tokenId, abort.signal)
        .then((seed) => {
          if (abort.signal.aborted) return;
          setPoints(seed);
          if (seed.length) {
            const last = seed[seed.length - 1].value;
            const first = seed[0].value;
            setLivePrice(last);
            onMoveRef.current?.(Number((last - first).toFixed(4)));
          }
        })
        .catch(() => {});

      const close = openPolymarketMarketFeed({
        assetIds: [tokenId],
        onTrade: (trade: { asset_id?: string; price?: number; size?: number; side?: string }) => {
          const price = asProb(trade.price);
          if (price == null) return;
          const now = Date.now() / 1000;
          const nextPoints = [...pointsRef.current, { time: now, value: price }].slice(-400);
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
      const pull = () =>
        fetchKalshiRecentTrades(ticker, abort.signal)
          .then((rows) => {
            if (abort.signal.aborted || !rows.length) return;
            setTrades(rows);
            const chron = [...rows].sort((a, b) => a.at - b.at);
            const nextPoints = chron.map((row) => ({ time: row.at / 1000, value: row.price }));
            pointsRef.current = nextPoints;
            setPoints(nextPoints);
            const last = chron[chron.length - 1]?.price ?? null;
            const first = chron[0]?.price ?? null;
            setLivePrice(last);
            if (last != null && first != null) onMoveRef.current?.(Number((last - first).toFixed(4)));
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
  }, [venue, tokenId, ticker]);

  const liveData = useMemo(() => points, [points]);
  const value = livePrice ?? liveData[liveData.length - 1]?.value ?? 0;

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      <div
        className={cn(
          "min-h-0 overflow-hidden rounded-md border border-white/10 bg-black/40",
          tall ? "h-[min(42%,18rem)] min-h-[12rem] flex-1" : "h-[7.5rem]",
          chartClassName,
        )}
      >
        <Liveline
          data={liveData}
          value={value}
          theme="dark"
          color="#60a5fa"
          momentum
          showValue
          valueMomentumColor
          windows={LIVELINE_WINDOWS}
          windowStyle="rounded"
          exaggerate
          scrub
          degen
          badge
          badgeVariant="default"
          loading={!liveData.length}
          emptyText="Waiting for live prices"
          formatValue={formatProb}
          className="h-full min-h-0 w-full"
          style={{ backgroundColor: "transparent" }}
        />
      </div>
      <div className="min-h-0">
        <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Live trades
        </p>
        <TradesFeed trades={trades} tall={tall} />
      </div>
    </div>
  );
}
