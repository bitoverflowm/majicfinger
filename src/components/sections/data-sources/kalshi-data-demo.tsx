"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  Chip,
  GREEN,
  mulberry32,
  useInView,
  usePhases,
  useReducedMotion,
} from "../features/feature-kit";
import { DataCardFrame } from "./data-card-frame";

const TABS = ["Trades", "Price history", "Order book"] as const;
const TAB_MS = [4400, 4400, 4400];
const TICK_MS = 1200;
const CHART_W = 320;
const CHART_H = 140;
const CHART_PAD = 10;
const BOOK_LEVELS = 5;

type Side = "Yes" | "No";
type Trade = { id: number; time: string; side: Side; price: number; size: number };
type Tape = {
  trades: Trade[];
  series: number[];
  bids: number[];
  asks: number[];
  last: number;
  move: number;
  seconds: number;
  nextId: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clock(total: number) {
  return [Math.floor(total / 3600) % 24, Math.floor(total / 60) % 60, total % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function jitterDepth(depth: readonly number[], rand: () => number) {
  return depth.map((qty) => clamp(Math.round((qty + (rand() - 0.5) * 900) / 10) * 10, 120, 5200));
}

function nextTape(tape: Tape, rand: () => number): Tape {
  const step = rand() < 0.45 ? 0 : rand() < 0.55 ? 1 : -1;
  const last = clamp(tape.last + step, 54, 72);
  const side: Side = rand() < (step > 0 ? 0.7 : step < 0 ? 0.3 : 0.5) ? "Yes" : "No";
  const seconds = tape.seconds + 3 + Math.floor(rand() * 14);
  const trade: Trade = {
    id: tape.nextId,
    time: clock(seconds),
    side,
    price: side === "Yes" ? last : 100 - last,
    size: 10 + Math.floor(rand() * 90) * 5,
  };
  return {
    trades: [trade, ...tape.trades].slice(0, 8),
    series: [...tape.series.slice(1), last],
    bids: jitterDepth(tape.bids, rand),
    asks: jitterDepth(tape.asks, rand),
    last,
    move: last - tape.last,
    seconds,
    nextId: tape.nextId + 1,
  };
}

function seedTape(): Tape {
  const rand = mulberry32(41);
  const walk: number[] = [];
  let level = 0;
  for (let i = 0; i < 64; i++) {
    level += (rand() - 0.45) * 2.6;
    walk.push(level);
  }
  const end = walk[walk.length - 1];
  let tape: Tape = {
    trades: [],
    series: walk.map((v) => clamp(Math.round(63 + v - end), 30, 85)),
    bids: [2400, 3100, 1800, 4200, 2600],
    asks: [1900, 2700, 3600, 2200, 4400],
    last: 63,
    move: 0,
    seconds: 14 * 3600 + 30 * 60,
    nextId: 0,
  };
  for (let i = 0; i < 8; i++) tape = nextTape(tape, rand);
  return { ...tape, move: 0 };
}

export function KalshiDataDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const [manualTab, setManualTab] = useState<number | null>(null);
  const { phase } = usePhases(TAB_MS, inView && !reduced && manualTab === null);
  const tab = manualTab ?? phase;
  const rand = useRef(mulberry32(97));
  const [tape, setTape] = useState(seedTape);

  useEffect(() => {
    if (!inView || reduced) return;
    const timer = window.setInterval(() => setTape((t) => nextTape(t, rand.current)), TICK_MS);
    return () => window.clearInterval(timer);
  }, [inView, reduced]);

  return (
    <DataCardFrame title="Kalshi data" frameRef={rootRef}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#28CC95] p-1">
            <img src="/kalshi.png" alt="" className="size-full rounded-sm object-contain" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-primary">Fed cuts rates in December?</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">KXFEDDECISION-26DEC-C25</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p
            key={tape.nextId}
            className={cn(
              "font-mono text-sm font-medium tabular-nums",
              tape.move > 0 ? "ds-up" : tape.move < 0 ? "ds-down" : "text-primary",
            )}
          >
            {tape.last}¢
          </p>
          <p className="text-[10px] text-muted-foreground">Yes · last</p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-border px-2.5 py-1.5">
        {TABS.map((label, i) => (
          <Chip key={label} active={tab === i} onClick={() => setManualTab(i)}>
            {label}
          </Chip>
        ))}
        <span className="ml-auto inline-flex items-center gap-1 pr-1 text-[10px] font-medium text-[#0f9f6e]">
          <span className="size-1.5 animate-pulse rounded-full bg-[#10b981]" />
          Live
        </span>
      </div>

      <div key={tab} className="ds-fade relative min-h-0 flex-1 overflow-hidden">
        {tab === 0 ? <TradesView trades={tape.trades} /> : null}
        {tab === 1 ? <PriceView series={tape.series} /> : null}
        {tab === 2 ? <BookView last={tape.last} bids={tape.bids} asks={tape.asks} /> : null}
      </div>
    </DataCardFrame>
  );
}

function SidePill({ side }: { side: Side }) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-1.5 py-px text-[10px] font-medium",
        side === "Yes" ? "bg-[#10b981]/10 text-[#0f9f6e]" : "bg-[#e5484d]/10 text-[#e5484d]",
      )}
    >
      {side}
    </span>
  );
}

