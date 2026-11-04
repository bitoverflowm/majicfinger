"use client";

import { ArrowRight, Check, Database, Radio, Table2 } from "lucide-react";
import { useRef } from "react";

import { BLUE, GREEN, mulberry32, VIOLET } from "@/components/sections/features/feature-kit";
import { cn } from "@/lib/utils";
import { EASE, GuideAnimationFigure, ScaledStage, useGuidePhases } from "./guide-animation-kit";

const DIAGRAM_KEYFRAMES = `
@keyframes gx-comet { from { stroke-dashoffset: 1.3; } to { stroke-dashoffset: 0; } }
@keyframes gx-pop { 0% { opacity: 0; transform: scale(.4); } 70% { transform: scale(1.15); } 100% { opacity: 1; transform: scale(1); } }
@keyframes gx-grow-x { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@media (prefers-reduced-motion: reduce) {
  .guide-animation [class*="gx-"], .guide-animation .gx-anim { animation: none !important; }
}
`;

const CARD = "rounded-xl border border-border bg-background shadow-sm";
const FRAME = "relative size-full overflow-hidden rounded-xl border border-black/10 bg-background shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)]";

function Comet({ d, color, delay = 0, runKey }: { d: string; color: string; delay?: number; runKey: string }) {
  return (
    <>
      <path d={d} fill="none" strokeWidth={2} stroke={color} strokeOpacity={0.55} />
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
    </>
  );
}

function Pill({ label, primary }: { label: string; primary: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium",
        primary ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground",
      )}
    >
      {primary ? <Check className="size-3" strokeWidth={3} aria-hidden /> : null}
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Which source a market reads, on a timeline                          */
/* ------------------------------------------------------------------ */

const T0 = Date.UTC(2024, 0, 1);
const T1 = Date.UTC(2027, 0, 1);
const SPLIT = Date.UTC(2026, 0, 1);

const MARKETS = [
  {
    title: "Will Donald Trump win the 2024 US Presidential Election?",
    slug: "will-donald-trump-win-the-2024-us-presidential-election",
    status: "Closed",
    open: Date.UTC(2024, 0, 4),
    close: Date.UTC(2024, 10, 6),
    dates: "Jan 4, 2024 → Nov 6, 2024",
    chips: ["Polymarket Historical", "Polymarket Live as fallback"],
    why: "Closed before 2026, so Lychee reads Polymarket Historical first and falls back to Polymarket Live if the lake has no trades.",
  },
  {
    title: "Will the Democrats win the Georgia governor race in 2026?",
    slug: "will-the-democrats-win-the-georgia-governor-race-in-2026",
    status: "Open",
    open: Date.UTC(2025, 9, 14),
    close: Date.UTC(2026, 10, 4),
    dates: "Oct 14, 2025 → Nov 4, 2026",
    chips: ["Polymarket Live", "Polymarket Historical for older trades"],
    why: "Trades since Jan 1, 2026 come from Polymarket Live. Older trades come from Polymarket Historical.",
  },
  {
    title: "Will Albania win the televote for Eurovision 2026?",
    slug: "will-albania-win-the-televote-for-eurovision-2026",
    status: "Closed",
    open: Date.UTC(2026, 2, 19),
    close: Date.UTC(2026, 4, 16),
    dates: "Mar 19, 2026 → May 16, 2026",
    chips: ["Polymarket Live"],
    why: "Opened after Polymarket Historical ends on Jan 1, 2026, so every trade is on Polymarket Live.",
  },
] as const;

const TIMELINE_PHASES = [3800, 3800, 3800] as const;

const S_W = 860;
const S_H = 420;
const TL_X0 = 36;
const TL_X1 = 824;
const BAND_TOP = 136;
const BAND_BOTTOM = 286;
const BAR_Y = 222;
const BAR_H = 14;
const OUT = { x: 300, y: 326, w: 260, h: 48 };

const tx = (ms: number) => TL_X0 + ((ms - T0) / (T1 - T0)) * (TL_X1 - TL_X0);

function tradeDots(open: number, close: number, seed: number) {
  const rand = mulberry32(seed);
  return Array.from({ length: 30 }, () => {
    const ms = open + rand() * (close - open);
    return { ms, y: BAR_Y - 10 - rand() * 22, r: 1.6 + rand() ** 2 * 3 };
  }).sort((a, b) => a.ms - b.ms);
}

