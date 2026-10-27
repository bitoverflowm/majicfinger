"use client";

/* eslint-disable @next/next/no-img-element */
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { BLUE, FeatureWindow, GREEN, RED, linePath, useInView, useReducedMotion } from "./feature-kit";

const POINTS = 28;
const TICK_MS = 1100;
const HOT_TICKS = 6;

const MARKETS = [
  { id: "fed", name: "Fed cuts in December?", logo: "/kalshi.png", tile: "bg-[#28CC95]", base: 58 },
  { id: "btc", name: "BTC above $100k by Friday?", logo: "/polymarket.png", tile: "bg-[#2E5CFF]", base: 41 },
  { id: "nba", name: "Celtics win the Finals?", logo: "/kalshi.png", tile: "bg-[#28CC95]", base: 37 },
  { id: "cpi", name: "CPI above 3% in November?", logo: "/polymarket.png", tile: "bg-[#2E5CFF]", base: 52 },
] as const;

type Series = { price: number[]; mentions: number[] };

function seed(base: number, k: number): Series {
  return {
    price: Array.from({ length: POINTS }, (_, i) => Math.round((base + Math.sin(i * 0.55 + k) * 1.4) * 10) / 10),
    mentions: Array.from({ length: POINTS }, (_, i) => 18 + Math.round(Math.abs(Math.sin(i * 0.9 + k)) * 14)),
  };
}

export function GrowthTrendsDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const [data, setData] = useState<Record<string, Series>>(() =>
    Object.fromEntries(MARKETS.map((m, k) => [m.id, seed(m.base, k)])),
  );
  const [tick, setTick] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const hot = MARKETS[Math.floor(tick / HOT_TICKS) % MARKETS.length].id;

  useEffect(() => {
    if (!inView || reduced) return;
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      setData((prev) => {
        const next: Record<string, Series> = {};
        for (const m of MARKETS) {
          const s = prev[m.id];
          const last = s.price[s.price.length - 1];
          const isHot = m.id === hot;
          const pull = (m.base - last) * 0.08;
          const drift = isHot ? 1.6 + Math.random() * 1.4 : pull + (Math.random() - 0.5) * 1.2;
          const price = Math.max(3, Math.min(97, Math.round((last + drift) * 10) / 10));
          const mention = isHot ? 60 + Math.round(Math.random() * 40) : 14 + Math.round(Math.random() * 18);
          next[m.id] = { price: [...s.price, price].slice(-POINTS), mentions: [...s.mentions, mention].slice(-POINTS) };
        }
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [inView, reduced, hot]);

  const ranked = useMemo(
    () =>
      MARKETS.map((m) => {
        const p = data[m.id].price;
        return { ...m, price: p[p.length - 1], change: p[p.length - 1] - p[p.length - 9] };
      }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)),
    [data],
  );

  const top = ranked[0];
  const focusId = picked ?? top.id;
  const focus = ranked.find((m) => m.id === focusId)!;
  const series = data[focusId];
  const maxMention = Math.max(...series.mentions);
  const trending = Math.abs(top.change) >= 4;

  return (
    <div ref={rootRef} className="size-full">
      <FeatureWindow title="Lychee Terminal" className="size-full">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-border px-3.5 pb-2.5 pt-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] text-muted-foreground">{focus.name}</p>
                <p className="font-mono text-lg font-medium tabular-nums tracking-tight text-primary">
                  {focus.price.toFixed(1)}¢
                  <span className={cn("ml-1.5 text-[11px]", focus.change >= 0 ? "text-[#0f9f6e]" : "text-[#e5484d]")}>
                    {focus.change >= 0 ? "+" : ""}
                    {focus.change.toFixed(1)}
                  </span>
                </p>
              </div>
              {focus.id === top.id && trending ? (
                <span className="relative inline-flex shrink-0 items-center gap-1 rounded-full bg-[#2f6fed] px-2 py-0.5 text-[10px] font-medium text-white">
                  <span className="absolute inset-0 animate-ping rounded-full bg-[#2f6fed] opacity-30" />
                  <TrendingUp className="size-3" /> Trend spotted
                </span>
              ) : null}
            </div>
            <svg viewBox="0 0 300 56" preserveAspectRatio="none" className="mt-1.5 h-14 w-full">
              <defs>
                <linearGradient id="gt-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={GREEN} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${linePath(series.price, 300, 56)} L300 56 L0 56 Z`} fill="url(#gt-fill)" className="fx-morph" />
              <path d={linePath(series.price, 300, 56)} fill="none" stroke={GREEN} strokeWidth="2" vectorEffect="non-scaling-stroke" className="fx-morph" />
            </svg>
            <div className="mt-1 flex h-7 items-end gap-[2px]">
              {series.mentions.map((v, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-[1px] transition-[height,background-color] duration-500"
                  style={{
                    height: `${(v / maxMention) * 100}%`,
                    backgroundColor: v > 50 ? BLUE : "rgba(148,163,184,0.45)",
                  }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[9.5px] text-muted-foreground">
              <span>Price</span>
              <span className="flex items-center gap-1">
                <img src="/x.png" alt="" className="size-2.5 rounded-sm bg-black p-px" /> Mentions on X
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between px-3.5 pb-1 pt-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Top movers</p>
            <span className="font-mono text-[10px] text-muted-foreground">last 10 min</span>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden px-2 pb-2">
            {ranked.map((m) => {
              const p = data[m.id].price;
              const up = m.change >= 0;
              return (
                <motion.button
                  key={m.id}
                  layout
                  transition={{ duration: 0.5, ease: [0.165, 0.84, 0.44, 1] }}
                  type="button"
                  onClick={() => setPicked((cur) => (cur === m.id ? null : m.id))}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted",
                    m.id === focusId && "bg-muted",
                  )}
                >
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded p-0.5", m.tile)}>
                    <img src={m.logo} alt="" className="size-full object-contain" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-primary">{m.name}</span>
                  <svg viewBox="0 0 60 18" preserveAspectRatio="none" className="h-4 w-12 shrink-0">
                    <path
                      d={linePath(p.slice(-12), 60, 18, 2)}
                      fill="none"
                      stroke={up ? GREEN : RED}
                      strokeWidth="1.5"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <span
                    className={cn(
                      "w-12 shrink-0 rounded px-1 py-0.5 text-right font-mono text-[10px] tabular-nums",
                      up ? "bg-[#10b981]/10 text-[#0f9f6e]" : "bg-[#e5484d]/10 text-[#e5484d]",
                    )}
                  >
                    {up ? "+" : ""}
                    {m.change.toFixed(1)}¢
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </FeatureWindow>
    </div>
  );
}
