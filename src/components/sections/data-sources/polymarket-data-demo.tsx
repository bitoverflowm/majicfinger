"use client";

/* eslint-disable @next/next/no-img-element */
import { ChevronLeft } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { mulberry32, useInView, usePhases, useReducedMotion } from "../features/feature-kit";
import { DataCardFrame } from "./data-card-frame";

type Side = "Yes" | "No";
type Holder = { addr: string; side: Side; shares: number };
type Market = {
  question: string;
  category: string;
  yes: number;
  volume: string;
  holderCount: string;
  holders: readonly Holder[];
};
type Position = { question: string; category: string; side: Side; value: number };

const MARKETS: readonly Market[] = [
  {
    question: "Bitcoin above $150k on Dec 31?",
    category: "Crypto",
    yes: 27,
    volume: "$18.4M vol",
    holderCount: "6,212",
    holders: [
      { addr: "0x7a3f…c21e", side: "No", shares: 412_000 },
      { addr: "0x19bd…04af", side: "Yes", shares: 268_500 },
      { addr: "0xc04e…9b72", side: "No", shares: 190_200 },
      { addr: "0x5e81…d3c0", side: "Yes", shares: 121_800 },
    ],
  },
  {
    question: "Fed cuts rates in December?",
    category: "Economics",
    yes: 61,
    volume: "$42.1M vol",
    holderCount: "11,904",
    holders: [
      { addr: "0x3c90…7e15", side: "Yes", shares: 905_400 },
      { addr: "0xa1d2…f8b3", side: "Yes", shares: 544_100 },
      { addr: "0x6f07…21ca", side: "No", shares: 318_700 },
      { addr: "0xe4b8…5d09", side: "Yes", shares: 202_600 },
    ],
  },
  {
    question: "Celtics win the NBA Finals?",
    category: "Sports",
    yes: 18,
    volume: "$9.7M vol",
    holderCount: "3,488",
    holders: [
      { addr: "0x8d14…a6f2", side: "Yes", shares: 233_900 },
      { addr: "0x2b7c…e930", side: "No", shares: 187_300 },
      { addr: "0xf5a6…0c47", side: "Yes", shares: 96_400 },
      { addr: "0x41e9…b85d", side: "No", shares: 71_200 },
    ],
  },
];

const OTHER_POSITIONS = [
  { question: "ETH above $5k by June?", category: "Crypto" },
  { question: "US recession in 2026?", category: "Economics" },
  { question: "Gold above $4k on Dec 31?", category: "Commodities" },
  { question: "Lakers make the playoffs?", category: "Sports" },
  { question: "Best Picture goes to an upset?", category: "Culture" },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Crypto: "#2f6fed",
  Economics: "#10b981",
  Commodities: "#f59e0b",
  Sports: "#a855f7",
  Culture: "#e5484d",
};

/** Holders list, then the highlighted holder, then their wallet, per market. */
const PHASE_MS = [2600, 1000, 4800];