export function PolymarketSourceTimelineDiagram() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop } = useGuidePhases(TIMELINE_PHASES, rootRef, 1);
  const market = MARKETS[phase];
  const runKey = `${loop}-${phase}`;
  const dots = tradeDots(market.open, market.close, 7 + phase * 13);
  const segments = [
    market.open < SPLIT ? { id: "historical", from: market.open, to: Math.min(market.close, SPLIT), color: BLUE } : null,
    market.close > SPLIT ? { id: "live", from: Math.max(market.open, SPLIT), to: market.close, color: GREEN } : null,
  ].filter((s): s is NonNullable<typeof s> => s !== null);
  const outX = OUT.x + OUT.w / 2;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      backdrop="polymarket-timeline"
      label="Diagram: a timeline from 2024 to 2027 split at January 1, 2026 UTC. Markets that closed before the split read Polymarket Historical, markets that opened after it read Polymarket Live, and markets that span it read both, all into one trade sheet."
      caption="You never pick a data source. The recipe checks the market's dates against the Jan 1, 2026 boundary and reads the trades from the right place."
    >
      <style dangerouslySetInnerHTML={{ __html: DIAGRAM_KEYFRAMES }} />
      <ScaledStage width={S_W} height={S_H}>
        <div className={FRAME}>
          <svg viewBox={`0 0 ${S_W} ${S_H}`} className="absolute inset-0 size-full" aria-hidden>
            <rect x={tx(T0)} y={BAND_TOP} width={tx(SPLIT) - tx(T0)} height={BAND_BOTTOM - BAND_TOP} fill={BLUE} fillOpacity={0.06} />
            <rect x={tx(SPLIT)} y={BAND_TOP} width={tx(T1) - tx(SPLIT)} height={BAND_BOTTOM - BAND_TOP} fill={GREEN} fillOpacity={0.08} />
            <line x1={TL_X0} x2={TL_X1} y1={BAND_BOTTOM} y2={BAND_BOTTOM} className="stroke-border" strokeWidth={1.5} />
            {Array.from({ length: 13 }, (_, q) => {
              const x = tx(Date.UTC(2024 + Math.floor(q / 4), (q % 4) * 3, 1));
              const year = q % 4 === 0;
              return (
                <g key={q}>
                  <line x1={x} x2={x} y1={BAND_BOTTOM} y2={BAND_BOTTOM + (year ? 8 : 4)} className="stroke-border" strokeWidth={1.25} />
                  {year ? (
                    <text x={x} y={BAND_BOTTOM + 21} textAnchor="middle" className="fill-muted-foreground font-mono text-[10.5px]">
                      {2024 + q / 4}
                    </text>
                  ) : null}
                </g>
              );
            })}
            <line x1={tx(SPLIT)} x2={tx(SPLIT)} y1={BAND_TOP - 10} y2={BAND_BOTTOM} stroke="currentColor" strokeWidth={1.25} strokeDasharray="4 4" className="text-foreground/50" />

            {dots.map((dot, i) => (
              <circle
                key={`${runKey}-${i}`}
                cx={tx(dot.ms)}
                cy={dot.y}
                r={dot.r}
                fill={dot.ms < SPLIT ? BLUE : GREEN}
                fillOpacity={0.7}
                style={{ animation: `fx-rise .35s ease-out ${300 + ((dot.ms - market.open) / (market.close - market.open)) * 1100}ms both` }}
              />
            ))}
            {segments.map((s, i) => (
              <rect
                key={`${runKey}-${s.id}`}
                x={tx(s.from)}
                y={BAR_Y}
                width={Math.max(4, tx(s.to) - tx(s.from))}
                height={BAR_H}
                rx={BAR_H / 2}
                fill={s.color}
                className="gx-anim"
                style={{ transformBox: "fill-box", transformOrigin: "left", animation: `gx-grow-x .7s ${EASE} ${i * 450}ms both` }}
              />
            ))}
            {segments.map((s, i) => {
              const x = (tx(s.from) + tx(s.to)) / 2;
              const y = BAR_Y + BAR_H;
              return (
                <Comet
                  key={`wire-${s.id}`}
                  d={`M${x} ${y} C${x} ${y + 60}, ${outX} ${OUT.y - 50}, ${outX} ${OUT.y}`}
                  color={s.color}
                  delay={900 + i * 200}
                  runKey={runKey}
                />
              );
            })}
          </svg>

          <div key={`market-${runKey}`} className={cn(CARD, "absolute left-5 top-4 w-[400px] px-3.5 py-3 [animation:fx-rise_.35s_both]")}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Your market</p>
            <div className="mt-1 flex items-start gap-2">
              <p className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-foreground">{market.title}</p>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide",
                  market.status === "Open" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground",
                )}
              >
                {market.status}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-2 text-[10.5px] text-muted-foreground">
              <span className="min-w-0 truncate font-mono">{market.slug}</span>
              <span className="shrink-0 tabular-nums">{market.dates}</span>
            </p>
          </div>

          <div key={`route-${runKey}`} className={cn(CARD, "absolute right-5 top-4 w-[400px] px-3.5 py-3 [animation:fx-rise_.35s_.15s_both]")}>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Trade history source
              <span className="ml-auto font-mono normal-case tracking-normal text-[#2f6fed]">route_source</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {market.chips.map((chip, i) => (
                <span key={chip} className="gx-anim" style={{ animation: `gx-pop .4s ease-out ${500 + i * 150}ms both` }}>
                  <Pill label={chip} primary={i === 0} />
                </span>
              ))}
            </div>
          </div>

          <p className="absolute flex items-center gap-1.5 text-[11px] font-semibold text-foreground" style={{ left: tx(T0) + 10, top: BAND_TOP + 8 }}>
            <Database className="size-3.5" style={{ color: BLUE }} aria-hidden />
            Polymarket Historical
            <span className="font-normal text-muted-foreground">· exchange fills to Dec 31, 2025</span>
          </p>
          <p className="absolute flex items-center gap-1.5 text-[11px] font-semibold text-foreground" style={{ left: tx(SPLIT) + 10, top: BAND_TOP + 8 }}>
            <Radio className="size-3.5" style={{ color: GREEN }} aria-hidden />
            Polymarket Live
          </p>
          <span
            className="absolute -translate-x-1/2 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-foreground shadow-sm"
            style={{ left: tx(SPLIT), top: BAND_TOP - 24 }}
          >
            Jan 1, 2026 UTC
          </span>

          <div className={cn(CARD, "absolute flex items-center gap-2.5 px-3")} style={{ left: OUT.x, top: OUT.y, width: OUT.w, height: OUT.h }}>
            <Table2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0">
              <span className="block text-[11.5px] font-semibold text-foreground">One trade sheet</span>
              <span key={runKey} className="block truncate font-mono text-[9.5px] text-muted-foreground [animation:fx-rise_.35s_.9s_both]">
                Trades · {market.slug}
              </span>
            </span>
          </div>

          <p key={`why-${runKey}`} className="absolute inset-x-6 bottom-3 text-center text-[11.5px] text-muted-foreground [animation:fx-rise_.4s_.3s_both]">
            {market.why}
          </p>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* ------------------------------------------------------------------ */
