"use client";

import { Calculator, Check, Clock3, Merge, Sigma } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { BLUE, FeatureWindow, VIOLET, useInView, usePhases, useReducedMotion } from "./feature-kit";

const STEPS = [
  { label: "Join", icon: Merge, ms: 4000 },
  { label: "Calculate", icon: Calculator, ms: 4800 },
  { label: "Group", icon: Clock3, ms: 4000 },
  { label: "Summarize", icon: Sigma, ms: 5200 },
] as const;
const DURATIONS = STEPS.map((step) => step.ms);

const TRADES = [
  { time: "09:02", market: "Fed cuts rates in December?", side: "Yes", price: 62, qty: 120 },
  { time: "09:05", market: "CPI above 3% in October?", side: "No", price: 41, qty: 300 },
  { time: "09:11", market: "Fed cuts rates in December?", side: "Yes", price: 63, qty: 45 },
  { time: "09:24", market: "CPI above 3% in October?", side: "Yes", price: 58, qty: 80 },
  { time: "09:38", market: "Fed cuts rates in December?", side: "No", price: 37, qty: 210 },
  { time: "09:52", market: "Fed cuts rates in December?", side: "Yes", price: 64, qty: 500 },
  { time: "10:07", market: "CPI above 3% in October?", side: "No", price: 43, qty: 150 },
  { time: "10:15", market: "Fed cuts rates in December?", side: "Yes", price: 65, qty: 90 },
] as const;
/** Rows past this index only fit in the taller desktop window. */
const MOBILE_TRADE_ROWS = 6;

const HOURS = [
  { hour: "09:00", trades: 412, qty: 18240 },
  { hour: "10:00", trades: 386, qty: 15910 },
  { hour: "11:00", trades: 529, qty: 26450 },
  { hour: "12:00", trades: 301, qty: 11438 },
  { hour: "13:00", trades: 644, qty: 34132 },
  { hour: "14:00", trades: 478, qty: 21032 },
  { hour: "15:00", trades: 355, qty: 13845 },
] as const;

const TOTAL_TRADES = HOURS.reduce((sum, h) => sum + h.trades, 0);
const TOTAL_QTY = HOURS.reduce((sum, h) => sum + h.qty, 0);
const MAX_QTY = Math.max(...HOURS.map((h) => h.qty));
const PEAK = HOURS.find((h) => h.qty === MAX_QTY)!;

const FORMULA = "=Price * Contracts / 100";
const INTERVALS = ["5m", "15m", "1h", "1d"] as const;

const STATUS = [
  `${fmt(TOTAL_TRADES)} rows · 2 tables joined`,
  `${fmt(TOTAL_TRADES)} rows · 1 new column`,
  `${HOURS.length} rows · hourly`,
  `Summary of ${HOURS.length} hours`,
];

function fmt(value: number, decimals = 0) {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

const avgSize = (h: { trades: number; qty: number }) => h.qty / h.trades;

/** Types `text` one character at a time whenever `active` turns on or `runKey` changes. */
function useTyped(text: string, active: boolean, runKey: string) {
  const [count, setCount] = useState(text.length);
  useEffect(() => {
    if (!active) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setCount(n);
      if (n >= text.length) window.clearInterval(id);
    }, 45);
    return () => window.clearInterval(id);
  }, [text, active, runKey]);
  return count;
}

