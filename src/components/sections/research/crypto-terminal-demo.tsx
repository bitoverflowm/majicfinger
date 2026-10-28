"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { DataCardFrame } from "../data-sources/data-card-frame";
import { formatNumber, seriesPath, seriesPoint, useDemoVisibility, useInterval } from "../data-sources/demo-hooks";
import { mulberry32 } from "../features/feature-kit";

const BINANCE = "#F0B90B";
const CHAINLINK = "#375BD2";
const POLYMARKET = "#2E5CFF";

/** One 15-minute market, sped up: each step is 15 seconds of market time. */
const STEPS = 60;
const STEP_MS = 250;
const HOLD_STEPS = 10;
const CHAINLINK_EVERY = 4;
/** Static frame for SSR and reduced motion: a window that is well underway. */
const START_STEP = 38;

type MarketWindow = { binance: number[]; chainlink: number[]; up: number[]; beat: number };

function buildWindow(seed: number, start: number): MarketWindow {
  const rand = mulberry32(seed);
  const drift = (rand() - 0.5) * 9;
  const binance: number[] = [];
  let price = start;
  for (let i = 0; i <= STEPS; i++) {
    price += drift + (rand() - 0.5) * 42;
    binance.push(Math.round(price * 100) / 100);
  }
  const chainlink = binance.map((_, i) => {
    const anchor = binance[Math.floor(i / CHAINLINK_EVERY) * CHAINLINK_EVERY];
    return Math.round((anchor - 3 + (rand() - 0.5) * 4) * 100) / 100;
  });
  const beat = chainlink[0];
  const up = chainlink.map((value, i) => {
    const remaining = STEPS - i;
    const z = (value - beat) / (14 * Math.sqrt(remaining + 1));
    return Math.round((100 / (1 + Math.exp(-z * 3.2))) * 10) / 10;
  });
  return { binance, chainlink, up, beat };
}

function countdown(step: number) {
  const seconds = Math.max(0, (STEPS - step) * 15);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

const usd = (value: number) => `$${formatNumber(value, 2)}`;

export function CryptoTerminalDemo() {
  const { ref, running } = useDemoVisibility();
  const [state, setState] = useState(() => ({ round: 1, step: START_STEP, window: buildWindow(1, 97_380) }));

  useInterval(
    () =>
      setState((s) => {
        if (s.step < STEPS + HOLD_STEPS) return { ...s, step: s.step + 1 };
        const round = s.round + 1;
        return { round, step: 0, window: buildWindow(round, s.window.binance[STEPS]) };
      }),
    STEP_MS,
    running,
  );

  const { window: w } = state;
  const step = Math.min(state.step, STEPS);
  const settled = state.step >= STEPS;
  const binance = w.binance.slice(0, step + 1);
  const chainlink = w.chainlink.slice(0, step + 1);
  const up = w.up.slice(0, step + 1);
  const lastChainlink = chainlink[chainlink.length - 1];
  const lastUp = up[up.length - 1];
  const resolvedUp = lastChainlink >= w.beat;

  const all = [...w.binance, ...w.chainlink, w.beat];
  const priceBox = { w: 300, h: 100, min: Math.min(...all) - 8, max: Math.max(...all) + 8, slots: STEPS + 1, pad: 6 };
  const oddsBox = { w: 300, h: 40, min: 0, max: 100, slots: STEPS + 1, pad: 3 };
  const beatY = seriesPoint([w.beat], 0, { ...priceBox, slots: 1 }).y;
  const head = seriesPoint(binance, binance.length - 1, priceBox);

  return (
    <DataCardFrame title="Crypto research terminal" frameRef={ref}>
      <div className="shrink-0 border-b border-border px-3.5 pb-2 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="flex size-4 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white"
              style={{ backgroundColor: POLYMARKET }}
            >
              P
            </span>
            <p className="truncate text-[12px] font-medium text-primary">BTC Up or Down · 15 min</p>
          </div>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-primary">
            {settled ? "Resolved" : countdown(step)}
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#2E5CFF] transition-[width] duration-200 ease-linear"
            style={{ width: `${(step / STEPS) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 px-3.5 pb-2 pt-2">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Polymarket odds</span>
          <span className="font-mono text-[11px] font-medium tabular-nums text-primary">
            Up {Math.round(lastUp)}% <span className="text-muted-foreground">· Down {100 - Math.round(lastUp)}%</span>
          </span>
        </div>
        <svg viewBox="0 0 300 40" preserveAspectRatio="none" className="h-9 w-full shrink-0" aria-hidden>
          <line x1="0" x2="300" y1="20" y2="20" stroke="currentColor" strokeDasharray="3 3" className="text-border" vectorEffect="non-scaling-stroke" />
          <path d={seriesPath(up, oddsBox)} fill="none" stroke={POLYMARKET} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>BTC/USD</span>
          <span className="flex items-center gap-2.5">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: BINANCE }} />
              Binance
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: CHAINLINK }} />
              Chainlink
            </span>
          </span>
        </div>
        <div className="relative min-h-0 flex-1">
          <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            <line
              x1="0"
              x2="300"
              y1={beatY}
              y2={beatY}
              stroke="#94a3b8"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
            <path d={seriesPath(binance, priceBox)} fill="none" stroke={BINANCE} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <path d={seriesPath(chainlink, priceBox)} fill="none" stroke={CHAINLINK} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <span
            className={cn(
              "absolute right-0 text-[9.5px] text-muted-foreground",
              beatY < 25 ? "pt-0.5" : "-translate-y-full pb-0.5",
            )}
            style={{ top: `${beatY}%` }}
          >
            Price to beat
          </span>
          {!settled ? (
            <span
              className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background"
              style={{ left: `${(head.x / 300) * 100}%`, top: `${head.y}%`, backgroundColor: BINANCE }}
            />
          ) : null}
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-1.5 font-mono text-[10px] tabular-nums">
          <Reading label="Binance" value={usd(binance[binance.length - 1])} />
          <Reading label="Chainlink" value={usd(lastChainlink)} />
          <Reading label="To beat" value={usd(w.beat)} />
        </div>
      </div>

      {settled ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-14 flex justify-center">
          <div
            className={cn(
              "ds-row-in rounded-lg px-3 py-1.5 text-[11px] font-medium text-white shadow-lg",
              resolvedUp ? "bg-[#10b981]" : "bg-[#e5484d]",
            )}
          >
            Resolved {resolvedUp ? "Up" : "Down"} · Chainlink {usd(lastChainlink)}
          </div>
        </div>
      ) : null}
    </DataCardFrame>
  );
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-muted px-1.5 py-1">
      <p className="truncate font-sans text-[9.5px] text-muted-foreground">{label}</p>
      <p className="truncate text-primary">{value}</p>
    </div>
  );
}
