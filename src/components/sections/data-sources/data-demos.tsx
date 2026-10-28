"use client";

import { cn } from "@/lib/utils";
import { mulberry32 } from "../features/feature-kit";
import { DataCardFrame } from "./data-card-frame";
import { formatNumber, seriesPath, useDemoVisibility, useTick } from "./demo-hooks";

/* Government satellite data: a storm track drawing in while landfall odds climb. */

const STORM_CYCLE = 46;
const STORM_TRAVEL = 36;

function stormPoint(t: number) {
  const [x0, y0, x1, y1, x2, y2] = [30, 36, 150, 20, 232, 128];
  const u = 1 - t;
  return { x: u * u * x0 + 2 * u * t * x1 + t * t * x2, y: u * u * y0 + 2 * u * t * y1 + t * t * y2 };
}

export function SatelliteDemo() {
  const { ref, running } = useDemoVisibility();
  const tick = useTick(220, running);
  const progress = tick === 0 ? 0.72 : Math.min(1, (tick % STORM_CYCLE) / STORM_TRAVEL);
  const storm = stormPoint(progress);
  const category = 1 + Math.min(2, Math.floor(progress * 3));
  const wind = Math.round(85 + progress * 40);
  const odds = Math.round(28 + progress * 46);

  return (
    <DataCardFrame title="NOAA satellite feed" frameRef={ref} compact>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#0b1220]">
        <svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={i * 40} x2={i * 40} y1="0" y2="190" stroke="white" strokeOpacity="0.05" />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <line key={`h${i}`} x1="0" x2="320" y1={i * 40} y2={i * 40} stroke="white" strokeOpacity="0.05" />
          ))}
          <path
            d="M196 190 L214 150 Q226 128 248 122 Q272 116 290 98 Q304 84 320 80 L320 190 Z"
            fill="#1e293b"
            stroke="#334155"
          />
          <path d="M30 36 Q155 2 262 116 L204 142 Q145 38 30 36 Z" fill="white" fillOpacity="0.06" />
          <path
            d="M30 36 Q150 20 232 128"
            fill="none"
            stroke="white"
            strokeOpacity="0.25"
            strokeDasharray="3 4"
          />
          <path
            d="M30 36 Q150 20 232 128"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - progress}
            className="transition-[stroke-dashoffset] duration-200 ease-linear"
          />
          <circle cx={storm.x} cy={storm.y} r="13" fill="#f59e0b" fillOpacity="0.15" className="animate-pulse" />
          <circle cx={storm.x} cy={storm.y} r="5" fill="#f59e0b" />
        </svg>

        <div className="absolute right-3 top-2.5 text-right text-[10px] text-white/60">
          <p className="font-medium text-white/90">GOES-East · infrared</p>
          <p className="font-mono tabular-nums">
            Cat {category} · {wind} mph
          </p>
        </div>

        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-[10.5px] text-white backdrop-blur">
          <span className="min-w-0 truncate">Hurricane makes landfall in Florida?</span>
          <span className="shrink-0 font-mono tabular-nums">Yes {odds}¢</span>
        </div>
      </div>
    </DataCardFrame>
  );
}

/* Hyperliquid: perps ticking next to a market on the same coin. */

const PERPS = [
  { coin: "BTC", mark: 97412, decimals: 0, funding: 0.0000125 },
  { coin: "ETH", mark: 3612.4, decimals: 1, funding: 0.0000098 },
  { coin: "SOL", mark: 186.42, decimals: 2, funding: -0.0000041 },
  { coin: "HYPE", mark: 38.42, decimals: 2, funding: 0.0000213 },
] as const;

