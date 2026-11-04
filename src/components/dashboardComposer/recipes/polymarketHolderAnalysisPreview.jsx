"use client";

import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { squarify } from "@/lib/visualizations/volumeTreemap";
import {
  AgentStatus,
  Backdrop,
  CSS,
  EASE,
  PromptBar,
  rand,
  READY,
  usePrefersReducedMotion,
  useTimeline,
} from "./kalshiTradeHistoryPreview";

const MAP_W = 200;
const MAP_H = 120;

function sampleTiles(seed) {
  const items = Array.from({ length: 16 }, (_, index) => ({
    id: index,
    weight: Math.round(1000 * (0.82 ** index) * (0.7 + rand(seed + index) * 0.6)),
    both: seed === 1 ? index === 2 || index === 7 : index === 4 || index === 9,
  }));
  return squarify(items, MAP_W, MAP_H);
}

const SIDES = [
  { label: "Yes", fill: "oklch(0.696 0.17 162.48)", text: "text-emerald-700 dark:text-emerald-300", tiles: sampleTiles(1) },
  { label: "No", fill: "oklch(0.645 0.246 16.439)", text: "text-rose-700 dark:text-rose-300", tiles: sampleTiles(7) },
];

const TRADERS = [
  { name: "kestrel", side: "Yes", value: "$2.1M" },
  { name: "bluewhale", side: "Yes", value: "$1.4M" },
  { name: "0xMarlo", side: "Yes + No", value: "$912K", both: true },
  { name: "juniper", side: "No", value: "$640K" },
  { name: "nightowl", side: "No", value: "$418K" },
];

function mapStyle(index, phase) {
  const left = index === 0 ? 6 : 51;
  if (phase < 1) return { left: `${left}%`, top: "40%", width: "43%", height: "36%", opacity: 0, filter: "blur(8px)" };
  if (phase < 3) return { left: `${left}%`, top: "27%", width: "43%", height: "42%", opacity: 1, filter: "none" };
  return { left: `${left}%`, top: "23%", width: "43%", height: "29%", opacity: 1, filter: "none" };
}