/* Historical fills → one Live-style trade row                         */
/* ------------------------------------------------------------------ */

const FILLS = [
  { hash: "0x8f3a…c41e", taker: "0x51c2…9a0b", outcome: "Yes", side: "BUY", size: "120", usdc: "46.80", group: 0 },
  { hash: "0x8f3a…c41e", taker: "0x51c2…9a0b", outcome: "Yes", side: "BUY", size: "80", usdc: "31.60", group: 0 },
  { hash: "0x8f3a…c41e", taker: "0x51c2…9a0b", outcome: "Yes", side: "BUY", size: "50", usdc: "20.00", group: 0 },
  { hash: "0x2b71…08de", taker: "0xd07e…44f1", outcome: "Yes", side: "BUY", size: "40", usdc: "15.60", group: 1 },
] as const;

const GROUPS = [
  { color: BLUE, sum: "120 + 80 + 50 = 250 shares", usdc: "46.80 + 31.60 + 20.00 = 98.40 USDC", price: "98.40 ÷ 250 = 0.3936", row: ["Yes", "BUY", "0.3936", "250"] },
  { color: VIOLET, sum: "40 shares", usdc: "15.60 USDC", price: "15.60 ÷ 40 = 0.39", row: ["Yes", "BUY", "0.39", "40"] },
] as const;

const FILL_PHASES = [2200, 2600, 2600, 2600, 3400] as const;

const FILL_NOTES = [
  "Polymarket Historical logs every maker order a taker filled, so one trade can arrive as several fills.",
  "Fills that share a transaction, taker, outcome and side belong to the same trade.",
  "Lychee adds up their shares and their USDC.",
  "The row's price is the total USDC divided by the total shares.",
  "Four fills become two Live-style rows, so row counts can differ between the two sources.",
] as const;

