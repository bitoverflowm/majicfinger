"use client";

import { Check, Database, Radio, Table2 } from "lucide-react";
import { useRef } from "react";

import { BLUE, GREEN, mulberry32, RED, VIOLET } from "@/components/sections/features/feature-kit";
import { cn } from "@/lib/utils";
import { EASE, GuideAnimationFigure, type GuideBackdrop, ScaledStage, useGuidePhases } from "./guide-animation-kit";

const DIAGRAM_KEYFRAMES = `
@keyframes gx-comet { from { stroke-dashoffset: 1.3; } to { stroke-dashoffset: 0; } }
@keyframes gx-pop { 0% { opacity: 0; transform: scale(.4); } 70% { transform: scale(1.15); } 100% { opacity: 1; transform: scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .guide-animation [class*="gx-"], .guide-animation .gx-anim { animation: none !important; }
}
`;

/* ------------------------------------------------------------------ */
/* Where the trades come from                                          */
/* ------------------------------------------------------------------ */

type SourceId = "live" | "v1" | "v2";

const SOURCES: { id: SourceId; name: string; detail: string; y: number }[] = [
  { id: "live", name: "Kalshi Live", detail: "Still trading, or settled after the live cutoff", y: 34 },
  { id: "v1", name: "Kalshi Historical v1", detail: "Closed between Kalshi's launch and Dec 2025", y: 150 },
  { id: "v2", name: "Kalshi Historical v2", detail: "Everything else up to the live cutoff. Candlesticks if the trade tape is empty", y: 266 },
];

const EXAMPLES: { title: string; ticker: string; status: string; routes: SourceId[]; why: string }[] = [
  {
    title: "Bitcoin above $77,300 on Oct 31, 2026?",
    ticker: "KXBTCD-26OCT3108-T77299.99",
    status: "Open",
    routes: ["live"],
    why: "Opened after the live cutoff, so every trade is on Kalshi Live.",
  },
  {
    title: "Fed cuts rates in December?",
    ticker: "KXFEDDECISION-26DEC-C25",
    status: "Open",
    routes: ["live", "v2"],
    why: "Recent trades come from Kalshi Live. Older trades come from Kalshi Historical v2.",
  },
  {
    title: "Fed holds rates in June?",
    ticker: "KXFEDDECISION-26JUN-H0",
    status: "Settled",
    routes: ["v2"],
    why: "Settled before the live cutoff. Lychee reads the v2 trade tape, or the candlesticks if it's empty.",
  },
  {
    title: "Harris wins the 2024 presidential election?",
    ticker: "PRES-2024-KH",
    status: "Settled",
    routes: ["v1"],
    why: "Closed before 2026, so Lychee reads Kalshi Historical v1 first, with v2 as a fallback.",
  },
];

const ROUTE_PHASES = [3200, 3200, 3200, 3200] as const;

const D_W = 860;
const D_H = 380;
const MARKET = { x: 20, y: 140, w: 200, h: 104 };
const ROUTER = { x: 268, y: 166, w: 132, h: 52 };
const SRC = { x: 448, w: 196, h: 82 };
const OUT = { x: 690, y: 140, w: 150, h: 104 };

