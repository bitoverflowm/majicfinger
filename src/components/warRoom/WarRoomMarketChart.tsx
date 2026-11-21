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
];

function formatProb(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}¢`;
}

async function seedPolymarketHistory(tokenId: string, signal: AbortSignal): Promise<LivePoint[]> {
  const end = Math.floor(Date.now() / 1000);
  const start = end - 60 * 60 * 6;
  const histories = await fetchPriceHistory([tokenId], start, end, signal);
  return (histories[0] || []).map((point) => ({
    time: point.t > 1e12 ? point.t / 1000 : point.t,
    value: point.p,
  }));
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
      const price =
        Number(row.yes_price_dollars) ||
        (Number(row.yes_price) > 1 ? Number(row.yes_price) / 100 : Number(row.yes_price)) ||
        NaN;
      const at = Date.parse(String(row.created_time || "")) || Date.now() - index * 1000;
      const id = String(row.trade_id || row.id || `${ticker}-${at}`);
      if (!Number.isFinite(price)) return null;
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

function TradesFeed({ trades }: { trades: TradeRow[] }) {
  if (!trades.length) {
    return <p className="py-1.5 text-[10px] text-slate-500">Waiting for prints…</p>;
  }
  return (
    <ul className="max-h-[5.5rem] overflow-y-auto">
      {trades.slice(0, 20).map((trade) => {
        const side = String(trade.side || "").toUpperCase();
        const buy = side.includes("BUY");
        const sell = side.includes("SELL");
        return (
          <li
            key={trade.id}
            className="flex items-center gap-2 border-b border-white/[0.04] py-1 text-[10px] last:border-b-0"
          >
            <span
              className={cn(
                "w-8 shrink-0 font-semibold uppercase",
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
  onLivePrice,
}: {
  venue?: string | null;
  tokenIds?: string[] | null;
  ticker?: string | null;
  className?: string;
  onLivePrice?: (price: number | null) => void;
}) {
  const [points, setPoints] = useState<LivePoint[]>([]);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const pointsRef = useRef<LivePoint[]>([]);
  const onLivePriceRef = useRef(onLivePrice);
  onLivePriceRef.current = onLivePrice;
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

    if (venue === "polymarket" && tokenId) {
      seedPolymarketHistory(tokenId, abort.signal)
        .then((seed) => {
          if (abort.signal.aborted) return;
          setPoints(seed);
          if (seed.length) setLivePrice(seed[seed.length - 1].value);
        })
        .catch(() => {});

      const close = openPolymarketMarketFeed({
        assetIds: [tokenId],
        onTrade: (trade: { asset_id?: string; price?: number; size?: number; side?: string }) => {
          const price = Number(trade.price);
          if (!Number.isFinite(price)) return;
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
          const price = Number(quote.mid ?? quote.price);
          if (!Number.isFinite(price)) return;
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
            setLivePrice(chron[chron.length - 1]?.price ?? null);
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
    <div className={cn("space-y-1.5", className)}>
      <div className="h-[7.5rem] overflow-hidden rounded-md border border-white/10 bg-black/40">
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
      <div>
        <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Prints
        </p>
        <TradesFeed trades={trades} />
      </div>
    </div>
  );
}
