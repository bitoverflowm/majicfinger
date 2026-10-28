"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Chip, mulberry32 } from "../features/feature-kit";
import { DataCardFrame } from "./data-card-frame";
import { formatNumber, seriesPath, seriesPoint, useDemoVisibility, useInterval } from "./demo-hooks";

const CHART_W = 320;

function LiveDot({ color }: { color: string }) {
  return <span className="size-1.5 shrink-0 animate-pulse rounded-full" style={{ backgroundColor: color }} />;
}

function EndDot({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  return (
    <span
      className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4"
      style={{
        left: `${(x / w) * 100}%`,
        top: `${(y / h) * 100}%`,
        backgroundColor: color,
        ["--tw-ring-color" as string]: `${color}33`,
      }}
      aria-hidden
    />
  );
}

/* Binance: spot price next to the Polymarket odds that track it. */

const PAIRS = [
  { id: "BTC", base: 97412.5, decimals: 2, vol: 0.00035 },
  { id: "ETH", base: 3612.4, decimals: 2, vol: 0.0005 },
  { id: "SOL", base: 186.42, decimals: 2, vol: 0.0007 },
  { id: "XRP", base: 2.4113, decimals: 4, vol: 0.0008 },
  { id: "BNB", base: 692.3, decimals: 2, vol: 0.0005 },
  { id: "DOGE", base: 0.38412, decimals: 5, vol: 0.001 },
] as const;

const BINANCE_POINTS = 48;
const PRICE_H = 64;
const ODDS_H = 40;
const BINANCE_YELLOW = "#F0B90B";
const POLY_BLUE = "#2E5CFF";

type SpotState = { pair: number; prices: number[]; odds: number[]; open: number; move: number };

function upOdds(price: number, open: number, vol: number) {
  const z = (price - open) / (open * vol * 5);
  return Math.min(97, Math.max(3, 100 / (1 + Math.exp(-z))));
}

function stepSpot(state: SpotState, rand: () => number): SpotState {
  const { vol } = PAIRS[state.pair];
  const last = state.prices[state.prices.length - 1];
  const price = last * (1 + (rand() - 0.5) * 2 * vol);
  const target = upOdds(price, state.open, vol);
  const odds = state.odds[state.odds.length - 1] * 0.6 + target * 0.4;
  return {
    ...state,
    prices: [...state.prices.slice(1), price],
    odds: [...state.odds.slice(1), odds],
    move: Math.sign(price - last),
  };
}

function seedSpot(pair: number): SpotState {
  const rand = mulberry32(pair * 13 + 5);
  const { base, vol } = PAIRS[pair];
  const open = base * (1 - vol * 3);
  let state: SpotState = {
    pair,
    prices: Array(BINANCE_POINTS).fill(open),
    odds: Array(BINANCE_POINTS).fill(50),
    open,
    move: 0,
  };
  for (let i = 0; i < BINANCE_POINTS; i++) state = stepSpot(state, rand);
  return { ...state, move: 0 };
}

export function BinanceFeedDemo() {
  const { ref, running } = useDemoVisibility();
  const rand = useRef(mulberry32(211));
  const [state, setState] = useState(() => seedSpot(0));
  useInterval(() => setState((s) => stepSpot(s, rand.current)), 1000, running);

  const pair = PAIRS[state.pair];
  const price = state.prices[state.prices.length - 1];
  const odds = state.odds[state.odds.length - 1];
  const change = ((price - state.open) / state.open) * 100;
  const priceMin = Math.min(...state.prices);
  const priceMax = Math.max(...state.prices);
  const priceBox = { w: CHART_W, h: PRICE_H, min: priceMin, max: priceMax, pad: 8 };
  const oddsBox = { w: CHART_W, h: ODDS_H, min: 0, max: 100, pad: 6 };
  const priceDot = seriesPoint(state.prices, BINANCE_POINTS - 1, priceBox);
  const oddsDot = seriesPoint(state.odds, BINANCE_POINTS - 1, oddsBox);

  return (
    <DataCardFrame title="Binance spot" frameRef={ref}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black p-1">
            <img src="/binance.jpeg" alt="" className="size-full rounded-sm object-contain" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-primary">{pair.id} / USDT</p>
            <p className="truncate text-[10px] text-muted-foreground">Binance spot · about one tick a second</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p
            key={state.prices.length + price}
            className={cn(
              "font-mono text-sm font-medium tabular-nums",
              state.move > 0 ? "ds-up" : state.move < 0 ? "ds-down" : "text-primary",
            )}
          >
            {formatNumber(price, pair.decimals)}
          </p>
          <p className={cn("font-mono text-[10px] tabular-nums", change >= 0 ? "text-[#0f9f6e]" : "text-[#e5484d]")}>
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}% · 15m
          </p>
        </div>
      </div>

      <div className="flex items-center gap-0.5 border-b border-border px-2.5 py-1.5">
        {PAIRS.map((p, i) => (
          <Chip key={p.id} active={state.pair === i} onClick={() => setState(seedSpot(i))}>
            {p.id}
          </Chip>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 px-3.5 pt-2">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <LiveDot color={BINANCE_YELLOW} />
          <span className="truncate">{pair.id}/USDT · Binance</span>
        </div>
        <div className="relative shrink-0" style={{ height: PRICE_H }}>
          <svg viewBox={`0 0 ${CHART_W} ${PRICE_H}`} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
            <path
              d={seriesPath(state.prices, priceBox)}
              fill="none"
              stroke={BINANCE_YELLOW}
              strokeWidth="1.75"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <EndDot x={priceDot.x} y={priceDot.y} w={CHART_W} h={PRICE_H} color={BINANCE_YELLOW} />
        </div>

        <div className="flex items-center gap-1.5 border-t border-dashed border-border pt-2 text-[10px] text-muted-foreground">
          <LiveDot color={POLY_BLUE} />
          <span className="min-w-0 flex-1 truncate">Polymarket · {pair.id} Up or Down, 15 min</span>
          <span className="shrink-0 font-mono tabular-nums text-primary">Up {Math.round(odds)}¢</span>
        </div>
        <div className="relative shrink-0" style={{ height: ODDS_H }}>
          <svg viewBox={`0 0 ${CHART_W} ${ODDS_H}`} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
            <line
              x1="0"
              x2={CHART_W}
              y1={ODDS_H / 2}
              y2={ODDS_H / 2}
              stroke="currentColor"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
              className="text-border"
            />
            <path
              d={seriesPath(state.odds, oddsBox)}
              fill="none"
              stroke={POLY_BLUE}
              strokeWidth="1.75"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <EndDot x={oddsDot.x} y={oddsDot.y} w={CHART_W} h={ODDS_H} color={POLY_BLUE} />
        </div>
      </div>
    </DataCardFrame>
  );
}

/* Chainlink: the 60-second TWAP settling a 15-minute Up/Down window, sped up. */

const WINDOW_TICKS = 60;
const SECONDS_PER_TICK = 15;
const SETTLED_HOLD_TICKS = 10;
const CHAINLINK_BLUE = "#375BD2";
const FEEDS = [
  { id: "twap60", label: "60s TWAP" },
  { id: "spot", label: "Spot" },
  { id: "twap30", label: "30s TWAP (legacy)" },
] as const;

type UpDownWindow = {
  beat: number;
  twap: number[];
  settled: { up: boolean; final: number } | null;
  hold: number;
};

function stepWindow(win: UpDownWindow, rand: () => number): UpDownWindow {
  const last = win.twap[win.twap.length - 1];
  if (win.settled) {
    if (win.hold > 0) return { ...win, hold: win.hold - 1 };
    return { beat: last, twap: [last], settled: null, hold: 0 };
  }
  const twap = [...win.twap, last + (rand() - 0.48) * 16];
  if (twap.length > WINDOW_TICKS) {
    const final = twap[twap.length - 1];
    return { ...win, twap, settled: { up: final >= win.beat, final }, hold: SETTLED_HOLD_TICKS };
  }
  return { ...win, twap };
}

function seedWindow(): UpDownWindow {
  const rand = mulberry32(73);
  let win: UpDownWindow = { beat: 97412.5, twap: [97412.5], settled: null, hold: 0 };
  for (let i = 0; i < 34; i++) win = stepWindow(win, rand);
  return win;
}

function feedValue(feed: (typeof FEEDS)[number]["id"], twap: number, i: number) {
  if (feed === "spot") return twap + Math.sin(i * 1.7) * 9 + Math.sin(i * 0.6) * 5;
  if (feed === "twap30") return twap + Math.sin(i * 1.7) * 4;
  return twap;
}

function clockLabel(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ChainlinkFeedDemo() {
  const { ref, running } = useDemoVisibility();
  const rand = useRef(mulberry32(907));
  const [win, setWin] = useState(seedWindow);
  const [feed, setFeed] = useState<(typeof FEEDS)[number]["id"]>("twap60");
  useInterval(() => setWin((w) => stepWindow(w, rand.current)), 250, running);

  const values = win.twap.map((v, i) => feedValue(feed, v, i));
  const settlement = win.twap[win.twap.length - 1];
  const delta = settlement - win.beat;
  const up = delta >= 0;
  const spread = Math.max(40, ...values.map((v) => Math.abs(v - win.beat))) * 1.3;
  const box = { w: CHART_W, h: 120, min: win.beat - spread, max: win.beat + spread, slots: WINDOW_TICKS + 1, pad: 6 };
  const beatY = 6 + (1 - (win.beat - box.min) / (box.max - box.min)) * (120 - 12);
  const dot = seriesPoint(values, values.length - 1, box);
  const remaining = Math.max(0, WINDOW_TICKS - (win.twap.length - 1)) * SECONDS_PER_TICK;
  const lineColor = up ? "#10b981" : "#e5484d";

  return (
    <DataCardFrame title="Chainlink settlement prices" frameRef={ref}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#375BD2] p-1">
            <img src="/chainlink.png" alt="" className="size-full rounded-sm object-contain" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-primary">BTC Up or Down · 15 min</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              Price to beat ${formatNumber(win.beat, 2)}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm font-medium tabular-nums text-primary">
            {win.settled ? "00:00" : clockLabel(remaining)}
          </p>
          <p className="text-[10px] text-muted-foreground">{win.settled ? "Settled" : "Settles in"}</p>
        </div>
      </div>

      <div className="flex items-center gap-0.5 border-b border-border px-2.5 py-1.5">
        {FEEDS.map((f) => (
          <Chip key={f.id} active={feed === f.id} onClick={() => setFeed(f.id)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 px-3.5 pb-1 pt-2.5 text-[10px] text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5">
          <LiveDot color={CHAINLINK_BLUE} />
          <span className="truncate">Chainlink BTC/USD · settles on the 60s TWAP</span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-px font-mono font-medium tabular-nums",
            up ? "bg-[#10b981]/10 text-[#0f9f6e]" : "bg-[#e5484d]/10 text-[#e5484d]",
          )}
        >
          {up ? "Up" : "Down"} {up ? "+" : "−"}${formatNumber(Math.abs(delta), 2)}
        </span>
      </div>

      <div className="relative mx-3.5 h-[120px] shrink-0">
        <svg viewBox={`0 0 ${CHART_W} 120`} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
          <line
            x1="0"
            x2={CHART_W}
            y1={beatY}
            y2={beatY}
            stroke={CHAINLINK_BLUE}
            strokeOpacity="0.6"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={seriesPath(values, box)}
            fill="none"
            stroke={lineColor}
            strokeWidth="1.75"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="transition-[stroke] duration-300"
          />
        </svg>
        <span
          className="absolute right-0 -translate-y-full pb-0.5 font-mono text-[9.5px] text-[#375BD2]"
          style={{ top: `${(beatY / 120) * 100}%` }}
        >
          Price to beat
        </span>
        <EndDot x={dot.x} y={dot.y} w={CHART_W} h={120} color={lineColor} />
        {win.settled ? (
          <div className="ds-row-in absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium shadow-sm",
                win.settled.up ? "bg-[#10b981] text-white" : "bg-[#e5484d] text-white",
              )}
            >
              Settled {win.settled.up ? "Up" : "Down"} at ${formatNumber(win.settled.final, 2)}
            </span>
          </div>
        ) : null}
      </div>
    </DataCardFrame>
  );
}