const F_W = 860;
const F_H = 380;
const FILL_BOX = { x: 16, y: 54, w: 352 };
const GROUP_BOX = { x: 394, w: 236 };
const GROUP_Y = [64, 214];
const OUT_BOX = { x: 656, y: 54, w: 188 };
const FILL_ROW_Y0 = FILL_BOX.y + 54;
const FILL_ROW_H = 30;

export function PolymarketFillsToTradeRowDiagram() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop } = useGuidePhases(FILL_PHASES, rootRef, 4);
  const runKey = `${loop}-${phase}`;
  const keysLit = phase >= 1;
  const grouped = phase >= 2;
  const priced = phase >= 3;
  const placed = phase >= 4;
  const fillTemplate = { gridTemplateColumns: "1.25fr 1.25fr 0.8fr 0.7fr 0.6fr 0.75fr" };
  const outTemplate = { gridTemplateColumns: "0.9fr 0.8fr 1.1fr 0.8fr" };

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      backdrop="polymarket-fills"
      label="Diagram: four Polymarket Historical fills from one transaction. Three share a taker, outcome and side, so Lychee sums their shares and USDC into one trade row priced at 98.40 USDC divided by 250 shares, 0.3936. The fourth fill has a different taker and becomes its own row."
      caption="For markets that span both sources, older fills are grouped into Live-style rows, priced at total USDC divided by total shares."
    >
      <style dangerouslySetInnerHTML={{ __html: DIAGRAM_KEYFRAMES }} />
      <ScaledStage width={F_W} height={F_H}>
        <div className={FRAME}>
          <svg viewBox={`0 0 ${F_W} ${F_H}`} className="absolute inset-0 size-full" aria-hidden>
            {grouped
              ? FILLS.map((fill, i) => {
                  const y1 = FILL_ROW_Y0 + i * FILL_ROW_H + FILL_ROW_H / 2;
                  const x1 = FILL_BOX.x + FILL_BOX.w;
                  const y2 = GROUP_Y[fill.group] + 44;
                  const x2 = GROUP_BOX.x;
                  const mx = (x1 + x2) / 2;
                  return (
                    <Comet key={i} d={`M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} color={GROUPS[fill.group].color} delay={i * 120} runKey={runKey} />
                  );
                })
              : null}
            {placed
              ? GROUPS.map((group, g) => {
                  const x1 = GROUP_BOX.x + GROUP_BOX.w;
                  const y1 = GROUP_Y[g] + 44;
                  const x2 = OUT_BOX.x;
                  const y2 = OUT_BOX.y + 54 + (g + 1) * FILL_ROW_H + FILL_ROW_H / 2;
                  const mx = (x1 + x2) / 2;
                  return <Comet key={g} d={`M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} color={group.color} delay={g * 160} runKey={runKey} />;
                })
              : null}
          </svg>

          <p className="absolute left-4 top-3.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Group key · <span className="text-foreground">transaction + taker + outcome + side</span>
          </p>

          <div className={cn(CARD, "absolute overflow-hidden")} style={{ left: FILL_BOX.x, top: FILL_BOX.y, width: FILL_BOX.w }}>
            <p className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-[11.5px] font-semibold text-foreground">
              <Database className="size-3.5" style={{ color: BLUE }} aria-hidden />
              Polymarket Historical fills
            </p>
            <div className="grid border-b border-border bg-muted/60 text-[9.5px] font-medium text-muted-foreground" style={fillTemplate}>
              {["Tx hash", "Taker", "Outcome", "Side", "Size", "USDC"].map((c, i) => (
                <span key={c} className={cn("truncate px-2 py-1 transition-colors duration-300", keysLit && i < 4 && "bg-[#2f6fed]/10 text-[#2f6fed]")}>
                  {c}
                </span>
              ))}
            </div>
            {FILLS.map((fill, i) => {
              const color = GROUPS[fill.group].color;
              return (
                <div
                  key={`${loop}-${i}`}
                  className="grid items-center border-b border-border/50 font-mono text-[10px] tabular-nums text-foreground transition-colors duration-500 last:border-b-0"
                  style={{
                    ...fillTemplate,
                    height: FILL_ROW_H,
                    background: keysLit ? `${color}12` : undefined,
                    boxShadow: keysLit ? `inset 3px 0 0 ${color}` : undefined,
                    animation: `fx-slide-in .35s ease-out ${i * 140}ms both`,
                  }}
                >
                  {[fill.hash, fill.taker].map((cell) => (
                    <span
                      key={cell}
                      className={cn("truncate px-2", keysLit && fill.group === 1 && "font-semibold")}
                      style={keysLit && fill.group === 1 ? { color: VIOLET } : undefined}
                    >
                      {cell}
                    </span>
                  ))}
                  <span className="truncate px-2 text-[#0f9f6e]">{fill.outcome}</span>
                  <span className="truncate px-2">{fill.side}</span>
                  <span className="truncate px-2">{fill.size}</span>
                  <span className="truncate px-2">{fill.usdc}</span>
                </div>
              );
            })}
          </div>

          {GROUPS.map((group, g) => (
            <div
              key={`group-${g}`}
              className={cn(CARD, "absolute px-3 py-2.5 transition-all duration-500")}
              style={{
                left: GROUP_BOX.x,
                top: GROUP_Y[g],
                width: GROUP_BOX.w,
                opacity: grouped ? 1 : 0.35,
                borderColor: grouped ? group.color : undefined,
              }}
            >
              <p className="truncate font-mono text-[9.5px] text-muted-foreground">{g === 0 ? "0x8f3a…c41e · 0x51c2…9a0b" : "0x2b71…08de · 0xd07e…44f1"}</p>
              {grouped ? (
                <div key={`${loop}-sum`} className="[animation:fx-rise_.35s_both]">
                  <p className="mt-1 font-mono text-[10px] text-foreground">{group.sum}</p>
                  <p className="font-mono text-[10px] text-foreground">{group.usdc}</p>
                </div>
              ) : (
                <p className="mt-1 text-[10px] text-muted-foreground">Yes · BUY</p>
              )}
              {priced ? (
                <p key={`${loop}-price`} className="mt-1.5 rounded-md px-1.5 py-1 font-mono text-[10.5px] font-semibold [animation:fx-rise_.35s_both]" style={{ background: `${group.color}14`, color: group.color }}>
                  price = {group.price}
                </p>
              ) : null}
            </div>
          ))}

          <div className={cn(CARD, "absolute overflow-hidden")} style={{ left: OUT_BOX.x, top: OUT_BOX.y, width: OUT_BOX.w }}>
            <p className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-[11.5px] font-semibold text-foreground">
              <Table2 className="size-3.5 text-muted-foreground" aria-hidden />
              Trade sheet rows
            </p>
            <div className="grid border-b border-border bg-muted/60 text-[9.5px] font-medium text-muted-foreground" style={outTemplate}>
              {["Outcome", "Side", "Price", "Size"].map((c) => (
                <span key={c} className="truncate px-2 py-1">
                  {c}
                </span>
              ))}
            </div>
            <div className="grid items-center border-b border-border/50 font-mono text-[10px] tabular-nums text-muted-foreground" style={{ ...outTemplate, height: FILL_ROW_H }}>
              <span className="truncate px-2">Yes</span>
              <span className="truncate px-2">BUY</span>
              <span className="truncate px-2">0.7</span>
              <span className="truncate px-2">35</span>
            </div>
            {GROUPS.map((group, g) => (
              <div
                key={`${loop}-out-${g}`}
                className="grid items-center border-b border-border/50 font-mono text-[10px] tabular-nums text-foreground last:border-b-0"
                style={{
                  ...outTemplate,
                  height: FILL_ROW_H,
                  opacity: placed ? 1 : 0,
                  background: placed ? `${group.color}12` : undefined,
                  boxShadow: placed ? `inset 3px 0 0 ${group.color}` : undefined,
                  animation: placed ? `fx-slide-in .35s ease-out ${600 + g * 160}ms both` : undefined,
                }}
              >
                {group.row.map((cell, j) => (
                  <span key={j} className={cn("truncate px-2", j === 0 && "text-[#0f9f6e]", j === 2 && "font-semibold")}>
                    {cell}
                  </span>
                ))}
              </div>
            ))}
            <p className="flex items-center gap-1 px-3 py-2 text-[9.5px] text-muted-foreground">
              <Radio className="size-3" style={{ color: GREEN }} aria-hidden />
              Same columns as Polymarket Live
            </p>
          </div>

          <div className="absolute inset-x-5 bottom-4 flex items-center gap-3">
            <div className="flex shrink-0 gap-1">
              {FILL_PHASES.map((ms, i) => (
                <span key={i} className="h-1 w-7 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                  {i <= phase ? (
                    <span
                      key={`${loop}-${i === phase}`}
                      className="block h-full origin-left rounded-full bg-[#2f6fed]"
                      style={i === phase ? { animation: `fx-fill ${ms}ms linear both` } : undefined}
                    />
                  ) : null}
                </span>
              ))}
            </div>
            <p key={runKey} className="min-w-0 text-[12px] leading-snug text-foreground [animation:fx-rise_.35s_both]">
              {FILL_NOTES[phase]}
            </p>
          </div>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* ------------------------------------------------------------------ */
