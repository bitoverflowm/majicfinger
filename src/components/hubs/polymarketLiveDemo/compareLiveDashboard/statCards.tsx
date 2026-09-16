"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import { ChartSkeleton } from "@/components/spectrumui/charts/chart-engine";
import { useHtmlDarkClass } from "@/hooks/use-html-dark-class";
import { cn } from "@/lib/utils";

import {
  KALSHI_GREEN,
  POLYMARKET_BLUE,
  type BookLevel,
  type CandlePoint,
  type DashboardLiveState,
  type DashboardPair,
  type PricePoint,
} from "./types";

const UP = "#059669";
const DOWN = "#e11d48";
const UP_DARK = "#34d399";
const DOWN_DARK = "#fb7185";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function formatCount(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) < 1000) return String(Math.round(value));
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: digits,
  }).format(value);
}

function formatMoney(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${formatCount(value)}`;
}

function formatCents(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}¢`;
}

function toCents(price: number): number {
  return price <= 1.5 ? price * 100 : price;
}

function monotonePath(points: { x: number; y: number }[]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${points[0]!.x},${points[0]!.y}`;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = points[i + 1]!.x - points[i]!.x;
    slope[i] = dx[i] === 0 ? 0 : (points[i + 1]!.y - points[i]!.y) / dx[i]!;
  }
  const tangent = new Array<number>(n);
  tangent[0] = slope[0]!;
  tangent[n - 1] = slope[n - 2]!;
  for (let i = 1; i < n - 1; i += 1) {
    if (slope[i - 1]! * slope[i]! <= 0) tangent[i] = 0;
    else {
      const w1 = 2 * dx[i]! + dx[i - 1]!;
      const w2 = dx[i]! + 2 * dx[i - 1]!;
      tangent[i] = (w1 + w2) / (w1 / slope[i - 1]! + w2 / slope[i]!);
    }
  }
  let d = `M${points[0]!.x},${points[0]!.y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const c1x = points[i]!.x + dx[i]! / 3;
    const c1y = points[i]!.y + (tangent[i]! * dx[i]!) / 3;
    const c2x = points[i + 1]!.x - dx[i]! / 3;
    const c2y = points[i + 1]!.y - (tangent[i + 1]! * dx[i]!) / 3;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${points[i + 1]!.x.toFixed(2)},${points[i + 1]!.y.toFixed(2)}`;
  }
  return d;
}

function seriesFromCandles(candles: CandlePoint[]): number[] {
  return candles.slice(-36).map((row) => toCents(row.c)).filter((v) => Number.isFinite(v));
}

function seriesFromHistory(points: PricePoint[]): number[] {
  return points.slice(-36).map((row) => row.v).filter((v) => Number.isFinite(v));
}

function bookTop(book: { bids: BookLevel[]; asks: BookLevel[] }) {
  const bid = book.bids[0];
  const ask = book.asks[0];
  return {
    bid: bid ? toCents(bid.price) : null,
    ask: ask ? toCents(ask.price) : null,
    bidSize: bid?.size ?? 0,
    askSize: ask?.size ?? 0,
    spread: bid && ask ? Math.max(0, toCents(ask.price) - toCents(bid.price)) : null,
    depth: (bid?.size ?? 0) + (ask?.size ?? 0),
  };
}

type StatCardModel = {
  id: string;
  label: string;
  series?: number[];
  value?: number;
  previous?: number;
  format: (value: number) => string;
  goodWhen?: "up" | "down";
  deltaLabel?: string;
  caption?: string;
};

function StatCard({
  card,
  index,
  onRemove,
}: {
  card: StatCardModel;
  index: number;
  onRemove: () => void;
}) {
  const { label, series, goodWhen = "up", deltaLabel = "vs start of window", caption } = card;
  const [hover, setHover] = useState<number | null>(null);
  const sparkRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const [box, setBox] = useState({ w: 0, h: 0 });
  const dark = useHtmlDarkClass();

  const n = series?.length ?? 0;
  const headline = card.value ?? series?.[n - 1] ?? 0;
  const shown = hover != null && series ? series[hover]! : headline;
  const base = card.previous ?? series?.[0] ?? 0;
  const delta =
    card.previous != null || series ? (base ? ((headline - base) / Math.abs(base)) * 100 : 0) : null;
  const rising = (delta ?? 0) >= 0;
  const good = goodWhen === "up" ? rising : !rising;
  const color = good ? (dark ? UP_DARK : UP) : dark ? DOWN_DARK : DOWN;

  useEffect(() => {
    const node = sparkRef.current;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      setBox({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(node);
    const rect = node.getBoundingClientRect();
    setBox({ w: rect.width, h: rect.height });
    return () => ro.disconnect();
  }, []);

  const spark = useMemo(() => {
    if (!series || n < 2 || box.w <= 0 || box.h <= 0) return null;
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of series) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    const span = hi - lo || 1;
    const points = series.map((v, i) => ({
      x: 3 + (i / (n - 1)) * (box.w - 6),
      y: 7 + (1 - (v - lo) / span) * (box.h - 16),
    }));
    const line = monotonePath(points);
    const extremes: number[] = [];
    for (let i = 1; i < n - 1; i += 1) {
      if ((series[i]! - series[i - 1]!) * (series[i + 1]! - series[i]!) < 0) extremes.push(i);
    }
    return {
      line,
      area: `${line}L${points[n - 1]!.x},${box.h}L${points[0]!.x},${box.h}Z`,
      points,
      extremes: extremes.slice(0, 5),
    };
  }, [box.h, box.w, n, series]);

  const onMove = (clientX: number) => {
    const node = sparkRef.current;
    if (!node || n < 2) return;
    const rect = node.getBoundingClientRect();
    const t = (clientX - rect.left) / Math.max(1, rect.width);
    setHover(Math.max(0, Math.min(n - 1, Math.round(t * (n - 1)))));
  };

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHover(null);
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        setHover((current) => {
          const start = current ?? n - 1;
          const next = start + (event.key === "ArrowRight" ? 1 : -1);
          return Math.max(0, Math.min(n - 1, next));
        });
      }
    },
    [n],
  );

  const scrubDot = hover != null && spark ? spark.points[hover] : null;

  return (
    <div
      className="relative flex items-stretch justify-between gap-4 rounded-2xl border border-black/8 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.02]"
      role="img"
      aria-label={`${label}: ${card.format(headline)}${
        delta != null
          ? `, ${rising ? "up" : "down"} ${Math.abs(delta).toFixed(0)} percent ${deltaLabel}`
          : ""
      }.`}
      style={{ animation: `spectrum-mc-enter 420ms ${EASE} ${index * 70}ms both` }}
    >
      <button
        type="button"
        className="absolute right-2 top-2 z-10 rounded-md p-1 text-muted-foreground/70 hover:bg-muted/60 hover:text-foreground"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
      >
        <X className="size-3" />
      </button>
      <div className="min-w-0 flex-1 pr-4">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-foreground">
          {card.format(shown)}
        </p>
        <p
          className={cn(
            "mt-1.5 text-[11px] font-medium",
            delta == null
              ? "text-muted-foreground"
              : good
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
          )}
        >
          {hover != null && series
            ? `point ${hover + 1} of ${n}`
            : delta != null
              ? `${rising ? "↑" : "↓"} ${Math.abs(delta).toFixed(0)}% ${deltaLabel}`
              : caption || " "}
        </p>
      </div>
      {series && n >= 2 ? (
        <div
          ref={sparkRef}
          className="relative w-[42%] max-w-48 shrink-0 cursor-crosshair touch-pan-y select-none self-stretch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 dark:focus-visible:ring-white/20"
          style={{ minHeight: 58 }}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setHover(null)}
          onPointerMove={(event) => onMove(event.clientX)}
          onPointerDown={(event) => onMove(event.clientX)}
          onPointerLeave={() => setHover(null)}
        >
          {spark ? (
            <svg
              width={box.w}
              height={box.h}
              viewBox={`0 0 ${box.w} ${box.h}`}
              className="block h-full w-full overflow-visible"
              aria-hidden
            >
              <defs>
                <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={spark.area} fill={`url(#${uid}-fill)`} />
              <path
                d={spark.line}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {spark.extremes.map((i) => (
                <circle key={i} cx={spark.points[i]!.x} cy={spark.points[i]!.y} r={2.5} fill={color} />
              ))}
              {scrubDot ? (
                <circle
                  cx={scrubDot.x}
                  cy={scrubDot.y}
                  r={4.5}
                  className="fill-white dark:fill-neutral-950"
                  stroke={color}
                  strokeWidth={2}
                />
              ) : null}
            </svg>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function DashboardStatCards({
  pair,
  state,
}: {
  pair: DashboardPair;
  state: DashboardLiveState;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const kalshiSeries = seriesFromCandles(state.kalshiCandles);
  const polySeries =
    seriesFromCandles(state.polyCandles).length > 1
      ? seriesFromCandles(state.polyCandles)
      : seriesFromHistory(state.polyHistory);
  const spreadSeries = useMemo(() => {
    const len = Math.min(kalshiSeries.length, polySeries.length);
    if (len < 2) return [];
    const k = kalshiSeries.slice(-len);
    const p = polySeries.slice(-len);
    return k.map((value, i) => p[i]! - value);
  }, [kalshiSeries, polySeries]);
  const kalshiBook = bookTop(state.kalshiBook);
  const polyBook = bookTop(state.polyBook);
  const kalshiTrades = state.trades.filter((row) => row.venue === "kalshi");
  const polyTrades = state.trades.filter((row) => row.venue === "polymarket");
  const volume = (state.kalshiVolume24h || 0) + (state.polyVolume24h || 0);
  const gap =
    state.kalshiLastPct != null && state.polyLastPct != null
      ? state.polyLastPct - state.kalshiLastPct
      : null;

  const cards: StatCardModel[] = [
    {
      id: "kalshi-yes",
      label: "Kalshi YES",
      series: kalshiSeries,
      value: state.kalshiLastPct ?? kalshiSeries.at(-1),
      format: formatCents,
      deltaLabel: "vs start of window",
      caption: pair.kalshiTicker,
    },
    {
      id: "poly-yes",
      label: "Polymarket YES",
      series: polySeries,
      value: state.polyLastPct ?? polySeries.at(-1),
      format: formatCents,
      deltaLabel: "vs start of window",
      caption: String(pair.polyMarket.slug || "Polymarket"),
    },
    {
      id: "spread",
      label: "Cross-venue gap",
      series: spreadSeries,
      value: gap ?? spreadSeries.at(-1),
      format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}¢`,
      goodWhen: "down",
      deltaLabel: "Poly minus Kalshi",
      caption: gap == null ? "Waiting on both last prices" : "Descriptive only",
    },
    {
      id: "volume",
      label: "24h volume",
      value: volume,
      format: formatMoney,
      caption: `${formatMoney(state.kalshiVolume24h)} Kalshi · ${formatMoney(state.polyVolume24h)} Poly`,
    },
    {
      id: "activity",
      label: "Prints in view",
      value: kalshiTrades.length + polyTrades.length,
      format: (v) => formatCount(v, 0),
      caption: `${polyTrades.length} Poly · ${kalshiTrades.length} Kalshi`,
    },
    {
      id: "liquidity",
      label: "Top-of-book size",
      value: kalshiBook.depth + polyBook.depth,
      format: (v) => formatCount(v),
      caption: `Kalshi ${formatCount(kalshiBook.depth)} · Poly ${formatCount(polyBook.depth)}`,
    },
  ];

  const visible = cards.filter((card) => !hidden.includes(card.id));
  const loading =
    state.slices.markets === "loading" ||
    (state.slices.trades !== "ready" && !state.kalshiLastPct && !state.polyLastPct);

  if (loading && !visible.some((card) => (card.series?.length || 0) > 1 || (card.value || 0) > 0)) {
    return <ChartSkeleton height={180} variant="grid" />;
  }

  if (!visible.length) {
    return (
      <p className="px-2 py-8 text-center text-sm text-muted-foreground">
        All summary cards were removed. Delete this widget, or keep the comparison table below.
      </p>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-auto sm:grid-cols-2 xl:grid-cols-3">
      <style>{`
        @keyframes spectrum-mc-enter {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {visible.map((card, index) => (
        <StatCard
          key={card.id}
          card={card}
          index={index}
          onRemove={() => setHidden((prev) => [...prev, card.id])}
        />
      ))}
    </div>
  );
}

function formatAgo(ts: number | null) {
  if (ts == null || !Number.isFinite(ts)) return "—";
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function lastTrade(state: DashboardLiveState, venue: "kalshi" | "polymarket") {
  let latest = null as DashboardLiveState["trades"][number] | null;
  for (const row of state.trades) {
    if (row.venue !== venue) continue;
    if (!latest || row.ts > latest.ts) latest = row;
  }
  return latest;
}

export function CompareSummaryTable({
  pair,
  state,
}: {
  pair: DashboardPair;
  state: DashboardLiveState;
}) {
  const polyOutcomes = Array.isArray(pair.polyMarket.outcomes)
    ? pair.polyMarket.outcomes.map((item) => String(item))
    : [];
  const polyYes = polyOutcomes[0] || "Yes";
  const polyNo = polyOutcomes[1] || "No";
  const kalshiBook = bookTop(state.kalshiBook);
  const polyBook = bookTop(state.polyBook);
  const kalshiLast = lastTrade(state, "kalshi");
  const polyLast = lastTrade(state, "polymarket");
  const kalshiStatus = String(state.kalshiMarket?.status || "live");
  const polyStatus = pair.polyMarket.closed ? "Closed" : "Live";
  const gap =
    state.kalshiLastPct != null && state.polyLastPct != null
      ? state.polyLastPct - state.kalshiLastPct
      : null;
  const kalshiTrades = state.trades.filter((row) => row.venue === "kalshi").length;
  const polyTrades = state.trades.filter((row) => row.venue === "polymarket").length;

  const rows: { label: string; poly: string; kalshi: string; hint?: boolean }[] = [
    { label: "Market", poly: pair.polyTitle, kalshi: pair.kalshiTitle },
    {
      label: "Ticker",
      poly: String(pair.polyMarket.slug || pair.polyMarket.id || "—"),
      kalshi: pair.kalshiTicker,
    },
    { label: "YES means", poly: polyYes, kalshi: "Yes" },
    { label: "NO means", poly: polyNo, kalshi: "No" },
    { label: "YES", poly: formatCents(state.polyLastPct), kalshi: formatCents(state.kalshiLastPct) },
    {
      label: "NO",
      poly: formatCents(state.polyLastPct != null ? 100 - state.polyLastPct : null),
      kalshi: formatCents(state.kalshiLastPct != null ? 100 - state.kalshiLastPct : null),
    },
    {
      label: "Last trade",
      poly: formatAgo(polyLast?.ts ?? null),
      kalshi: formatAgo(kalshiLast?.ts ?? null),
    },
    {
      label: "Activity",
      poly: `${polyTrades} prints in view`,
      kalshi: `${kalshiTrades} trades in view`,
    },
    {
      label: "24h volume",
      poly: `${formatMoney(state.polyVolume24h)} USDC`,
      kalshi: formatMoney(state.kalshiVolume24h),
    },
    {
      label: "Total volume",
      poly: `${formatMoney(state.polyVolumeTotal)} USDC`,
      kalshi: formatMoney(state.kalshiVolumeTotal),
    },
    {
      label: "Bid / Ask",
      poly: `${formatCents(polyBook.bid)} / ${formatCents(polyBook.ask)}`,
      kalshi: `${formatCents(kalshiBook.bid)} / ${formatCents(kalshiBook.ask)}`,
    },
    {
      label: "Venue spread",
      poly: formatCents(polyBook.spread ?? state.polySpread),
      kalshi: formatCents(kalshiBook.spread ?? state.kalshiSpread),
    },
    {
      label: "Top size",
      poly: formatCount(polyBook.depth),
      kalshi: formatCount(kalshiBook.depth),
    },
    { label: "Status", poly: polyStatus, kalshi: kalshiStatus },
    {
      label: "Holders",
      poly: state.holders.length ? String(state.holders.length) : "—",
      kalshi: "—",
    },
  ];

  return (
    <div className="h-full overflow-auto">
      {gap != null ? (
        <p className="px-2 pb-2 text-[12px] text-muted-foreground">
          Polymarket is pricing YES{" "}
          <span className="font-medium text-foreground">
            {Math.abs(gap).toFixed(1)}¢ {gap >= 0 ? "higher" : "lower"}
          </span>{" "}
          than Kalshi. Descriptive only — not an arbitrage signal.
        </p>
      ) : null}
      <table className="w-full text-left text-[12px] sm:text-[13px]">
        <thead className="sticky top-0 bg-background text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5 font-medium"> </th>
            <th className="px-2 py-1.5 font-medium" style={{ color: POLYMARKET_BLUE }}>
              Polymarket
            </th>
            <th className="px-2 py-1.5 font-medium" style={{ color: KALSHI_GREEN }}>
              Kalshi
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-border/40">
              <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">{row.label}</td>
              <td className="px-2 py-1.5 font-medium text-foreground">{row.poly}</td>
              <td className="px-2 py-1.5 font-medium text-foreground">{row.kalshi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
