"use client";

import { useEffect, useMemo, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Liveline } from "liveline";

import { fetchPriceHistory } from "@/components/terminals/holder/useMarketPriceHistory";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { parseWarRoomMarketId } from "@/lib/warRoom/ids";

import { formatCents } from "./format";
import type { MarketRow } from "./MarketsPane";
import { useWarRoomTheme } from "./useWarRoomTheme";

type LivePoint = { time: number; value: number };

function yesTokenIds(market: MarketRow | null | undefined): string[] {
  if (!market) return [];
  const yes = (market.outcomes || []).find((o) => {
    const label = String(o?.label || o?.id || "").toLowerCase();
    return label === "yes" || label.startsWith("yes");
  });
  if (yes?.tokenId) return [String(yes.tokenId)];
  if (market.tokenIds?.length) return [String(market.tokenIds[0])];
  return (market.outcomes || []).map((o) => o?.tokenId).filter(Boolean) as string[];
}
type SeriesRow = {
  id: string;
  label: string;
  color: string;
  data: LivePoint[];
  value: number;
};

const SERIES_COLORS = ["#2E5CFF", "#28CC95", "#F472B6", "#FBBF24", "#A78BFA", "#38BDF8"];

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

function shortLabel(title: string, max = 28) {
  const text = String(title || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
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

async function seedKalshiHistory(ticker: string, signal: AbortSignal): Promise<LivePoint[]> {
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
  if (!res.ok) {
    // Fall back to recent trades if candles are unavailable.
    const tradeRes = await fetch(
      `/api/integrations/kalshi-live/markets/trades?${new URLSearchParams({ ticker, limit: "100" })}`,
      { credentials: "same-origin", signal },
    );
    const tradeBody = await tradeRes.json().catch(() => ({}));
    if (!tradeRes.ok) return [];
    const rows = Array.isArray(tradeBody?.trades) ? tradeBody.trades : [];
    return rows
      .map((row: Record<string, unknown>, index: number) => {
        const price = asProb(row.yes_price_dollars ?? row.yes_price);
        const at = Date.parse(String(row.created_time || "")) || Date.now() - index * 1000;
        if (price == null) return null;
        return { time: at / 1000, value: price };
      })
      .filter(Boolean)
      .sort((a: LivePoint, b: LivePoint) => a.time - b.time) as LivePoint[];
  }
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

/**
 * Overlay YES prices for related markets on one Liveline so the news panel
 * can show a quick snapshot of what those contracts are doing.
 */
export function WarRoomRelatedMarketsChart({
  markets,
  className,
}: {
  markets: MarketRow[];
  className?: string;
}) {
  const { dark, chartTheme } = useWarRoomTheme();
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [windowSecs, setWindowSecs] = useState(DEFAULT_WINDOW_SECS);
  const [fullscreen, setFullscreen] = useState(false);
  const chartSurface = dark
    ? "border-white/10 bg-black/40"
    : "border-border/70 bg-white";
  const iconBtn = dark
    ? "border-white/10 bg-black/40 text-slate-300 hover:bg-black/70 hover:text-white"
    : "border-border/70 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground";

  const chartable = useMemo(() => {
    return markets
      .map((market, index) => {
        const parsed = parseWarRoomMarketId(market.id);
        const venue = String(market.venue || parsed?.venue || "").toLowerCase();
        const tokenId = yesTokenIds(market)[0] || null;
        const ticker =
          venue === "kalshi"
            ? String(parsed?.venueMarketId || market.venueMarketId || "").trim() || null
            : null;
        if (venue === "polymarket" && !tokenId) return null;
        if (venue === "kalshi" && !ticker) return null;
        if (venue !== "polymarket" && venue !== "kalshi") return null;
        return {
          market,
          venue,
          tokenId,
          ticker,
          color: SERIES_COLORS[index % SERIES_COLORS.length],
        };
      })
      .filter(Boolean)
      .slice(0, 5) as Array<{
      market: MarketRow;
      venue: string;
      tokenId: string | null;
      ticker: string | null;
      color: string;
    }>;
  }, [markets]);

  const chartKey = useMemo(
    () =>
      chartable
        .map((row) => `${row.market.id}:${row.tokenId || row.ticker || ""}`)
        .join("|"),
    [chartable],
  );

  useEffect(() => {
    if (!chartable.length) {
      setSeries([]);
      setLoading(false);
      return;
    }
    const abort = new AbortController();
    setLoading(true);
    setWindowSecs(DEFAULT_WINDOW_SECS);
    Promise.all(
      chartable.map(async (row) => {
        const data =
          row.venue === "polymarket" && row.tokenId
            ? await seedPolymarketHistory(row.tokenId, abort.signal).catch(() => [])
            : row.venue === "kalshi" && row.ticker
              ? await seedKalshiHistory(row.ticker, abort.signal).catch(() => [])
              : [];
        const last = data[data.length - 1]?.value ?? asProb(row.market.price);
        if (last == null && !data.length) return null;
        const points =
          data.length > 0
            ? data
            : last != null
              ? [
                  { time: Date.now() / 1000 - 3600, value: last },
                  { time: Date.now() / 1000, value: last },
                ]
              : [];
        if (!points.length) return null;
        return {
          id: row.market.id,
          label: shortLabel(row.market.title),
          color: row.color,
          data: points,
          value: points[points.length - 1].value,
        } satisfies SeriesRow;
      }),
    )
      .then((rows) => {
        if (abort.signal.aborted) return;
        setSeries(rows.filter(Boolean) as SeriesRow[]);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
    // chartKey captures market/token identity; chartable is rebuilt alongside it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartKey]);

  const primary = series[0];

  if (!chartable.length) {
    return (
      <p
        className={cn(
          "rounded-md border border-dashed px-2 py-2 text-[11px]",
          dark ? "border-white/10 text-slate-500" : "border-border/70 text-muted-foreground",
        )}
      >
        Related market prices will show here once contracts are linked.
      </p>
    );
  }

  const chartBody = (
    <Liveline
      data={primary?.data || []}
      value={primary?.value ?? 0}
      series={series.map((row) => ({
        id: row.id,
        data: row.data,
        value: row.value,
        color: row.color,
        label: row.label,
      }))}
      theme={chartTheme}
      color={primary?.color || (dark ? "#60a5fa" : "#2563eb")}
      momentum
      showValue
      valueMomentumColor
      window={windowSecs}
      windows={LIVELINE_WINDOWS}
      onWindowChange={setWindowSecs}
      windowStyle="rounded"
      scrub
      seriesToggleCompact
      loading={loading && !series.length}
      emptyText="Waiting for related prices"
      formatValue={formatProb}
      padding={{ top: 36, right: 52, bottom: 24, left: 10 }}
      className="h-full min-h-0 w-full"
      style={{ backgroundColor: "transparent" }}
    />
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "text-[9px] font-semibold uppercase tracking-[0.14em]",
            dark ? "text-slate-500" : "text-muted-foreground",
          )}
        >
          Related prices
        </p>
        <div className="flex items-center gap-2">
          {loading ? (
            <span className={cn("text-[10px]", dark ? "text-slate-500" : "text-muted-foreground")}>
              Loading…
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className={cn("inline-flex size-7 items-center justify-center rounded-md border", iconBtn)}
            aria-label="Open related chart fullscreen"
            title="Fullscreen"
          >
            <Maximize2 className="size-3.5" />
          </button>
        </div>
      </div>
      <div className={cn("relative h-[11.5rem] overflow-hidden rounded-md border", chartSurface)}>
        {chartBody}
      </div>
      {series.length ? (
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {series.map((row) => (
            <li
              key={row.id}
              className={cn(
                "flex min-w-0 items-center gap-1.5 text-[10px]",
                dark ? "text-slate-400" : "text-muted-foreground",
              )}
            >
              <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
              <span className="truncate">{row.label}</span>
              <span
                className={cn(
                  "shrink-0 font-mono tabular-nums",
                  dark ? "text-slate-200" : "text-foreground",
                )}
              >
                {formatCents(row.value)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent
          className={cn(
            "flex h-[min(92svh,52rem)] w-[min(96vw,72rem)] max-w-none flex-col gap-3 overflow-hidden p-3 pt-10 sm:rounded-xl",
            dark
              ? "border-white/10 bg-[#07090f] text-slate-100"
              : "border-border bg-background text-foreground",
          )}
        >
          <div className="min-w-0 pr-8">
            <DialogTitle
              className={cn("text-[14px] font-medium", dark ? "text-slate-50" : "text-foreground")}
            >
              Related prices
            </DialogTitle>
            <p
              className={cn(
                "mt-0.5 text-[10px] uppercase tracking-[0.12em]",
                dark ? "text-slate-500" : "text-muted-foreground",
              )}
            >
              Focus mode
            </p>
          </div>
          <div className={cn("min-h-0 flex-1 overflow-hidden rounded-md border", chartSurface)}>
            {chartBody}
          </div>
          {series.length ? (
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {series.map((row) => (
                <li
                  key={row.id}
                  className={cn(
                    "flex min-w-0 items-center gap-1.5 text-[10px]",
                    dark ? "text-slate-400" : "text-muted-foreground",
                  )}
                >
                  <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                  <span className="truncate">{row.label}</span>
                  <span
                    className={cn(
                      "shrink-0 font-mono tabular-nums",
                      dark ? "text-slate-200" : "text-foreground",
                    )}
                  >
                    {formatCents(row.value)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
