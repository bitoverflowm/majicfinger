"use client";

import { Check, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { DataCardFrame } from "../data-sources/data-card-frame";
import { seriesPath, seriesPoint, useDemoVisibility, useTick } from "../data-sources/demo-hooks";
import { mulberry32, usePhases } from "../features/feature-kit";

const KALSHI = "#28CC95";
const POLYMARKET = "#2E5CFF";

const TABS = ["Price history", "Activity", "Rules"] as const;
const PHASE_MS = [3800, 3600, 5200];

function walk(seed: number, start: number, end: number, n: number) {
  const rand = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => {
    const trend = start + ((end - start) * i) / (n - 1);
    return Math.round((trend + (rand() - 0.5) * 2.2) * 10) / 10;
  });
}

const KALSHI_SERIES = walk(41, 57, 64, 30);
const POLY_SERIES = walk(42, 56, 61, 30);

const ACTIVITY = [
  { label: "24h volume", kalshi: "$1.8M", poly: "$2.4M", kalshiShare: 0.43 },
  { label: "Trades today", kalshi: "6,210", poly: "9,884", kalshiShare: 0.39 },
  { label: "Open interest", kalshi: "$12.6M", poly: "$9.1M", kalshiShare: 0.58 },
] as const;

const RULES = [
  { label: "Event", kalshi: "Fed cuts rates", poly: "Fed cuts rates", match: true },
  { label: "Window", kalshi: "Dec 10 meeting", poly: "By Dec 31", match: false },
  { label: "Size", kalshi: "Any cut", poly: "Any cut", match: true },
  { label: "Source", kalshi: "Fed release", poly: "FOMC statement", match: true },
] as const;

export function OddsCompareDemo() {
  const { ref, running } = useDemoVisibility();
  const [picked, setPicked] = useState<number | null>(null);
  const { phase, loop } = usePhases(PHASE_MS, running && picked === null);
  const tab = picked ?? phase;
  const tick = useTick(1500, running);
  const jitter = (seed: number) => Math.round((mulberry32(seed * 97 + tick)() - 0.5) * 2);
  const kalshi = 64 + jitter(1);
  const poly = 61 + jitter(2);
  const gap = kalshi - poly;

  return (
    <DataCardFrame title="Kalshi vs Polymarket" frameRef={ref}>
      <div className="shrink-0 border-b border-border px-3.5 pb-2.5 pt-2">
        <p className="mb-1.5 truncate text-[12px] font-medium text-primary">Fed cuts rates in December?</p>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <VenuePrice name="Kalshi" mark="K" color={KALSHI} price={kalshi} />
          <span
            key={gap}
            className="ds-fade rounded-full bg-[#f59e0b]/15 px-2 py-0.5 text-[10px] font-medium tabular-nums text-[#b45309]"
          >
            {Math.abs(gap)}¢ gap
          </span>
          <VenuePrice name="Polymarket" mark="P" color={POLYMARKET} price={poly} />
        </div>
      </div>

      <div className="flex shrink-0 gap-1 px-2.5 pt-2">
        {TABS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setPicked(i)}
            aria-pressed={tab === i}
            className={cn(
              "h-6 rounded-md px-2 text-[10.5px] font-medium transition-colors",
              tab === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-primary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div key={`${tab}-${loop}`} className="ds-fade flex min-h-0 flex-1 flex-col px-3.5 pb-2.5 pt-2">
        {tab === 0 ? <PriceHistory /> : tab === 1 ? <Activity /> : <Rules />}
      </div>
    </DataCardFrame>
  );
}

function VenuePrice({ name, mark, color, price }: { name: string; mark: string; color: string; price: number }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 rounded-lg bg-muted px-2 py-1">
      <span
        className="flex size-4 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {mark}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[9.5px] text-muted-foreground">{name}</span>
        <span className="block font-mono text-[13px] font-medium tabular-nums text-primary">{price}¢</span>
      </span>
    </div>
  );
}

const CHART_W = 300;
const CHART_H = 110;

type Box = { w: number; h: number; min: number; max: number };

/** Shaded band between the two venues' lines. */
function gapArea(box: Box) {
  const point = (values: readonly number[], i: number) => seriesPoint(values, i, box);
  const top = KALSHI_SERIES.map((_, i) => point(KALSHI_SERIES, i));
  const bottom = POLY_SERIES.map((_, i) => point(POLY_SERIES, i)).reverse();
  return [...top, ...bottom].map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
}

function PriceHistory() {
  const box: Box = { w: CHART_W, h: CHART_H, min: 52, max: 68 };
  return (
    <>
      <div className="mb-1 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3 rounded" style={{ backgroundColor: KALSHI }} /> Kalshi
        </span>
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3 rounded" style={{ backgroundColor: POLYMARKET }} /> Polymarket
        </span>
        <span className="ml-auto">Last 30 days</span>
      </div>
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" className="min-h-0 w-full flex-1" aria-hidden>
        <path d={gapArea(box)} fill="#f59e0b" opacity="0.1" />
        <g className="ds-draw">
          <path d={seriesPath(KALSHI_SERIES, box)} fill="none" stroke={KALSHI} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <path d={seriesPath(POLY_SERIES, box)} fill="none" stroke={POLYMARKET} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    </>
  );
}

function Activity() {
  return (
    <div className="flex flex-col gap-2.5">
      {ACTIVITY.map((row, i) => (
        <div key={row.label} className="ds-row-in" style={{ animationDelay: `${i * 110}ms` }}>
          <div className="mb-1 flex items-center justify-between text-[10.5px]">
            <span className="font-mono tabular-nums text-primary">{row.kalshi}</span>
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-mono tabular-nums text-primary">{row.poly}</span>
          </div>
          <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
            <span className="ds-grow-x h-full rounded-l-full" style={{ width: `${row.kalshiShare * 100}%`, backgroundColor: KALSHI }} />
            <span className="h-full flex-1 rounded-r-full" style={{ backgroundColor: POLYMARKET }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Rules() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-[3.75rem_minmax(0,1fr)_minmax(0,1fr)_0.875rem] gap-2 pb-1 text-[10px] text-muted-foreground">
        <span />
        <span>Kalshi</span>
        <span>Polymarket</span>
        <span />
      </div>
      {RULES.map((rule, i) => (
        <div
          key={rule.label}
          className={cn(
            "ds-row-in grid h-7 grid-cols-[3.75rem_minmax(0,1fr)_minmax(0,1fr)_0.875rem] items-center gap-2 border-t border-border text-[10.5px]",
            !rule.match && "bg-[#f59e0b]/10",
          )}
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <span className="text-muted-foreground">{rule.label}</span>
          <span className="truncate text-primary">{rule.kalshi}</span>
          <span className="truncate text-primary">{rule.poly}</span>
          {rule.match ? (
            <Check className="size-3.5 text-[#0f9f6e]" strokeWidth={3} />
          ) : (
            <TriangleAlert className="size-3.5 text-[#d97706]" />
          )}
        </div>
      ))}
      <p className="ds-fade mt-auto text-[10.5px] text-primary" style={{ animationDelay: "650ms" }}>
        Polymarket also counts an emergency cut, so part of the gap may reflect a different question.
      </p>
    </div>
  );
}