function compact(value: number, prefix = "") {
  if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${prefix}${(value / 1_000).toFixed(1)}K`;
  return `${prefix}${value}`;
}

function avatar(addr: string) {
  const hue = (parseInt(addr.slice(2, 6), 16) * 7) % 360;
  return `linear-gradient(135deg, hsl(${hue} 75% 62%), hsl(${(hue + 70) % 360} 70% 48%))`;
}

function walletFor(marketIndex: number, holderIndex: number) {
  const market = MARKETS[marketIndex];
  const holder = market.holders[holderIndex];
  const rand = mulberry32(marketIndex * 31 + holderIndex * 7 + 3);
  const price = holder.side === "Yes" ? market.yes : 100 - market.yes;
  const lead: Position = {
    question: market.question,
    category: market.category,
    side: holder.side,
    value: Math.round((holder.shares * price) / 100),
  };
  const pool = OTHER_POSITIONS.filter((p) => p.category !== market.category);
  const a = Math.floor(rand() * pool.length);
  const b = (a + 1 + Math.floor(rand() * (pool.length - 1))) % pool.length;
  const positions: Position[] = [
    lead,
    ...[pool[a], pool[b]].map((p) => ({
      question: p.question,
      category: p.category,
      side: (rand() < 0.5 ? "Yes" : "No") as Side,
      value: Math.round(lead.value * (0.25 + rand() * 0.9)),
    })),
  ];
  const total = positions.reduce((sum, p) => sum + p.value, 0);
  return {
    positions,
    exposure: positions.map((p) => ({ category: p.category, share: p.value / total })),
    pnl: Math.round((rand() - 0.35) * total * 0.4),
    trades: 12 + Math.floor(rand() * 80),
    lastActive: `${2 + Math.floor(rand() * 50)}m ago`,
  };
}

export function PolymarketDataDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const [pinned, setPinned] = useState<{ market: number; holder: number | null } | null>(null);
  const { phase, loop } = usePhases(PHASE_MS, inView && !reduced && pinned === null);

  const marketIndex = pinned ? pinned.market : loop % MARKETS.length;
  const market = MARKETS[marketIndex];
  const holderIndex = pinned ? pinned.holder : phase >= 1 ? loop % market.holders.length : null;
  const walletOpen = pinned ? pinned.holder !== null : phase === 2;

  // Keep the last wallet on screen while its panel slides away, and replay its rows on each open.
  const shownRef = useRef({ market: 0, holder: 0 });
  const openCount = useRef(0);
  const wasOpen = useRef(false);
  if (walletOpen && holderIndex !== null) shownRef.current = { market: marketIndex, holder: holderIndex };
  if (walletOpen && !wasOpen.current) openCount.current += 1;
  wasOpen.current = walletOpen;
  const shown = shownRef.current;
  const shownHolder = MARKETS[shown.market].holders[shown.holder];
  const wallet = walletFor(shown.market, shown.holder);
  const maxShares = Math.max(...market.holders.map((h) => h.shares));

  return (
    <DataCardFrame title="Polymarket data" frameRef={rootRef}>
      <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#2E5CFF] p-1">
          <img src="/polymarket.png" alt="" className="size-full rounded-sm object-contain" />
        </span>
        <div key={marketIndex} className="ds-fade min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-primary">{market.question}</p>
          <p className="flex items-center gap-1.5 truncate text-[10px] text-muted-foreground">
            <span className="font-mono tabular-nums text-[#0f9f6e]">Yes {market.yes}¢</span>
            <span className="font-mono tabular-nums text-[#e5484d]">No {100 - market.yes}¢</span>
            <span className="truncate">
              · {market.volume} · {market.holderCount} holders
            </span>
          </p>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="flex h-6 items-center border-b border-border bg-muted px-3.5 text-[10px] text-muted-foreground">
          <span className="flex-1">Top holders</span>
          <span className="w-12 text-right">Shares</span>
        </div>
        {market.holders.map((holder, i) => (
          <button
            key={`${marketIndex}-${holder.addr}`}
            type="button"
            onClick={() => setPinned({ market: marketIndex, holder: i })}
            className={cn(
              "ds-fade flex h-8 w-full items-center gap-2 border-b border-border px-3.5 text-left text-[11px] transition-colors hover:bg-muted",
              i === holderIndex && "bg-muted ring-1 ring-inset ring-[#2f6fed]/50",
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="size-4 shrink-0 rounded-full" style={{ background: avatar(holder.addr) }} />
            <span className="w-[5.75rem] shrink-0 truncate font-mono text-primary">{holder.addr}</span>
            <SidePill side={holder.side} />
            <span className="relative ml-auto h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  holder.side === "Yes" ? "bg-[#10b981]" : "bg-[#e5484d]",
                )}
                style={{ width: `${(holder.shares / maxShares) * 100}%` }}
              />
            </span>
            <span className="w-12 shrink-0 text-right font-mono tabular-nums text-primary">
              {compact(holder.shares)}
            </span>
          </button>
        ))}

        <div
          className={cn(
            "absolute inset-0 flex flex-col bg-background transition-transform duration-500 ease-landing-smooth",
            walletOpen ? "translate-x-0" : "translate-x-full",
          )}
          aria-hidden={!walletOpen}
        >
          <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
            <button
              type="button"
              tabIndex={walletOpen ? 0 : -1}
              onClick={() => setPinned({ market: marketIndex, holder: null })}
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
              aria-label="Back to holders"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="size-5 shrink-0 rounded-full" style={{ background: avatar(shownHolder.addr) }} />
            <div className="min-w-0">
              <p className="truncate font-mono text-[11px] text-primary">{shownHolder.addr}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {wallet.trades} trades this week · active {wallet.lastActive}
              </p>
            </div>
            <span
              className={cn(
                "ml-auto shrink-0 font-mono text-[11px] tabular-nums",
                wallet.pnl >= 0 ? "text-[#0f9f6e]" : "text-[#e5484d]",
              )}
            >
              {wallet.pnl >= 0 ? "+" : "−"}
              {compact(Math.abs(wallet.pnl), "$")} PnL
            </span>
          </div>

          <div key={openCount.current} className="flex min-h-0 flex-1 flex-col">
            <p className="px-3.5 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Positions
            </p>
            {wallet.positions.map((position, i) => (
              <div
                key={position.question}
                className="ds-row-in flex h-[26px] items-center gap-2 px-3.5 text-[11px]"
                style={{ animationDelay: `${200 + i * 90}ms` }}
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[position.category] }}
                />
                <span className="min-w-0 flex-1 truncate text-primary">{position.question}</span>
                <SidePill side={position.side} />
                <span className="w-12 shrink-0 text-right font-mono tabular-nums text-primary">
                  {compact(position.value, "$")}
                </span>
              </div>
            ))}

            <p className="px-3.5 pb-1.5 pt-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Exposure
            </p>
            <div className="mx-3.5 flex h-2 gap-px overflow-hidden rounded-full">
              {wallet.exposure.map((slice, i) => (
                <span
                  key={slice.category}
                  className="ds-grow-x h-full"
                  style={{
                    width: `${slice.share * 100}%`,
                    backgroundColor: CATEGORY_COLORS[slice.category],
                    animationDelay: `${450 + i * 120}ms`,
                  }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 px-3.5 pt-2 text-[10px] text-muted-foreground">
              {wallet.exposure.map((slice) => (
                <span key={slice.category} className="inline-flex items-center gap-1">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[slice.category] }}
                  />
                  {slice.category} {Math.round(slice.share * 100)}%
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DataCardFrame>
  );
}

function SidePill({ side }: { side: Side }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded px-1.5 py-px text-[10px] font-medium",
        side === "Yes" ? "bg-[#10b981]/10 text-[#0f9f6e]" : "bg-[#e5484d]/10 text-[#e5484d]",
      )}
    >
      {side}
    </span>
  );
}