function TradesView({ trades }: { trades: readonly Trade[] }) {
  return (
    <div className="text-[11px]">
      <div className="flex h-6 items-center border-b border-border bg-muted px-3.5 text-[10px] text-muted-foreground">
        <span className="w-[4.5rem]">Time</span>
        <span className="w-12">Side</span>
        <span className="w-10 text-right">Price</span>
        <span className="flex-1 text-right">Contracts</span>
      </div>
      {trades.map((trade, i) => (
        <div
          key={trade.id}
          className={cn("flex h-[26px] items-center border-b border-border px-3.5", i === 0 && "ds-row-in")}
        >
          <span className="w-[4.5rem] font-mono tabular-nums text-muted-foreground">{trade.time}</span>
          <span className="w-12">
            <SidePill side={trade.side} />
          </span>
          <span className="w-10 text-right font-mono tabular-nums text-primary">{trade.price}¢</span>
          <span className="flex-1 text-right font-mono tabular-nums text-primary">{trade.size.toLocaleString("en-US")}</span>
        </div>
      ))}
    </div>
  );
}

function PriceView({ series }: { series: readonly number[] }) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const headroom = Math.max(4, Math.round((max - min) * 0.6));
  const toY = (v: number) => CHART_PAD + (1 - (v - (min - headroom)) / (max - min + headroom * 2)) * (CHART_H - CHART_PAD * 2);
  const toX = (i: number) => (i / (series.length - 1)) * CHART_W;
  const path = series.map((v, i) => `${i ? "L" : "M"}${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(" ");
  const dot = { x: toX(series.length - 1), y: toY(series[series.length - 1]) };
  return (
    <div className="flex h-full flex-col px-3.5 pb-3 pt-2">
      <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
        <span>Yes price · full history</span>
        <span className="font-mono tabular-nums">
          {min}¢ – {max}¢
        </span>
      </div>
      <div className="relative mt-2 min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="none"
          className="ds-draw absolute inset-0 size-full overflow-visible"
          aria-hidden
        >
          <defs>
            <linearGradient id="ds-kalshi-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={GREEN} stopOpacity="0.2" />
              <stop offset="1" stopColor={GREEN} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1="0"
              x2={CHART_W}
              y1={CHART_H * f}
              y2={CHART_H * f}
              stroke="currentColor"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
              className="text-border"
            />
          ))}
          <path d={`${path} L${CHART_W} ${CHART_H} L0 ${CHART_H} Z`} fill="url(#ds-kalshi-fill)" />
          <path
            d={path}
            fill="none"
            stroke={GREEN}
            strokeWidth="1.75"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#10b981] ring-4 ring-[#10b981]/20"
          style={{ left: `${(dot.x / CHART_W) * 100}%`, top: `${(dot.y / CHART_H) * 100}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

function BookView({ last, bids, asks }: { last: number; bids: readonly number[]; asks: readonly number[] }) {
  const max = Math.max(...bids, ...asks);
  return (
    <div className="flex h-full flex-col text-[11px]">
      <div className="flex h-6 items-center justify-between border-b border-border bg-muted px-3.5 text-[10px] text-muted-foreground">
        <span>Yes bids</span>
        <span className="font-mono">Spread 2¢</span>
        <span>Yes asks</span>
      </div>
      <div className="grid grid-cols-2">
        <div className="border-r border-border">
          {bids.slice(0, BOOK_LEVELS).map((qty, i) => (
            <BookLevel key={i} price={last - 1 - i} qty={qty} share={qty / max} side="bid" />
          ))}
        </div>
        <div>
          {asks.slice(0, BOOK_LEVELS).map((qty, i) => (
            <BookLevel key={i} price={last + 1 + i} qty={qty} share={qty / max} side="ask" />
          ))}
        </div>
      </div>
    </div>
  );
}

function BookLevel({ price, qty, share, side }: { price: number; qty: number; share: number; side: "bid" | "ask" }) {
  const bid = side === "bid";
  return (
    <div className="relative flex h-[26px] items-center justify-between border-b border-border px-3">
      <span
        className={cn(
          "absolute inset-y-[3px] transition-[width] duration-700 ease-landing-smooth",
          bid ? "right-0 bg-[#10b981]/15" : "left-0 bg-[#e5484d]/15",
        )}
        style={{ width: `${Math.round(share * 100)}%` }}
        aria-hidden
      />
      <span className={cn("relative font-mono tabular-nums", bid ? "text-[#0f9f6e]" : "text-[#e5484d]")}>
        {price}¢
      </span>
      <span className="relative font-mono tabular-nums text-primary">{qty.toLocaleString("en-US")}</span>
    </div>
  );
}
