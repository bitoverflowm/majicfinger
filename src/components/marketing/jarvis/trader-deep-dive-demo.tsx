"use client";

import { useRef } from "react";

import { FeatureWindow, useInView, useReducedMotion } from "@/components/sections/features/feature-kit";
import { cn } from "@/lib/utils";
import { useStepClock } from "./jarvis-kit";

type Tile = { label: string; value: string; tone: "good" | "bad" | "neutral" };
type Cluster = { tab: string; asks: string[]; tiles: Tile[] };

/** Illustrative trader; the real report uses live Polymarket data. */
const CLUSTERS: readonly Cluster[] = [
  {
    tab: "Edge",
    asks: ["before or after the news?", "is he early?", "does price move his way?"],
    tiles: [
      { label: "Big bets vs the news", value: "4 ahead · 1 reacting", tone: "good" },
      { label: "Typical entry", value: "61 days before close", tone: "neutral" },
    ],
  },
  {
    tab: "Style",
    asks: ["longshots or favorites?", "how concentrated?", "current form"],
    tiles: [
      { label: "Longshots under 20¢", value: "-$94K · 18% won", tone: "bad" },
      { label: "Profit from top 5 bets", value: "52%", tone: "neutral" },
    ],
  },
  {
    tab: "Category",
    asks: ["where does he rank?", "where does he bleed?", "which countries?"],
    tiles: [
      { label: "Leaderboard rank", value: "#3 Politics · #41 Crypto", tone: "good" },
      { label: "Leaks money in Sports", value: "-$61K", tone: "bad" },
    ],
  },
  {
    tab: "Book",
    asks: ["what's he buying now?", "contrarian bets", "if I copied him"],
    tiles: [
      { label: "Copying his last 20 bets", value: "$2,000 → $2,640", tone: "good" },
      { label: "Biggest disagreement", value: "YES at 9¢, $40K in", tone: "neutral" },
    ],
  },
  {
    tab: "Crowd",
    asks: ["similar traders", "with or against whales?", "who follows him?"],
    tiles: [
      { label: "Biggest whale vs him", value: "against on 2 of 5", tone: "bad" },
      { label: "Repeat followers", value: "12 wallets within 6h", tone: "neutral" },
    ],
  },
];

const TONE = {
  good: "border-[#10b981]/30 bg-[#10b981]/10 text-[#0f9f6e]",
  bad: "border-rose-400/30 bg-rose-400/10 text-rose-600",
  neutral: "border-border bg-muted/50 text-primary",
} as const;

const DURATIONS = CLUSTERS.map(() => 3400);

export function TraderDeepDiveDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const { step, run, goTo } = useStepClock(DURATIONS, inView && !reduced);
  const cluster = CLUSTERS[step];

  return (
    <div ref={rootRef} className="size-full">
      <FeatureWindow title="Jarvis · go ultra deep" className="size-full">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="grid shrink-0 grid-cols-5 gap-1 border-b border-border p-1.5">
            {CLUSTERS.map((item, i) => {
              const active = i === step;
              return (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-pressed={active}
                  className={cn(
                    "relative flex h-8 min-w-0 items-center justify-center overflow-hidden rounded-md px-1 text-[11px] font-medium transition-colors",
                    active ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted hover:text-primary",
                  )}
                >
                  <span className="truncate">{item.tab}</span>
                  {active && !reduced ? (
                    <span
                      key={run}
                      className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[#2f6fed] [animation:fx-fill_linear_both]"
                      style={{ animationDuration: `${DURATIONS[i]}ms` }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div key={`${step}-${run}`} className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold text-primary">election_owl</p>
              <p className="text-[11px] text-muted-foreground">+$2.4M lifetime · $58M volume</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cluster.asks.map((ask, i) => (
                <span
                  key={ask}
                  className="rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10.5px] text-primary [animation:jx-pop_.35s_both]"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  “{ask}”
                </span>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {cluster.tiles.map((tile, i) => (
                <div
                  key={tile.label}
                  className={cn("flex flex-col gap-0.5 rounded-lg border p-2.5 [animation:jx-pop_.45s_both]", TONE[tile.tone])}
                  style={{ animationDelay: `${400 + i * 160}ms` }}
                >
                  <span className="text-[10.5px] text-muted-foreground">{tile.label}</span>
                  <span className="text-[14px] font-semibold tracking-tight">{tile.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex h-7 shrink-0 items-center justify-between gap-2 border-t border-border px-3 text-[10px] text-muted-foreground">
            <span>16 reads · 5 groups · one dashboard</span>
            <span className="font-mono">lycheedata.com/jarvis/report</span>
          </div>
        </div>
      </FeatureWindow>
    </div>
  );
}
