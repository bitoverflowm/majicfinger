"use client";

import { useEffect, useMemo } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  emptyPolymarketSamplingMarketsComposeState,
  normalizePolymarketSamplingMarketsComposeState,
  POLYMARKET_SAMPLING_MARKETS_LIMIT_MAX,
} from "@/lib/polymarketLive/samplingMarketsCompose";
import { cn } from "@/lib/utils";

/**
 * @param {{ className?: string; disabled?: boolean }} props
 */
export function PolymarketLiveSamplingMarketsFields({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const raw = ctx.connectPolymarketLiveSamplingMarketsCompose;
  const setCompose = ctx.setConnectPolymarketLiveSamplingMarketsCompose;
  const state = useMemo(
    () =>
      normalizePolymarketSamplingMarketsComposeState(
        raw || emptyPolymarketSamplingMarketsComposeState(),
      ),
    [raw],
  );

  useEffect(() => {
    if (raw == null) setCompose?.(emptyPolymarketSamplingMarketsComposeState());
  }, [raw, setCompose]);

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-[11px] leading-snug text-muted-foreground dark:text-slate-400">
        Feed of currently open and tradable markets. Lychee follows every pagination cursor and
        fills the sheet as each page arrives.
      </p>
      <div className="space-y-1.5">
        <Label className="text-[11px] text-foreground">Market limit</Label>
        <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
          How many currently tradable markets do you want to pull? (max{" "}
          {POLYMARKET_SAMPLING_MARKETS_LIMIT_MAX.toLocaleString()})
        </p>
        <Input
          type="number"
          min={1}
          max={POLYMARKET_SAMPLING_MARKETS_LIMIT_MAX}
          className="h-8 text-xs"
          disabled={disabled}
          value={state.limit}
          onChange={(e) =>
            setCompose?.(
              normalizePolymarketSamplingMarketsComposeState({
                ...state,
                limit: Number(e.target.value),
              }),
            )
          }
        />
      </div>
    </div>
  );
}
