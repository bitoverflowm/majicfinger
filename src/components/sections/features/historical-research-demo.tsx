"use client";

import { useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { FeatureWindow, mulberry32, useInView, usePhases, useReducedMotion } from "./feature-kit";

const DAYS = 30;
const KALSHI = "#28CC95";
const POLYMARKET = "#2E5CFF";

type Market = {
  id: string;
  label: string;
  venue: "Kalshi" | "Polymarket";
  color: string;
  outcome: "Yes" | "No";
  prices: number[];
  volume: number[];
};

function buildMarket(seed: number, start: number, outcome: "Yes" | "No", volumeBase: number) {
  const rand = mulberry32(seed);
  const end = outcome === "Yes" ? 100 : 0;
  const prices = Array.from({ length: DAYS + 1 }, (_, i) => {
    if (i === DAYS) return end;
    const t = i / DAYS;
    const pull = t ** 3;
    const value = start + (end - start) * pull + (rand() - 0.5) * 9 * (1 - t * 0.6);
    return Math.round(Math.min(97, Math.max(3, value)));
  });
  const volume = Array.from({ length: DAYS + 1 }, (_, i) => {
    const t = i / DAYS;
    return Math.round(volumeBase * (1 + 7 * t ** 4) * (0.7 + rand() * 0.6));
  });
  return { prices, volume };
}

const MARKETS: readonly Market[] = [
  { id: "sep", label: "Fed cut · Sep", venue: "Kalshi", color: "#2f6fed", outcome: "Yes", ...buildMarket(7, 46, "Yes", 120) },
  { id: "jul", label: "Fed cut · Jul", venue: "Polymarket", color: "#a855f7", outcome: "No", ...buildMarket(13, 41, "No", 90) },
  { id: "jun", label: "Fed cut · Jun", venue: "Kalshi", color: "#f59e0b", outcome: "No", ...buildMarket(21, 24, "No", 70) },
];

const INTERVALS = [
  { label: "1d", days: 1 },
  { label: "3d", days: 3 },
  { label: "1w", days: 7 },
] as const;
const PHASE_MS = [3800, 3200, 3200];

const W = 300;
const H = 120;
const x = (day: number) => (day / DAYS) * W;
const y = (price: number) => 6 + (1 - price / 100) * (H - 12);
const path = (prices: readonly number[]) =>
  prices.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p).toFixed(1)}`).join(" ");

function compact(value: number) {
  return value >= 1000 ? `$${(value / 1000).toFixed(1)}M` : `$${value}K`;
}

export function HistoricalResearchDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const [manual, setManual] = useState(false);
  const { phase, loop, setPhase } = usePhases(PHASE_MS, inView && !reduced && !manual);
  const [selected, setSelected] = useState<readonly string[]>(MARKETS.map((m) => m.id));
  const [hover, setHover] = useState<number | null>(null);

  const interval = INTERVALS[phase];
  const shown = MARKETS.filter((m) => selected.includes(m.id));
  const focus = shown[0] ?? MARKETS[0];

  const buckets: { start: number; total: number }[] = [];
  for (let start = 0; start <= DAYS; start += interval.days) {
    let total = 0;
    for (let d = start; d < Math.min(DAYS + 1, start + interval.days); d++) {
      for (const m of shown) total += m.volume[d];
    }
    buckets.push({ start, total });
  }
  const maxBucket = Math.max(1, ...buckets.map((b) => b.total));

  const totalVolume = focus.volume.reduce((sum, v) => sum + v, 0);
  const finalWeek = focus.volume.slice(DAYS - 6).reduce((sum, v) => sum + v, 0);
  const weekBefore = focus.prices[DAYS - 7];

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? (current.length > 1 ? current.filter((c) => c !== id) : current) : [...current, id],
    );

  return (
    <div ref={rootRef} className="size-full">
      <FeatureWindow title="Lychee Sheet · resolved markets" className="size-full">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-border px-3 py-2">
            {MARKETS.map((m) => {
              const on = selected.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  aria-pressed={on}
                  className={cn(
                    "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[10.5px] transition-colors",
                    on ? "border-border bg-background text-primary" : "border-dashed border-border text-muted-foreground opacity-60",
                  )}
                >
                  <span
                    className="flex size-3.5 items-center justify-center rounded-[3px] text-[8px] font-bold text-white"
                    style={{ backgroundColor: m.venue === "Kalshi" ? KALSHI : POLYMARKET }}
                  >
                    {m.venue[0]}
                  </span>
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                  {m.label}
                  <span className={m.outcome === "Yes" ? "text-[#0f9f6e]" : "text-[#e5484d]"}>{m.outcome}</span>
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2 text-[10px] text-muted-foreground">
            <span>Yes price, last 30 days before resolution</span>
            <span className="flex items-center gap-1">
              Group by
              {INTERVALS.map((option, i) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => {
                    setManual(true);
                    setPhase(i);
                  }}
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono transition-colors",
                    i === phase ? "bg-primary text-primary-foreground" : "hover:bg-muted hover:text-primary",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </span>
          </div>

          <div
            className="relative mx-3 mt-1.5 min-h-0 flex-1"
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHover(Math.max(0, Math.min(DAYS, Math.round(((e.clientX - rect.left) / rect.width) * DAYS))));
            }}
          >
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
              <line x1={W} x2={W} y1="0" y2={H} stroke="#94a3b8" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              <line x1="0" x2={W} y1={y(50)} y2={y(50)} stroke="currentColor" className="text-border" vectorEffect="non-scaling-stroke" />
              <g key={loop} className="[animation:fx-draw_1.4s_ease-out_both]">
                {shown.map((m) => (
                  <path key={m.id} d={path(m.prices)} fill="none" stroke={m.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                ))}
              </g>
              {hover !== null ? (
                <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="#94a3b8" vectorEffect="non-scaling-stroke" />
              ) : null}
            </svg>
            <span className="absolute -top-0.5 right-1 text-[9.5px] text-muted-foreground">Resolved</span>
            {hover !== null ? (
              <div
                className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-2 py-1 font-mono text-[10px] text-primary-foreground shadow-lg"
                style={{ left: `${Math.min(78, Math.max(22, (hover / DAYS) * 100))}%` }}
              >
                {hover === DAYS ? "Resolution" : `${DAYS - hover}d before`} ·{" "}
                {shown.map((m) => `${m.prices[hover]}¢`).join(" / ")}
              </div>
            ) : null}
          </div>

          <div className="mx-3 mt-1.5 flex h-12 shrink-0 items-end gap-[2px]">
            {buckets.map((bucket, i) => (
              <span
                key={`${interval.label}-${bucket.start}`}
                className="flex-1 origin-bottom rounded-t-[2px] bg-[#2f6fed]/40 [animation:fx-grow_.5s_ease-out_both]"
                style={{ height: `${Math.max(4, (bucket.total / maxBucket) * 100)}%`, animationDelay: `${i * (300 / buckets.length)}ms` }}
              />
            ))}
          </div>
          <div className="mx-3 mt-1 flex shrink-0 justify-between font-mono text-[9.5px] text-muted-foreground">
            <span>−30d</span>
            <span>Volume per {interval.label}</span>
            <span>0d</span>
          </div>

          <div className="mt-2 grid shrink-0 grid-cols-3 gap-2 border-t border-border px-3 py-2">
            <Stat label={`${focus.label} · outcome`} value={focus.outcome} tone={focus.outcome === "Yes" ? "up" : "down"} />
            <Stat label="Price a week before" value={`${weekBefore}¢`} />
            <Stat label="Final-week volume" value={`${Math.round((finalWeek / totalVolume) * 100)}% · ${compact(finalWeek)}`} />
          </div>
        </div>
      </FeatureWindow>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "truncate font-mono text-xs font-medium tabular-nums",
          tone === "up" ? "text-[#0f9f6e]" : tone === "down" ? "text-[#e5484d]" : "text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}