/* Reading a Polymarket trade row                                      */
/* ------------------------------------------------------------------ */

const ROW_COLUMNS = [
  { key: "time", label: "Observed At", value: "2026-11-02T17:47:34.000Z", note: "When the trade settled, in UTC. The Timestamp column holds the same moment in epoch seconds." },
  { key: "outcome", label: "Outcome", value: "No", note: "The outcome token that changed hands. Yes and No are separate tokens, and each trades on its own book." },
  { key: "side", label: "Side", value: "BUY", note: "BUY or SELL, from the wallet that filled. Buying No is a different trade from selling Yes, so read Side together with Outcome." },
  { key: "price", label: "Price", value: "0.3", note: "USDC per share. 0.3 is 30¢ a share, which reads as a 30% implied probability for No." },
  { key: "size", label: "Size", value: "1031", note: "Shares filled. 1,031 shares at 0.3 is 309.30 USDC of execution value before fees." },
  { key: "hash", label: "Transaction Hash", value: "0xd4859ca946…", note: "The on-chain transaction that settled the trade. One transaction can settle several rows, so don't dedupe on it alone." },
] as const;

const ROW_PHASES = [2600, 2600, 2600, 2600, 2600, 2600] as const;

export function PolymarketTradeRowAnatomy() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop } = useGuidePhases(ROW_PHASES, rootRef, 3);
  const focus = ROW_COLUMNS[phase];
  const template = { gridTemplateColumns: "1.9fr 0.75fr 0.6fr 0.6fr 0.7fr 1.25fr" };

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      backdrop="polymarket-row"
      label="Annotated Polymarket trade row: Observed At, Outcome, Side, Price, Size and Transaction Hash, each explained in turn."
      caption="Every row is one trade. Price is USDC per share, so 0.3 means 30¢."
    >
      <div className="overflow-hidden rounded-xl border border-black/10 bg-background shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)]">
        <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
          <Table2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-[11.5px] font-semibold text-foreground">Trades · will-the-democrats-win-the-georgia-governor-race-in-2026</span>
        </div>
        <div className="overflow-hidden text-[10.5px] sm:text-[11.5px]">
          <div className="grid border-b border-border bg-muted/60 font-medium text-muted-foreground" style={template}>
            {ROW_COLUMNS.map((c) => (
              <span key={c.key} className={cn("truncate px-2 py-1.5 transition-colors duration-300", c.key === focus.key && "bg-[#2f6fed]/10 text-[#2f6fed]")}>
                {c.label}
              </span>
            ))}
          </div>
          {[["2026-11-02T17:47:34.000Z", "No", "BUY", "0.31", "50", "0x97be18cdd2…"], null, ["2026-11-02T17:47:34.000Z", "No", "BUY", "0.31", "289.032259", "0xd565fedb99…"]].map((row, i) => (
            <div key={i} className={cn("grid border-b border-border/60 font-mono tabular-nums", row ? "text-muted-foreground" : "bg-[#2f6fed]/[0.03] text-foreground")} style={template}>
              {(row ?? ROW_COLUMNS.map((c) => c.value)).map((cell, j) => {
                const column = ROW_COLUMNS[j];
                const lit = !row && column.key === focus.key;
                return (
                  <span
                    key={j}
                    className={cn(
                      "truncate px-2 py-2 transition-all duration-300",
                      lit && "bg-[#2f6fed]/10 font-semibold text-[#2f6fed]",
                      column.key === "outcome" && !lit && (cell === "Yes" ? "text-[#0f9f6e]" : "text-[#e5484d]"),
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
              <span key={c.key} className="h-1 flex-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
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
            <p className="flex items-center gap-1.5 font-mono text-[11px] text-[#2f6fed]">
              {focus.label}
              {focus.key === "size" ? (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ArrowRight className="size-3" aria-hidden /> 1,031 × 0.3 = 309.30 USDC
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-primary sm:text-[13px]">{focus.note}</p>
          </div>
        </div>
      </div>
    </GuideAnimationFigure>
  );
}