function curve(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2;
  return `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

function Wire({ d, active, color, delay = 0, runKey }: { d: string; active: boolean; color: string; delay?: number; runKey: string }) {
  return (
    <>
      <path d={d} fill="none" strokeWidth={active ? 2 : 1.25} stroke={active ? color : "currentColor"} className={cn("transition-[stroke,stroke-width] duration-500", !active && "text-border")} />
      {active ? (
        <path
          key={runKey}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="0.18 1.3"
          className="gx-anim"
          style={{ animation: `gx-comet 1.6s ${EASE} ${delay}ms infinite`, filter: `drop-shadow(0 0 4px ${color})` }}
        />
      ) : null}
    </>
  );
}

const SOURCE_COLOR: Record<SourceId, string> = { live: GREEN, v1: BLUE, v2: VIOLET };

export function TradeSourceRoutingDiagram() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop } = useGuidePhases(ROUTE_PHASES, rootRef, 1);
  const example = EXAMPLES[phase];
  const runKey = `${loop}-${phase}`;
  const midY = (y: number) => y + SRC.h / 2;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      backdrop="kalshi-routing"
      label="Diagram: Lychee routes a market's trade history to Kalshi Live, Kalshi Historical v1, or Kalshi Historical v2 depending on when it traded, then returns one trade sheet."
      caption="You never pick a data source. The recipe routes each market to the Kalshi dataset that holds its trades."
    >
      <style dangerouslySetInnerHTML={{ __html: DIAGRAM_KEYFRAMES }} />
      <ScaledStage width={D_W} height={D_H}>
        <div className="relative size-full overflow-hidden rounded-xl border border-black/10 bg-background shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)]">
          <svg viewBox={`0 0 ${D_W} ${D_H}`} className="absolute inset-0 size-full" aria-hidden>
            <Wire d={curve(MARKET.x + MARKET.w, MARKET.y + MARKET.h / 2, ROUTER.x, ROUTER.y + ROUTER.h / 2)} active color={BLUE} runKey={runKey} />
            {SOURCES.map((s, i) => {
              const on = example.routes.includes(s.id);
              return (
                <g key={s.id}>
                  <Wire d={curve(ROUTER.x + ROUTER.w, ROUTER.y + ROUTER.h / 2, SRC.x, midY(s.y))} active={on} color={SOURCE_COLOR[s.id]} delay={200 + i * 60} runKey={runKey} />
                  <Wire d={curve(SRC.x + SRC.w, midY(s.y), OUT.x, OUT.y + OUT.h / 2)} active={on} color={SOURCE_COLOR[s.id]} delay={600 + i * 60} runKey={runKey} />
                </g>
              );
            })}
          </svg>

          <div
            key={`market-${runKey}`}
            className="absolute rounded-xl border border-border bg-background p-3 shadow-sm [animation:fx-rise_.35s_both]"
            style={{ left: MARKET.x, top: MARKET.y, width: MARKET.w, height: MARKET.h }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Your market</p>
            <p className="mt-1 line-clamp-2 text-[12.5px] font-semibold leading-snug text-foreground">{example.title}</p>
            <p className="mt-1 flex items-center gap-1.5">
              <span className="truncate font-mono text-[9.5px] text-muted-foreground">{example.ticker}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-px text-[8.5px] font-semibold uppercase tracking-wide",
                  example.status === "Open" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground",
                )}
              >
                {example.status}
              </span>
            </p>
          </div>

          <div
            className="absolute flex flex-col items-center justify-center rounded-xl border border-[#2f6fed]/40 bg-[#2f6fed]/[0.06] text-center"
            style={{ left: ROUTER.x, top: ROUTER.y, width: ROUTER.w, height: ROUTER.h }}
          >
            <p className="text-[11.5px] font-semibold text-foreground">route_source</p>
            <p className="text-[9.5px] text-muted-foreground">by when it traded</p>
          </div>

          {SOURCES.map((s) => {
            const on = example.routes.includes(s.id);
            return (
              <div
                key={s.id}
                className={cn(
                  "absolute rounded-xl border bg-background px-3 py-2.5 transition-all duration-500",
                  on ? "shadow-[0_12px_30px_-14px_rgba(15,23,42,0.4)]" : "border-border opacity-55",
                )}
                style={{ left: SRC.x, top: s.y, width: SRC.w, height: SRC.h, borderColor: on ? SOURCE_COLOR[s.id] : undefined }}
              >
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                  {s.id === "live" ? <Radio className="size-3.5" style={{ color: SOURCE_COLOR[s.id] }} aria-hidden /> : <Database className="size-3.5" style={{ color: SOURCE_COLOR[s.id] }} aria-hidden />}
                  {s.name}
                  {on ? (
                    <span key={runKey} className="gx-anim ml-auto grid size-4 place-items-center rounded-full text-white" style={{ background: SOURCE_COLOR[s.id], animation: "gx-pop .4s ease-out .5s both" }}>
                      <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{s.detail}</p>
              </div>
            );
          })}

          <div
            className="absolute rounded-xl border border-border bg-background p-3 shadow-sm"
            style={{ left: OUT.x, top: OUT.y, width: OUT.w, height: OUT.h }}
          >
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-foreground">
              <Table2 className="size-3.5 text-muted-foreground" aria-hidden />
              One trade sheet
            </p>
            <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">Yes and no price on every row</p>
            <p className="mt-1 text-[10px] leading-snug text-muted-foreground">Up to 500,000 rows</p>
          </div>

          <p
            key={`why-${runKey}`}
            className="absolute inset-x-6 bottom-3 text-center text-[11.5px] text-muted-foreground [animation:fx-rise_.4s_.3s_both]"
          >
            {example.why}
          </p>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* ------------------------------------------------------------------ */
/* Trade history vs price history                                      */
/* ------------------------------------------------------------------ */

type Tick = { t: number; price: number; size: number; side: "yes" | "no" };

const TAPE: Tick[] = (() => {
  const rand = mulberry32(31);
  const ticks: Tick[] = [];
  let price = 41;
  let t = 4;
  while (t < 600) {
    price = Math.min(48, Math.max(36, price + Math.round((rand() - 0.47) * 3)));
    ticks.push({ t, price, size: 1 + rand() ** 3 * 9, side: rand() < 0.55 ? "yes" : "no" });
    t += 3 + rand() * 16;
  }
  return ticks;
})();

const CANDLES = Array.from({ length: 10 }, (_, minute) => {
  const bucket = TAPE.filter((tick) => tick.t >= minute * 60 && tick.t < (minute + 1) * 60);
  const prices = bucket.map((tick) => tick.price);
  return bucket.length
    ? { minute, open: prices[0], close: prices[prices.length - 1], high: Math.max(...prices), low: Math.min(...prices), count: bucket.length }
    : null;
}).filter((c): c is NonNullable<typeof c> => c !== null);

const CHART_PHASES = [3000, 900, 3000, 1600] as const;

export function TradesVsCandlesChart({ backdrop = "kalshi-candles" }: { backdrop?: GuideBackdrop }) {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop } = useGuidePhases(CHART_PHASES, rootRef, 2);
  const W = 600;
  const H = 210;
  const lo = 34;
  const hi = 50;
  const x = (t: number) => 34 + (t / 600) * (W - 44);
  const y = (p: number) => 12 + ((hi - p) / (hi - lo)) * (H - 36);
  const candles = phase >= 2;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      backdrop={backdrop}
      label="Chart: individual trades appear as dots over ten minutes, then the same trades are summarised into one-minute candles, showing the difference between trade history and price history."
      caption="Trade history keeps every execution. Price history compresses them into one candle per interval."
    >
      <div className="overflow-hidden rounded-xl border border-black/10 bg-background shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
          <div className="flex rounded-md bg-black/[0.04] p-0.5 dark:bg-white/[0.06]">
            {["Trade history", "Price history (1m)"].map((label, i) => (
              <span
                key={label}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-medium transition-colors duration-300",
                  (i === 1) === candles ? "bg-background text-primary shadow-sm" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            ))}
          </div>
          <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
            {candles ? `${CANDLES.length} candles` : `${TAPE.length} trades`}
          </span>
        </div>
        <div className="px-2 pb-2 pt-3 sm:px-3">
          <svg key={loop} viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
            {[38, 42, 46].map((p) => (
              <g key={p}>
                <line x1={34} x2={W - 10} y1={y(p)} y2={y(p)} className="stroke-border" strokeWidth={1} />
                <text x={2} y={y(p) + 3.5} className="fill-muted-foreground font-mono text-[10px]">{p}¢</text>
              </g>
            ))}
            {Array.from({ length: 11 }, (_, m) => (
              <line
                key={m}
                x1={x(m * 60)}
                x2={x(m * 60)}
                y1={8}
                y2={H - 22}
                strokeDasharray="3 4"
                className="stroke-border transition-opacity duration-500"
                strokeWidth={1}
                style={{ opacity: phase >= 1 ? 1 : 0 }}
              />
            ))}
            {[0, 5, 10].map((m) => (
              <text key={m} x={x(m * 60)} y={H - 6} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
                4:{String(45 + m).padStart(2, "0")} PM
              </text>
            ))}
            {TAPE.map((tick, i) => (
              <circle
                key={i}
                cx={x(tick.t)}
                cy={y(tick.price)}
                r={2 + tick.size * 0.45}
                fill={tick.side === "yes" ? GREEN : VIOLET}
                className="transition-opacity duration-500"
                style={{
                  opacity: candles ? 0.18 : 0.75,
                  animation: `fx-rise .3s ease-out ${(tick.t / 600) * 2400}ms both`,
                }}
              />
            ))}
            {candles
              ? CANDLES.map((c) => {
                  const cx = x(c.minute * 60 + 30);
                  const up = c.close >= c.open;
                  const color = up ? GREEN : RED;
                  const top = y(Math.max(c.open, c.close));
                  const bottom = y(Math.min(c.open, c.close));
                  return (
                    <g
                      key={c.minute}
                      style={{ transformBox: "fill-box", transformOrigin: "center", animation: `fx-grow .5s cubic-bezier(.165,.84,.44,1) ${c.minute * 90}ms both` }}
                    >
                      <line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1.5} />
                      <rect x={cx - 12} y={top} width={24} height={Math.max(2, bottom - top)} rx={2} fill={color} fillOpacity={0.85} />
                    </g>
                  );
                })
              : null}
          </svg>
        </div>
        <div className="grid grid-cols-2 border-t border-border text-[11px] sm:text-xs">
          <p className={cn("px-3 py-2.5 transition-colors sm:px-4", !candles ? "text-primary" : "text-muted-foreground")}>
            <span className="font-medium">Trade history</span> · one row per execution, with time, price, size and taker side
          </p>
          <p className={cn("border-l border-border px-3 py-2.5 transition-colors sm:px-4", candles ? "text-primary" : "text-muted-foreground")}>
            <span className="font-medium">Price history</span> · one candle per interval: open, high, low, close
          </p>
        </div>
      </div>
    </GuideAnimationFigure>
  );
}

/* ------------------------------------------------------------------ */
/* Reading a trade row                                                 */
/* ------------------------------------------------------------------ */

const ROW_COLUMNS = [
  { key: "time", label: "Created Time", value: "10/31/2026, 4:49:58 PM", note: "When the trade executed. Check the time zone before you line trades up with news or another dataset." },
  { key: "count", label: "Count Fp", value: "22.38", note: "How many contracts changed hands. It's a decimal, so it can include part of a contract." },
  { key: "yes", label: "Yes Price Dollars", value: "0.39", note: "The yes price in dollars. 0.39 is 39¢, which reads as a 39% implied probability." },
  { key: "no", label: "No Price Dollars", value: "0.61", note: "The no price for the same trade. Yes and no always add up to $1.00." },
  { key: "taker", label: "Taker Outcome Side", value: "yes", note: "The outcome the taker bought. The taker is the side whose order filled against a resting order." },
] as const;

const ROW_PHASES = [2600, 2600, 2600, 2600, 2600] as const;

export function TradeRowAnatomy() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop } = useGuidePhases(ROW_PHASES, rootRef, 2);
  const focus = ROW_COLUMNS[phase];
  const template = { gridTemplateColumns: "1.7fr 0.8fr 1fr 1fr 1.1fr" };

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      backdrop="kalshi-row"
      label="Annotated trade row: Created Time, Count Fp, Yes Price Dollars, No Price Dollars and Taker Outcome Side, each explained in turn."
      caption="Every row is one execution. Prices are in dollars, so 0.39 means 39¢."
    >
      <div className="overflow-hidden rounded-xl border border-black/10 bg-background shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)]">
        <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
          <Table2 className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="truncate text-[11.5px] font-semibold text-foreground">Trades · KXBTCD-26OCT3108-T77299.99</span>
        </div>
        <div className="overflow-hidden text-[10.5px] sm:text-[11.5px]">
          <div className="grid border-b border-border bg-muted/60 font-medium text-muted-foreground" style={template}>
            {ROW_COLUMNS.map((c) => (
              <span
                key={c.key}
                className={cn("truncate px-2 py-1.5 transition-colors duration-300", c.key === focus.key && "bg-[#2f6fed]/10 text-[#2f6fed]")}
              >
                {c.label}
              </span>
            ))}
          </div>
          {[
            ["10/31/2026, 4:49:41 PM", "300", "0.39", "0.61", "yes"],
            null,
            ["10/31/2026, 4:50:07 PM", "13.63", "0.37", "0.63", "no"],
          ].map((row, i) => (
            <div
              key={i}
              className={cn("grid border-b border-border/60 font-mono tabular-nums", row ? "text-muted-foreground" : "bg-[#2f6fed]/[0.03] text-foreground")}
              style={template}
            >
              {(row ?? ROW_COLUMNS.map((c) => c.value)).map((cell, j) => {
                const column = ROW_COLUMNS[j];
                const lit = !row && column.key === focus.key;
                return (
                  <span
                    key={j}
                    className={cn(
                      "truncate px-2 py-2 transition-all duration-300",
                      lit && "bg-[#2f6fed]/10 font-semibold text-[#2f6fed]",
                      column.key === "taker" && (cell === "yes" ? "text-[#0f9f6e]" : cell === "no" ? "text-[#e5484d]" : ""),
                    )}
                  >
                    {cell}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <div className="relative px-3 pb-3 pt-3 sm:px-4">
          <div className="flex gap-1.5">
            {ROW_COLUMNS.map((c, i) => (
              <span key={c.key} className={cn("h-1 flex-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]")}>
                {i <= phase ? (
                  <span
                    key={`${loop}-${i === phase}`}
                    className="block h-full origin-left rounded-full bg-[#2f6fed]"
                    style={i === phase ? { animation: `fx-fill ${ROW_PHASES[i]}ms linear both` } : undefined}
                  />
                ) : null}
              </span>
            ))}
          </div>
          <div key={`${loop}-${phase}`} className="mt-3 [animation:fx-rise_.35s_both]">
            <p className="font-mono text-[11px] text-[#2f6fed]">{focus.label}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-primary sm:text-[13px]">{focus.note}</p>
          </div>
        </div>
      </div>
    </GuideAnimationFigure>
  );
}