export function TransformDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const [manual, setManual] = useState(false);
  const { phase, loop, setPhase } = usePhases(DURATIONS, inView && !reduced && !manual);
  const runKey = `${phase}-${loop}`;
  const typed = useTyped(FORMULA, phase === 1 && !reduced, runKey);

  return (
    <div ref={rootRef} className="size-full">
      <FeatureWindow title="Lychee Sheet · trades" className="size-full">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="grid shrink-0 grid-cols-4 gap-1 border-b border-border p-1.5">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const active = i === phase;
              return (
                <button
                  key={step.label}
                  type="button"
                  onClick={() => {
                    setManual(true);
                    setPhase(i);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "relative flex h-8 min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-md px-1.5 text-[11px] font-medium transition-colors",
                    active ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted hover:text-primary",
                  )}
                >
                  {i < phase ? (
                    <Check className="size-3.5 shrink-0 text-[#0f9f6e]" strokeWidth={3} />
                  ) : (
                    <Icon className="size-3.5 shrink-0" />
                  )}
                  <span className="truncate">{step.label}</span>
                  {active && !manual && !reduced ? (
                    <span
                      key={runKey}
                      className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[#2f6fed] [animation:fx-fill_linear_both]"
                      style={{ animationDuration: `${step.ms}ms` }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <FormulaBar phase={phase} typed={typed} runKey={runKey} />

          <div className="relative min-h-0 flex-1 overflow-hidden">
            {phase < 2 ? (
              <TradesTable key={`trades-${loop}`} joining={phase === 0} withNotional={phase === 1} />
            ) : phase === 2 ? (
              <HourlyTable key={`hourly-${loop}`} />
            ) : (
              <Summary key={`summary-${loop}`} />
            )}
          </div>

          <div className="flex h-7 shrink-0 items-center justify-between gap-2 border-t border-border px-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="size-3 text-[#0f9f6e]" strokeWidth={3} />
              No code
            </span>
            <span key={runKey} className="truncate font-mono tabular-nums [animation:fx-rise_.3s_both]">
              {STATUS[phase]}
            </span>
          </div>
        </div>
      </FeatureWindow>
    </div>
  );
}

function FormulaBar({ phase, typed, runKey }: { phase: number; typed: number; runKey: string }) {
  const label = ["Join", "fx", "Group by", "Σ"][phase];
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3 text-[11px]">
      <span className="flex h-5 shrink-0 items-center rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
      <div key={runKey} className="flex min-w-0 flex-1 items-center gap-1.5 font-mono text-primary [animation:fx-rise_.3s_both]">
        {phase === 0 ? (
          <span className="truncate">
            trades + <span className="text-[#2f6fed]">markets</span> on <span className="text-[#2f6fed]">ticker</span>
          </span>
        ) : phase === 1 ? (
          <span className="flex min-w-0 items-center truncate">
            <span className="mr-1.5 text-muted-foreground">Notional</span>
            {FORMULA.slice(0, typed)}
            {typed < FORMULA.length ? <span className="ml-px inline-block h-3 w-px animate-pulse bg-primary" /> : null}
          </span>
        ) : phase === 2 ? (
          <>
            <span className="text-muted-foreground">time ·</span>
            {INTERVALS.map((interval) => (
              <span
                key={interval}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px]",
                  interval === "1h"
                    ? "bg-primary text-primary-foreground [animation:fx-flash_.8s_.4s_both]"
                    : "text-muted-foreground",
                )}
              >
                {interval}
              </span>
            ))}
          </>
        ) : (
          <span className="truncate">
            <span className="text-[#2f6fed]">SUM</span>(Contracts) · <span className="text-[#a855f7]">AVERAGE</span>(Size)
          </span>
        )}
      </div>
    </div>
  );
}

const TRADE_COLS =
  "grid-cols-[minmax(0,1fr)_2rem_2.25rem_3rem] sm:grid-cols-[2.75rem_minmax(0,1fr)_2.25rem_2.5rem_3.5rem]";
const TRADE_COLS_NOTIONAL =
  "grid-cols-[minmax(0,1fr)_2rem_2.25rem_3rem_3.75rem] sm:grid-cols-[2.75rem_minmax(0,1fr)_2.25rem_2.5rem_3.5rem_4.25rem]";

function TradesTable({ joining, withNotional }: { joining: boolean; withNotional: boolean }) {
  const cols = withNotional ? TRADE_COLS_NOTIONAL : TRADE_COLS;
  return (
    <div className="flex flex-col text-[11px]">
      <div className={cn("grid h-7 items-center gap-2 border-b border-border px-3 text-[10px] text-muted-foreground", cols)}>
        <span className="hidden sm:block">Time</span>
        <span className={cn("flex min-w-0 items-center gap-1", joining && "text-[#2f6fed]")}>
          {joining ? <Merge className="size-3 shrink-0" /> : null}
          <span className="truncate">Market</span>
        </span>
        <span>Side</span>
        <span className="text-right">Price</span>
        <span className="text-right">Contracts</span>
        {withNotional ? <span className="text-right text-[#a855f7] [animation:fx-rise_.3s_both]">Notional</span> : null}
      </div>
      {TRADES.map((trade, i) => (
        <div
          key={trade.time}
          className={cn(
            "grid h-7 items-center gap-2 border-b border-border px-3 [animation:fx-rise_.35s_both]",
            cols,
            i >= MOBILE_TRADE_ROWS && "hidden sm:grid",
          )}
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <span className="hidden font-mono tabular-nums text-muted-foreground sm:block">{trade.time}</span>
          <span
            className={cn(
              "truncate rounded px-1 text-primary transition-colors duration-700",
              joining && "bg-[#2f6fed]/10 [animation:fx-rise_.35s_both]",
            )}
            style={joining ? { animationDelay: `${450 + i * 90}ms` } : undefined}
          >
            {trade.market}
          </span>
          <span className={trade.side === "Yes" ? "text-[#0f9f6e]" : "text-[#e5484d]"}>{trade.side}</span>
          <span className="text-right font-mono tabular-nums text-primary">{trade.price}¢</span>
          <span className="text-right font-mono tabular-nums text-primary">{fmt(trade.qty)}</span>
          {withNotional ? (
            <span
              className="rounded bg-[#a855f7]/10 px-1 text-right font-mono tabular-nums text-primary [animation:fx-rise_.35s_both]"
              style={{ animationDelay: `${1150 + i * 110}ms` }}
            >
              ${fmt((trade.price * trade.qty) / 100, 2)}
            </span>
          ) : null}
        </div>
      ))}
      <p className="px-3 py-1.5 text-[10px] text-muted-foreground">+ {fmt(TOTAL_TRADES - TRADES.length)} more rows</p>
    </div>
  );
}

const HOUR_COLS = "grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]";

function HourlyTable() {
  return (
    <div className="flex flex-col text-[11px]">
      <div className={cn("grid h-7 items-center gap-2 border-b border-border px-3 text-[10px] text-muted-foreground", HOUR_COLS)}>
        <span className="text-[#2f6fed]">Hour</span>
        <span className="text-right">Trades</span>
        <span className="text-right">Contracts</span>
        <span className="text-right">Avg size</span>
      </div>
      {HOURS.map((h, i) => (
        <div
          key={h.hour}
          className={cn("grid h-7 items-center gap-2 border-b border-border px-3 [animation:fx-rise_.35s_both]", HOUR_COLS)}
          style={{ animationDelay: `${300 + i * 110}ms` }}
        >
          <span className="rounded bg-[#2f6fed]/10 px-1 font-mono tabular-nums text-primary">{h.hour}</span>
          <span className="text-right font-mono tabular-nums text-primary">{fmt(h.trades)}</span>
          <span className="text-right font-mono tabular-nums text-primary">{fmt(h.qty)}</span>
          <span className="text-right font-mono tabular-nums text-primary">{fmt(avgSize(h), 1)}</span>
        </div>
      ))}
      <p className="px-3 py-1.5 text-[10px] text-muted-foreground">
        {fmt(TOTAL_TRADES)} trades grouped into {HOURS.length} hourly rows
      </p>
    </div>
  );
}

const AVG_MIN = 30;
const AVG_MAX = 60;

function Summary() {
  const [hover, setHover] = useState<number | null>(null);
  const stats = [
    { label: "Volume", value: `${fmt(TOTAL_QTY)}` },
    { label: "Avg trade size", value: fmt(TOTAL_QTY / TOTAL_TRADES, 1) },
    { label: "Peak hour", value: PEAK.hour },
  ];
  const avgPoints = HOURS.map((h, i) => ({
    x: ((i + 0.5) / HOURS.length) * 100,
    y: 100 - ((avgSize(h) - AVG_MIN) / (AVG_MAX - AVG_MIN)) * 100,
  }));

  return (
    <div className="flex h-full flex-col gap-2.5 p-3">
      <div className="grid shrink-0 grid-cols-3 gap-2">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="min-w-0 rounded-lg bg-muted px-2.5 py-1.5 [animation:fx-rise_.4s_both]"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <p className="truncate text-[10px] text-muted-foreground">{stat.label}</p>
            <p className="font-mono text-xs font-medium tabular-nums text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-sm" style={{ backgroundColor: BLUE }} />
          Contracts per hour
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full" style={{ backgroundColor: VIOLET }} />
          Avg trade size
        </span>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col" onMouseLeave={() => setHover(null)}>
        <div className="relative flex min-h-0 flex-1 items-end gap-2">
          {HOURS.map((h, i) => (
            <div
              key={h.hour}
              className="flex h-full flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setHover(i)}
            >
              <span
                className="w-full origin-bottom rounded-t-sm transition-opacity [animation:fx-grow_.6s_ease-out_both]"
                style={{
                  height: `${(h.qty / MAX_QTY) * 82}%`,
                  backgroundColor: h === PEAK ? BLUE : "rgba(47,111,237,0.35)",
                  opacity: hover === null || hover === i ? 1 : 0.5,
                  animationDelay: `${350 + i * 80}ms`,
                }}
              />
            </div>
          ))}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full overflow-visible [animation:fx-draw_1s_.9s_ease-out_both]"
            aria-hidden
          >
            <polyline
              points={avgPoints.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={VIOLET}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {avgPoints.map((p, i) => (
            <span
              key={HOURS[i].hour}
              className="pointer-events-none absolute -ml-1 -mt-1 size-2 rounded-full border-2 border-background [animation:fx-rise_.3s_both]"
              style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: VIOLET, animationDelay: `${1100 + i * 90}ms` }}
            />
          ))}
          {hover !== null ? (
            <div
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-2 py-1 font-mono text-[10px] text-primary-foreground shadow-lg"
              style={{ left: `${Math.min(80, Math.max(20, avgPoints[hover].x))}%` }}
            >
              {HOURS[hover].hour} · {fmt(HOURS[hover].qty)} contracts · avg {fmt(avgSize(HOURS[hover]), 1)}
            </div>
          ) : null}
        </div>
        <div className="mt-1 flex shrink-0 gap-2">
          {HOURS.map((h) => (
            <span key={h.hour} className="flex-1 text-center font-mono text-[9.5px] tabular-nums text-muted-foreground">
              {h.hour}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
