"use client";

import { ChevronLeft } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { DataCardFrame } from "../data-sources/data-card-frame";
import { useDemoVisibility } from "../data-sources/demo-hooks";
import { mulberry32, usePhases } from "../features/feature-kit";

const MARKET = { question: "ETH above $6,000 in 2026?", yes: 23, supply: 8_760_000 };

const HOLDERS = [
  { addr: "0x9f2c…a41e", shares: 1_840_000 },
  { addr: "0x3b7d…09c2", shares: 1_210_000 },
  { addr: "0x51aa…e7f0", shares: 960_000 },
  { addr: "0xc04e…5d18", shares: 710_000 },
  { addr: "0x7e19…b2a3", shares: 520_000 },
] as const;

const TOP_SHARE = HOLDERS.reduce((sum, h) => sum + h.shares, 0) / MARKET.supply;
const SEGMENT_COLORS = ["#2E5CFF", "#4f7bff", "#7397ff", "#97b3ff", "#bccfff"];

const OTHER_MARKETS = [
  { question: "ETH above $4,000 on Dec 31?", side: "Yes" },
  { question: "BTC above $150k in 2026?", side: "Yes" },
  { question: "SOL ETF approved in 2026?", side: "No" },
  { question: "Fed cuts rates in December?", side: "Yes" },
] as const;

/** Holders list, the concentration across the top five, then the top holder's wallet. */
const PHASE_MS = [3000, 2800, 5200];

const pct = (value: number) => `${Math.round(value * 100)}%`;