function HolderMap({ side, index, phase }) {
  const max = side.tiles[0]?.weight || 1;
  return (
    <div
      className="absolute z-[5] flex flex-col overflow-hidden rounded-xl border border-black/[0.08] bg-background p-2 shadow-[0_18px_50px_-18px_rgba(15,23,42,0.35)] dark:border-white/[0.1]"
      style={{
        ...mapStyle(index, phase),
        transition: `left 800ms ${EASE}, top 800ms ${EASE}, width 800ms ${EASE}, height 800ms ${EASE}, opacity 600ms ease, filter 600ms ease`,
        transitionDelay: phase === 1 ? `${index * 120}ms` : "0ms",
      }}
    >
      <p className={cn("px-0.5 pb-1 text-[10.5px] font-semibold", side.text)}>{side.label} holders</p>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="none" className="min-h-0 w-full flex-1" aria-hidden>
        {side.tiles.map((tile, at) => (
          <rect
            key={tile.id}
            x={tile.x + (tile.both ? 1 : 0)}
            y={tile.y + (tile.both ? 1 : 0)}
            width={Math.max(0, tile.w - 1.5 - (tile.both ? 2 : 0))}
            height={Math.max(0, tile.h - 1.5 - (tile.both ? 2 : 0))}
            rx={2}
            fill={`color-mix(in srgb, ${side.fill} ${Math.round(38 + Math.sqrt(tile.weight / max) * 62)}%, white)`}
            {...(tile.both && phase >= 2 ? { stroke: "oklch(0.769 0.188 70.08)", strokeWidth: 2, vectorEffect: "non-scaling-stroke" } : {})}
            style={{
              opacity: phase >= 2 ? 1 : 0,
              transform: phase >= 2 ? "scale(1)" : "scale(0.6)",
              transformOrigin: `${tile.x + tile.w / 2}px ${tile.y + tile.h / 2}px`,
              transition: `opacity 400ms ease, transform 500ms ${EASE}`,
              transitionDelay: phase === 2 ? `${at * 45}ms` : "0ms",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

function TraderList({ phase }) {
  const shown = phase >= 3;
  return (
    <div
      className="absolute left-[6%] z-[6] w-[88%] overflow-hidden rounded-xl border border-black/[0.08] bg-background shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] dark:border-white/[0.1]"
      style={{
        top: shown ? "55%" : "64%",
        opacity: shown ? 1 : 0,
        filter: shown ? "none" : "blur(6px)",
        transition: `top 700ms ${EASE}, opacity 500ms ease, filter 500ms ease`,
      }}
    >
      <p className="border-b border-black/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground dark:border-white/[0.08]">
        Top 5 holders
      </p>
      {TRADERS.map((trader, index) => (
        <div
          key={trader.name}
          className="flex items-center gap-2 px-3 py-[3px]"
          style={{
            opacity: shown ? 1 : 0,
            transform: shown ? "none" : "translateX(-12px)",
            transition: `opacity 300ms ease, transform 500ms ${EASE}`,
            transitionDelay: shown ? `${120 + index * 80}ms` : "0ms",
          }}
        >
          <span className="w-3 text-right font-mono text-[10px] tabular-nums text-muted-foreground">{index + 1}</span>
          <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-foreground">{trader.name}</span>
          {trader.both ? (
            <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1 text-[9.5px] font-semibold text-amber-700 dark:text-amber-300">
              <ArrowLeftRight className="size-2.5" aria-hidden />
              Both
            </span>
          ) : null}
          <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">{trader.value}</span>
        </div>
      ))}
    </div>
  );
}

function TabStrip({ phase }) {
  const shown = phase >= 4;
  const ready = phase === READY;
  return (
    <div className="absolute inset-x-[6%] bottom-[3%] z-[7] flex gap-1.5 overflow-hidden">
      {TRADERS.map((trader, index) => (
        <span
          key={trader.name}
          className={cn(
            "min-w-0 flex-1 truncate rounded-md border px-1.5 py-1 text-center text-[10px] font-medium shadow-sm",
            ready && index === 0
              ? "border-[#2f6fed] bg-[#e7f0ff] text-foreground dark:border-blue-400 dark:bg-blue-500/15"
              : "border-black/[0.08] bg-background text-muted-foreground dark:border-white/[0.1]",
          )}
          style={{
            opacity: shown ? 1 : 0,
            transform: shown ? "none" : "translateY(-60px) scale(0.85)",
            transition: `opacity 400ms ease, transform 650ms ${EASE}`,
            transitionDelay: shown ? `${index * 110}ms` : "0ms",
          }}
        >
          {trader.name} · {trader.side}
        </span>
      ))}
    </div>
  );
}

/** A looping teaser for the holder analysis recipe, shown while its row is hovered. */
export function PolymarketHolderAnalysisPreview() {
  const reduced = usePrefersReducedMotion();
  const { phase, loop } = useTimeline(reduced);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recipe</p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">Polymarket Holder Analysis</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Who holds each side, and a tab for each of the top 5.</p>
      </div>
      <div className="rp-stage relative mt-5 min-h-0 flex-1 overflow-hidden rounded-2xl bg-[#e6edf3] dark:bg-[#161c23]">
        <Backdrop />
        <div key={loop} className="absolute inset-0 animate-in fade-in duration-500">
          <PromptBar phase={phase} query="who holds the house midterms market on polymarket" />
          <AgentStatus phase={phase} />
          {SIDES.map((side, index) => (
            <HolderMap key={side.label} side={side} index={index} phase={phase} />
          ))}
          <TraderList phase={phase} />
          <TabStrip phase={phase} />
        </div>
      </div>
    </div>
  );
}
