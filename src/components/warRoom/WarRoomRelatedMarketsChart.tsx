"use client";

import { useEffect, useMemo, useState } from "react";
import { Liveline } from "liveline";

import { fetchPriceHistory } from "@/components/terminals/holder/useMarketPriceHistory";
import { cn } from "@/lib/utils";
import { parseWarRoomMarketId } from "@/lib/warRoom/ids";

import { formatCents } from "./format";
import type { MarketRow } from "./MarketsPane";

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

const LIVELINE_WINDOWS = [
  { label: "1h", secs: 3600 },
  { label: "6h", secs: 6 * 3600 },
  { label: "1d", secs: 24 * 3600 },
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
  const start = end - 60 * 60 * 24;
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
  const res = await fetch(
    `/api/integrations/kalshi-live/markets/trades?${new URLSearchParams({ ticker, limit: "50" })}`,
    { credentials: "same-origin", signal },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  const rows = Array.isArray(body?.trades) ? body.trades : [];
  return rows
    .map((row: Record<string, unknown>, index: number) => {
      const price = asProb(row.yes_price_dollars ?? row.yes_price);
      const at = Date.parse(String(row.created_time || "")) || Date.now() - index * 1000;
      if (price == null) return null;
      return { time: at / 1000, value: price };
    })
    .filter(Boolean)
    .sort((a, b) => (a!.time as number) - (b!.time as number)) as LivePoint[];
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
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [loading, setLoading] = useState(false);

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
      <p className="rounded-md border border-dashed border-white/10 px-2 py-2 text-[11px] text-slate-500">
        Related market prices will show here once contracts are linked.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Related prices
        </p>
        {loading ? <span className="text-[10px] text-slate-500">Loading…</span> : null}
      </div>
      <div className="h-[11.5rem] overflow-hidden rounded-md border border-white/10 bg-black/40">
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
          theme="dark"
          color={primary?.color || "#60a5fa"}
          momentum
          showValue
          valueMomentumColor
          windows={LIVELINE_WINDOWS}
          windowStyle="rounded"
          exaggerate
          scrub
          seriesToggleCompact
          loading={loading && !series.length}
          emptyText="Waiting for related prices"
          formatValue={formatProb}
          className="h-full min-h-0 w-full"
          style={{ backgroundColor: "transparent" }}
        />
      </div>
      {series.length ? (
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {series.map((row) => (
            <li key={row.id} className="flex min-w-0 items-center gap-1.5 text-[10px] text-slate-400">
              <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
              <span className="truncate">{row.label}</span>
              <span className="shrink-0 font-mono tabular-nums text-slate-200">{formatCents(row.value)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
