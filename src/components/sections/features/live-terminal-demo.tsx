"use client";

import { Check, Plus, Save } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { FeatureWindow, mulberry32, useInView, usePhases, useReducedMotion } from "./feature-kit";

const KALSHI = "#28CC95";
const POLYMARKET = "#2E5CFF";
const CHAINLINK = "#375BD2";

const TICK_MS = 900;
const SERIES_LEN = 160;
const WINDOW = 32;
const TRADE_ROWS = 5;

/** Live BTC desk, the price feed gets added, switch to the Fed desk, then save. */
const PHASES = [3200, 3800, 4200, 3600] as const;

type Desk = {
  id: string;
  tab: string;
  market: string;
  kalshi: readonly number[];
  polymarket: readonly number[];
  seed: number;
};

function walk(seed: number, start: number, step: number, min: number, max: number) {
  const rand = mulberry32(seed);
  const out: number[] = [];
  let value = start;
  for (let i = 0; i < SERIES_LEN; i++) {
    value = Math.min(max, Math.max(min, value + (rand() - 0.5) * step));
    out.push(Math.round(value * 10) / 10);
  }
  return out;
}

function follow(base: readonly number[], seed: number, offset: number) {
  const rand = mulberry32(seed);
  return base.map((v) => Math.round((v - offset + (rand() - 0.5) * 1.2) * 10) / 10);
}

const BTC_KALSHI = walk(11, 41, 1.6, 34, 48);
const FED_KALSHI = walk(23, 64, 1.4, 58, 71);

const DESKS: readonly Desk[] = [
  {
    id: "btc",
    tab: "BTC desk",
    market: "Bitcoin above $100k on Dec 31?",
    kalshi: BTC_KALSHI,
    polymarket: follow(BTC_KALSHI, 12, 2),
    seed: 100,
  },
  {
    id: "fed",
    tab: "Fed desk",
    market: "Fed cuts rates in December?",
    kalshi: FED_KALSHI,
    polymarket: follow(FED_KALSHI, 24, 1.5),
    seed: 200,
  },
];

const BTC_FEED = walk(31, 97400, 90, 96200, 98600);

const WATCHLIST = [
  { name: "CPI above 3% in October?", base: 58 },
  { name: "Fed hikes in 2026?", base: 9 },
  { name: "Recession in 2026?", base: 27 },
] as const;

const windowOf = (series: readonly number[], tick: number) => {
  const start = tick % (SERIES_LEN - WINDOW);
  return series.slice(start, start + WINDOW);
};

const rand = (seed: number) => mulberry32(seed)();

const lastOf = (values: readonly number[]) => values[values.length - 1];

function clock(tick: number) {
  const total = 9 * 3600 + 41 * 60 + 30 + tick * 3;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function LiveTerminalDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const running = inView && !reduced;
  const [manual, setManual] = useState(false);
  const { phase } = usePhases(PHASES, running && !manual);
  const [tick, setTick] = useState(0);
  const [deskIndex, setDeskIndex] = useState(0);
  const [feedAdded, setFeedAdded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (manual) return;
    setDeskIndex(phase >= 2 ? 1 : 0);
    setFeedAdded(phase >= 1);
    setSaved(phase === 3);
  }, [phase, manual]);

  const takeOver = () => setManual(true);
  const desk = DESKS[deskIndex];

  return (
    <div ref={rootRef} className="size-full">
      <FeatureWindow title="Lychee Terminal · Morning research" className="size-full">
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border px-2">
            {DESKS.map((d, i) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  takeOver();
                  setDeskIndex(i);
                  setSaved(false);
                }}
                aria-pressed={i === deskIndex}
                className={cn(
                  "h-6 rounded-md px-2.5 text-[11px] font-medium transition-colors",
                  i === deskIndex ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted hover:text-primary",
                )}
              >
                {d.tab}
              </button>
            ))}
            <span className="flex size-6 items-center justify-center text-muted-foreground" aria-hidden>
              <Plus className="size-3.5" />
            </span>
            <span className="ml-auto hidden items-center gap-1.5 text-[10px] text-muted-foreground sm:flex">
              <span className="size-1.5 animate-pulse rounded-full bg-[#10b981]" />
              Live
            </span>
            <button
              type="button"
              onClick={() => {
                takeOver();
                setSaved(true);
              }}
              className={cn(
                "ml-auto inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors sm:ml-2",
                saved
                  ? "bg-[#10b981]/10 text-[#0f9f6e]"
                  : "bg-primary text-primary-foreground hover:opacity-90",
              )}
            >
              {saved ? <Check className="size-3" strokeWidth={3} /> : <Save className="size-3" />}
              {saved ? "Saved" : "Save"}
            </button>
          </div>

          <div
            key={desk.id}
            className="grid min-h-0 flex-1 grid-rows-[minmax(0,1.1fr)_minmax(0,1fr)] gap-2 bg-muted p-2 [animation:fx-rise_.35s_both]"
          >
            <ChartPanel desk={desk} tick={tick} />
            <div className="grid min-h-0 grid-cols-2 gap-2 sm:grid-cols-3">
              <TradesPanel desk={desk} tick={tick} />
              <OrderBookPanel desk={desk} tick={tick} />
              {desk.id === "btc" ? (
                feedAdded ? (
                  <FeedPanel tick={tick} />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      takeOver();
                      setFeedAdded(true);
                    }}
                    className="flex min-h-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-background/60 text-center text-muted-foreground transition-colors hover:bg-background hover:text-primary"
                  >
                    <Plus className="size-4" />
                    <span className="text-[11px] font-medium">Add a price feed</span>
                    <span className="text-[10px]">Binance · Chainlink</span>
                  </button>
                )
              ) : (
                <WatchlistPanel tick={tick} />
              )}
            </div>
          </div>

          {saved ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
              <div className="flex items-center gap-2 truncate rounded-lg bg-primary px-3 py-2 text-[11px] text-primary-foreground shadow-lg [animation:fx-rise_.35s_both]">
                <Check className="size-3.5 shrink-0 text-[#10b981]" strokeWidth={3} />
                Terminal saved. Reopen this layout anytime.
              </div>
            </div>
          ) : null}
        </div>
      </FeatureWindow>
    </div>
  );
}