export function HyperliquidDemo() {
  const { ref, running } = useDemoVisibility();
  const tick = useTick(900, running);

  return (
    <DataCardFrame title="Hyperliquid perps" frameRef={ref} compact>
      <div className="flex h-6 shrink-0 items-center border-b border-border bg-muted px-3 text-[10px] text-muted-foreground">
        <span className="flex-1">Perp</span>
        <span className="w-16 text-right">Mark</span>
        <span className="w-[4.5rem] text-right">Funding 1h</span>
      </div>
      {PERPS.map((perp, i) => {
        const wave = Math.sin(tick * 0.9 + i * 1.3) * 0.0011 + Math.sin(tick * 0.37 + i) * 0.0007;
        const prevWave = Math.sin((tick - 1) * 0.9 + i * 1.3) * 0.0011 + Math.sin((tick - 1) * 0.37 + i) * 0.0007;
        const mark = perp.mark * (1 + wave);
        const funding = perp.funding + Math.sin(tick * 0.25 + i) * 0.000004;
        const dir = tick ? Math.sign(wave - prevWave) : 0;
        return (
          <div
            key={perp.coin}
            className="flex h-[30px] shrink-0 items-center whitespace-nowrap border-b border-border px-3 text-[11px]"
          >
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#97FCE4] text-[7px] font-bold text-[#0b1f1a]">
                {perp.coin[0]}
              </span>
              <span className="truncate text-primary">{perp.coin}-PERP</span>
            </span>
            <span
              key={tick}
              className={cn(
                "w-16 text-right font-mono tabular-nums",
                dir > 0 ? "ds-up" : dir < 0 ? "ds-down" : "text-primary",
              )}
            >
              {formatNumber(mark, perp.decimals)}
            </span>
            <span
              className={cn(
                "w-[4.5rem] text-right font-mono tabular-nums",
                funding >= 0 ? "text-[#0f9f6e]" : "text-[#e5484d]",
              )}
            >
              {funding >= 0 ? "+" : ""}
              {(funding * 100).toFixed(4)}%
            </span>
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-[10px]">
        <span className="truncate text-muted-foreground">Compare with · Bitcoin above $100k on Dec 31?</span>
        <span className="shrink-0 font-mono tabular-nums text-primary">
          Yes {Math.round(38 + Math.sin(tick * 0.37) * 3)}¢
        </span>
      </div>
    </DataCardFrame>
  );
}

/* Polls: new polls landing, the averages moving, and what the market prices. */

const POLL_COUNT = 30;
const POLL_WINDOW = 6;
const POLL_HOLD = 6;
const POLL_CHART = { w: 320, h: 100, min: 40, max: 52, pad: 6, slots: POLL_COUNT };
const POLLS = (() => {
  const rand = mulberry32(29);
  return Array.from({ length: POLL_COUNT }, (_, i) => ({
    a: 45.6 + i * 0.06 + (rand() - 0.5) * 3.6,
    b: 46.2 - i * 0.05 + (rand() - 0.5) * 3.6,
  }));
})();
const AVERAGES = POLLS.map((_, i) => {
  const recent = POLLS.slice(Math.max(0, i - POLL_WINDOW + 1), i + 1);
  return {
    a: recent.reduce((s, p) => s + p.a, 0) / recent.length,
    b: recent.reduce((s, p) => s + p.b, 0) / recent.length,
  };
});

function pollY(value: number) {
  const { h, min, max, pad } = POLL_CHART;
  return pad + (1 - (value - min) / (max - min)) * (h - pad * 2);
}

export function PollsDemo() {
  const { ref, running } = useDemoVisibility();
  const tick = useTick(380, running);
  const cycle = POLL_COUNT - 8 + POLL_HOLD;
  const shown = tick === 0 ? POLL_COUNT : Math.min(POLL_COUNT, 8 + (tick % cycle));
  const avg = AVERAGES[shown - 1];
  const lead = avg.a - avg.b;
  const odds = Math.round(Math.min(95, Math.max(5, 100 / (1 + Math.exp(-lead / 1.1)))));
  const avgA = AVERAGES.slice(0, shown).map((p) => p.a);
  const avgB = AVERAGES.slice(0, shown).map((p) => p.b);

  return (
    <DataCardFrame title="Polling averages" frameRef={ref} compact>
      <div className="flex items-center gap-3 px-3.5 pb-1 pt-2.5 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-[#2f6fed]" />
          Candidate A <span className="font-mono tabular-nums text-primary">{avg.a.toFixed(1)}%</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-[#e5484d]" />
          Candidate B <span className="font-mono tabular-nums text-primary">{avg.b.toFixed(1)}%</span>
        </span>
      </div>
      <div className="relative mx-3.5 min-h-0 flex-1">
        <svg viewBox="0 0 320 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
          <path d={seriesPath(avgA, POLL_CHART)} fill="none" stroke="#2f6fed" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
          <path d={seriesPath(avgB, POLL_CHART)} fill="none" stroke="#e5484d" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
        </svg>
        {POLLS.slice(0, shown).flatMap((poll, i) => {
          const left = `${(i / (POLL_COUNT - 1)) * 100}%`;
          const fresh = i === shown - 1 && tick > 0;
          return [
            <span
              key={`a${i}`}
              className={cn("absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2f6fed]/40", fresh && "ds-fade")}
              style={{ left, top: `${(pollY(poll.a) / 100) * 100}%` }}
            />,
            <span
              key={`b${i}`}
              className={cn("absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e5484d]/40", fresh && "ds-fade")}
              style={{ left, top: `${(pollY(poll.b) / 100) * 100}%` }}
            />,
          ];
        })}
      </div>
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-[10px]">
        <span className="truncate text-muted-foreground">Market · Candidate A wins?</span>
        <span key={odds} className="ds-fade shrink-0 font-mono tabular-nums text-primary">
          Yes {odds}¢
        </span>
      </div>
    </DataCardFrame>
  );
}

/* Economic reports: releases landing one by one and the market reacting. */

const RELEASES = [
  { name: "CPI, year over year", prior: "2.9%", actual: "3.1%", move: -9 },
  { name: "Core CPI, month over month", prior: "0.3%", actual: "0.4%", move: -3 },
  { name: "30-year mortgage rate", prior: "6.42%", actual: "6.31%", move: 2 },
  { name: "Gas, national average", prior: "$3.18", actual: "$3.11", move: 1 },
] as const;
const RELEASE_BASE_ODDS = 64;

export function EconomicReportsDemo() {
  const { ref, running } = useDemoVisibility();
  const tick = useTick(1300, running);
  const cycle = RELEASES.length + 3;
  const released = tick === 0 ? RELEASES.length : Math.min(RELEASES.length, tick % cycle);
  const odds = RELEASE_BASE_ODDS + RELEASES.slice(0, released).reduce((sum, r) => sum + r.move, 0);
  const lastMove = released ? RELEASES[released - 1].move : 0;

  return (
    <DataCardFrame title="Economic calendar" frameRef={ref} compact>
      <div className="flex h-6 shrink-0 items-center border-b border-border bg-muted px-3 text-[10px] text-muted-foreground">
        <span className="flex-1">Release</span>
        <span className="w-12 text-right">Prior</span>
        <span className="w-14 text-right">Actual</span>
      </div>
      {RELEASES.map((release, i) => {
        const out = i < released;
        const next = i === released;
        return (
          <div
            key={release.name}
            className={cn(
              "flex h-[30px] shrink-0 items-center border-b border-border px-3 text-[11px] transition-colors duration-500",
              out && i === released - 1 && tick > 0 && "bg-[#2f6fed]/[0.06]",
            )}
          >
            <span className="min-w-0 flex-1 truncate text-primary">{release.name}</span>
            <span className="w-12 text-right font-mono tabular-nums text-muted-foreground">{release.prior}</span>
            <span className="flex w-14 justify-end font-mono tabular-nums">
              {out ? (
                <span className="ds-row-in text-primary">
                  {release.actual}
                </span>
              ) : next ? (
                <span className="h-2 w-8 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-[10px]">
        <span className="truncate text-muted-foreground">Fed cuts rates in December?</span>
        <span
          key={released}
          className={cn(
            "shrink-0 font-mono tabular-nums",
            tick === 0 ? "text-primary" : lastMove < 0 ? "ds-down" : lastMove > 0 ? "ds-up" : "text-primary",
          )}
        >
          Yes {odds}¢
        </span>
      </div>
    </DataCardFrame>
  );
}