function compact(value: number, prefix = "") {
  if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${prefix}${Math.round(value / 1_000)}K`;
  return `${prefix}${value}`;
}

function avatar(addr: string) {
  const hue = (parseInt(addr.slice(2, 6), 16) * 7) % 360;
  return `linear-gradient(135deg, hsl(${hue} 75% 62%), hsl(${(hue + 70) % 360} 70% 48%))`;
}

function walletFor(index: number) {
  const holder = HOLDERS[index];
  const rand = mulberry32(index * 17 + 5);
  const leadValue = Math.round((holder.shares * MARKET.yes) / 100);
  const leadWeight = 0.26 + rand() * 0.14;
  const total = Math.round(leadValue / leadWeight);
  const others = OTHER_MARKETS.slice(0, 3).map((market, i) => ({
    ...market,
    weight: (1 - leadWeight) * [0.34, 0.22, 0.14][i] * (0.9 + rand() * 0.2),
  }));
  return {
    total,
    positionCount: 9 + Math.floor(rand() * 12),
    positions: [{ question: MARKET.question, side: "Yes", weight: leadWeight, lead: true }, ...others.map((o) => ({ ...o, lead: false }))],
    activity: `Bought ${compact(Math.round(holder.shares * (0.08 + rand() * 0.1)))} Yes at ${MARKET.yes - 2}¢ · ${2 + Math.floor(rand() * 5)}d ago`,
  };
}

export function HolderResearchDemo() {
  const { ref, running } = useDemoVisibility();
  const [pinned, setPinned] = useState<number | null>(null);
  const { phase, loop } = usePhases(PHASE_MS, running && pinned === null);
  const walletIndex = pinned ?? (phase === 2 ? 0 : null);

  return (
    <DataCardFrame title="Polymarket holders" frameRef={ref}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium text-primary">{MARKET.question}</p>
          <p className="text-[10px] text-muted-foreground">
            <span className="text-[#0f9f6e]">Yes {MARKET.yes}¢</span> · {compact(MARKET.supply)} Yes shares
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#2E5CFF]/10 px-2 py-0.5 text-[10px] font-medium text-[#2E5CFF]">Holders</span>
      </div>

      {walletIndex === null ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-7 shrink-0 items-center justify-between px-3.5 text-[10px] text-muted-foreground">
            <span>Top Yes holders</span>
            <span>Share of Yes</span>
          </div>
          <ul className="flex flex-col">
            {HOLDERS.map((holder, i) => {
              const share = holder.shares / MARKET.supply;
              return (
                <li key={holder.addr}>
                  <button
                    type="button"
                    onClick={() => setPinned(i)}
                    className={cn(
                      "flex h-7 w-full items-center gap-2 px-3.5 text-left text-[11px] transition-colors hover:bg-muted",
                      phase === 1 && "bg-[#2E5CFF]/[0.05]",
                    )}
                  >
                    <span className="size-4 shrink-0 rounded-full" style={{ background: avatar(holder.addr) }} />
                    <span className="w-[5.5rem] shrink-0 truncate font-mono text-primary">{holder.addr}</span>
                    <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        key={loop}
                        className="ds-grow-x absolute inset-y-0 left-0 rounded-full"
                        style={{ width: `${(share / 0.22) * 100}%`, backgroundColor: SEGMENT_COLORS[i], animationDelay: `${i * 90}ms` }}
                      />
                    </span>
                    <span className="w-14 shrink-0 text-right font-mono tabular-nums text-primary">{compact(holder.shares)}</span>
                    <span className="w-8 shrink-0 text-right font-mono tabular-nums text-muted-foreground">{pct(share)}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className={cn("mt-auto border-t border-border px-3.5 py-2.5 transition-colors", phase === 1 && "bg-muted")}>
            <div className="mb-1.5 flex items-center justify-between text-[10.5px]">
              <span className="text-muted-foreground">Concentration</span>
              <span className="font-medium text-primary">
                Top 5 hold <span className="text-[#2E5CFF]">{pct(TOP_SHARE)}</span> of Yes
              </span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              {HOLDERS.map((holder, i) => (
                <span
                  key={`${holder.addr}-${loop}-${phase >= 1}`}
                  className={cn("h-full", phase >= 1 && "ds-grow-x")}
                  style={{
                    width: `${(holder.shares / MARKET.supply) * 100}%`,
                    backgroundColor: SEGMENT_COLORS[i],
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <WalletPanel key={`${walletIndex}-${loop}`} index={walletIndex} onBack={pinned === null ? undefined : () => setPinned(null)} />
      )}
    </DataCardFrame>
  );
}

function WalletPanel({ index, onBack }: { index: number; onBack?: () => void }) {
  const holder = HOLDERS[index];
  const wallet = walletFor(index);
  const lead = wallet.positions[0];
  return (
    <div className="ds-fade flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3.5 py-1.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to holders"
            className="flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
          >
            <ChevronLeft className="size-3.5" />
          </button>
        ) : null}
        <span className="size-5 shrink-0 rounded-full" style={{ background: avatar(holder.addr) }} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[11px] text-primary">{holder.addr}</p>
          <p className="text-[10px] text-muted-foreground">
            Portfolio {compact(wallet.total, "$")} · {wallet.positionCount} positions
          </p>
        </div>
      </div>

      <div className="flex h-5 shrink-0 items-center justify-between border-y border-border px-3.5 text-[10px] text-muted-foreground">
        <span>Largest positions</span>
        <span>Of portfolio</span>
      </div>
      <ul className="flex flex-col">
        {wallet.positions.map((position, i) => (
          <li
            key={position.question}
            className={cn("ds-row-in flex h-7 items-center gap-2 px-3.5 text-[11px]", position.lead && "bg-[#2E5CFF]/[0.06]")}
            style={{ animationDelay: `${120 + i * 90}ms` }}
          >
            <span className={cn("min-w-0 flex-1 truncate", position.lead ? "font-medium text-primary" : "text-primary")}>
              {position.question}
            </span>
            <span className={cn("shrink-0 text-[10px]", position.side === "Yes" ? "text-[#0f9f6e]" : "text-[#e5484d]")}>
              {position.side}
            </span>
            <span className="relative h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
              <span
                className="ds-grow-x absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${(position.weight / 0.45) * 100}%`,
                  backgroundColor: position.lead ? "#2E5CFF" : "rgba(148,163,184,0.8)",
                  animationDelay: `${300 + i * 90}ms`,
                }}
              />
            </span>
            <span className="w-8 shrink-0 text-right font-mono tabular-nums text-muted-foreground">{pct(position.weight)}</span>
          </li>
        ))}
      </ul>

      <div className="ds-fade mt-auto border-t border-border px-3.5 py-1 text-[10.5px]" style={{ animationDelay: "700ms" }}>
        <p className="text-primary">
          This market is <span className="font-medium text-[#2E5CFF]">{pct(lead.weight)}</span> of the wallet&apos;s portfolio.
        </p>
        <p className="truncate text-muted-foreground">{wallet.activity}</p>
      </div>
    </div>
  );
}
