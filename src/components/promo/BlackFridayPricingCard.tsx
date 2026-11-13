"use client";

import { ArrowDown } from "lucide-react";
import { BLACK_FRIDAY } from "@/lib/promo/blackFriday";
import { CountdownTiles } from "./CountdownTiles";
import { BLACK_FRIDAY_ANCHOR, useBlackFridayCountdown } from "./useBlackFriday";

export function BlackFridayPricingCard({ onSeePlans }: { onSeePlans: () => void }) {
  const countdown = useBlackFridayCountdown();

  return (
    <div
      id={BLACK_FRIDAY_ANCHOR}
      className="relative scroll-mt-28 overflow-hidden rounded-2xl border border-secondary/25 bg-gradient-to-br from-secondary/[0.07] via-background to-violet-500/[0.06] p-5 shadow-[0_16px_40px_-22px_rgba(47,111,237,0.45)] sm:p-6 dark:from-secondary/[0.16] dark:to-violet-500/[0.1]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.18),transparent_65%)]"
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="flex min-w-0 flex-col gap-2.5">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-secondary/25 bg-secondary/10 px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-secondary">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            {BLACK_FRIDAY.name}
          </span>
          <h3 className="text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {BLACK_FRIDAY.percentOff}% off every annual plan
          </h3>
          <p className="text-sm leading-5 text-muted-foreground">
            Already applied to the annual plans below. No code needed. Jarvis is included — 3 months of free usage at
            launch.
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-3">
            {countdown ? (
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">Ends in</span>
                <CountdownTiles countdown={countdown} />
              </div>
            ) : null}
            <button
              type="button"
              onClick={onSeePlans}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-[13px] font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
            >
              See plans
              <ArrowDown className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>

        <div
          aria-hidden
          className="relative hidden size-[108px] shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-violet-500 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_14px_30px_-12px_rgba(47,111,237,0.65)] sm:flex"
        >
          <span className="text-[34px] font-semibold leading-none tracking-tight">{BLACK_FRIDAY.percentOff}%</span>
          <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white/85">off</span>
        </div>
      </div>
      <p className="relative mt-4 border-t border-border/70 pt-3 text-xs text-muted-foreground">
        {BLACK_FRIDAY.percentOff}% off your first year, then your plan renews at the regular annual price. Cancel anytime.
        Jarvis comes with the sale: 3 months of free Jarvis usage when it launches.
      </p>
    </div>
  );
}