function Panel({
  title,
  meta,
  className,
  children,
}: {
  title: ReactNode;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-background", className)}>
      <div className="flex h-7 shrink-0 items-center justify-between gap-2 border-b border-border px-2.5 text-[10.5px]">
        <span className="min-w-0 truncate font-medium text-primary">{title}</span>
        {meta ? <span className="shrink-0 text-muted-foreground">{meta}</span> : null}
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}

const CHART_W = 300;
const CHART_H = 100;

function sharedPaths(series: readonly (readonly number[])[]) {
  const all = series.flat();
  const min = Math.min(...all) - 1;
  const max = Math.max(...all) + 1;
  return series.map((values) =>
    values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * CHART_W;
        const y = 6 + (1 - (v - min) / (max - min)) * (CHART_H - 12);
        return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" "),
  );
}

function ChartPanel({ desk, tick }: { desk: Desk; tick: number }) {
  const kalshi = windowOf(desk.kalshi, tick);
  const polymarket = windowOf(desk.polymarket, tick);
  const [kPath, pPath] = sharedPaths([kalshi, polymarket]);
  const legend = [
    { name: "Kalshi", color: KALSHI, value: lastOf(kalshi) },
    { name: "Polymarket", color: POLYMARKET, value: lastOf(polymarket) },
  ];
  return (
    <Panel title={desk.market} meta="Yes price">
      <div className="absolute left-2.5 top-1.5 z-10 flex gap-3 text-[10.5px]">
        {legend.map((item) => (
          <span key={item.name} className="flex items-center gap-1 text-muted-foreground">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.name}
            <span className="font-mono font-medium tabular-nums text-primary">{Math.round(item.value)}¢</span>
          </span>
        ))}
      </div>
      <div className="absolute inset-x-2.5 bottom-1.5 top-6">
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" className="size-full overflow-visible" aria-hidden>
          <path d={kPath} fill="none" stroke={KALSHI} strokeWidth="2" vectorEffect="non-scaling-stroke" className="fx-morph" />
          <path d={pPath} fill="none" stroke={POLYMARKET} strokeWidth="2" vectorEffect="non-scaling-stroke" className="fx-morph" />
        </svg>
      </div>
    </Panel>
  );
}

function TradesPanel({ desk, tick }: { desk: Desk; tick: number }) {
  const rows = Array.from({ length: TRADE_ROWS }, (_, i) => {
    const t = tick - i;
    const r = mulberry32(desk.seed * 1000 + t + 50);
    const kalshiTrade = r() < 0.55;
    const series = kalshiTrade ? desk.kalshi : desk.polymarket;
    const price = Math.round(lastOf(windowOf(series, Math.max(0, t))) + (r() - 0.5) * 2);
    const yes = r() < 0.6;
    return {
      key: t,
      time: clock(t),
      venue: kalshiTrade ? "K" : "P",
      color: kalshiTrade ? KALSHI : POLYMARKET,
      side: yes ? "Yes" : "No",
      price: yes ? price : 100 - price,
      qty: Math.round(5 + r() ** 2 * 480),
    };
  });
  return (
    <Panel title="Trades" meta="Both venues">
      <ul className="flex flex-col">
        {rows.map((row, i) => (
          <li
            key={row.key}
            className={cn(
              "flex h-[1.375rem] items-center gap-1.5 border-b border-border px-2 text-[10px]",
              i === 0 && "[animation:fx-slide-in_.35s_ease-out_both]",
            )}
          >
            <span className="hidden font-mono tabular-nums text-muted-foreground lg:inline">{row.time}</span>
            <span
              className="flex size-3.5 shrink-0 items-center justify-center rounded-[3px] text-[8px] font-bold text-white"
              style={{ backgroundColor: row.color }}
            >
              {row.venue}
            </span>
            <span className={row.side === "Yes" ? "text-[#0f9f6e]" : "text-[#e5484d]"}>{row.side}</span>
            <span className="ml-auto font-mono tabular-nums text-primary">{row.price}¢</span>
            <span className="w-7 text-right font-mono tabular-nums text-muted-foreground">{row.qty}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function OrderBookPanel({ desk, tick }: { desk: Desk; tick: number }) {
  const mid = Math.round(lastOf(windowOf(desk.kalshi, tick)));
  const level = (price: number, i: number, side: number) => ({
    price,
    size: Math.round(300 + rand(desk.seed * 7 + i * 131 + side * 17 + tick) * 2400),
  });
  const asks = [3, 2, 1].map((d, i) => level(mid + d, i, 1));
  const bids = [0, 1, 2].map((d, i) => level(mid - d, i, 2));
  const max = Math.max(...asks.map((l) => l.size), ...bids.map((l) => l.size));
  const row = (l: { price: number; size: number }, color: string, text: string) => (
    <li key={l.price} className="relative flex h-[1.2rem] items-center justify-between px-2 font-mono text-[10px] tabular-nums">
      <span
        className="absolute inset-y-0.5 right-0 rounded-l-sm transition-[width] duration-500"
        style={{ width: `${(l.size / max) * 100}%`, backgroundColor: color }}
      />
      <span className={cn("relative", text)}>{l.price}¢</span>
      <span className="relative text-primary">{l.size.toLocaleString("en-US")}</span>
    </li>
  );
  return (
    <Panel title="Order book" meta="Kalshi" className="hidden sm:flex">
      <ul className="flex flex-col pt-0.5">
        {asks.map((l) => row(l, "rgba(229,72,77,0.12)", "text-[#e5484d]"))}
        <li className="flex h-[1.2rem] items-center justify-center border-y border-border text-[9.5px] text-muted-foreground">
          Spread 1¢
        </li>
        {bids.map((l) => row(l, "rgba(16,185,129,0.14)", "text-[#0f9f6e]"))}
      </ul>
    </Panel>
  );
}

function FeedPanel({ tick }: { tick: number }) {
  const values = windowOf(BTC_FEED, tick);
  const last = lastOf(values);
  const change = last - values[0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const path = values
    .map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * 100).toFixed(1)} ${(4 + (1 - (v - min) / (max - min || 1)) * 52).toFixed(1)}`)
    .join(" ");
  return (
    <Panel title="BTC/USD" meta="Chainlink" className="[animation:fx-rise_.45s_both] ring-2 ring-[#375BD2]/30">
      <div className="flex h-full flex-col px-2.5 pb-1.5 pt-1.5">
        <p className="font-mono text-sm font-medium tabular-nums text-primary">
          ${last.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </p>
        <p className={cn("font-mono text-[10px] tabular-nums", change >= 0 ? "text-[#0f9f6e]" : "text-[#e5484d]")}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(1)} · 60s TWAP
        </p>
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="mt-1 min-h-0 w-full flex-1" aria-hidden>
          <path d={path} fill="none" stroke={CHAINLINK} strokeWidth="2" vectorEffect="non-scaling-stroke" className="fx-morph" />
        </svg>
      </div>
    </Panel>
  );
}

function WatchlistPanel({ tick }: { tick: number }) {
  return (
    <Panel title="Watchlist" meta="Following">
      <ul className="flex flex-col">
        {WATCHLIST.map((item, i) => {
          const wave = Math.round(Math.sin(tick * 0.6 + i * 2) * 1.6);
          const value = item.base + wave;
          return (
            <li key={item.name} className="flex h-[1.9rem] items-center gap-2 border-b border-border px-2.5 text-[10.5px]">
              <span className="min-w-0 flex-1 truncate text-primary">{item.name}</span>
              <span className="font-mono tabular-nums text-primary">{value}¢</span>
              <span
                className={cn(
                  "w-6 text-right font-mono text-[10px] tabular-nums",
                  wave > 0 ? "text-[#0f9f6e]" : wave < 0 ? "text-[#e5484d]" : "text-muted-foreground",
                )}
              >
                {wave > 0 ? "+" : ""}
                {wave}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
