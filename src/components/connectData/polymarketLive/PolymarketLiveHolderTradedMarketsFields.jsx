"use client";

import { useCallback, useEffect, useMemo } from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  emptyPolymarketHolderTradedMarketsComposeState,
  normalizePolymarketHolderTradedMarketsComposeState,
} from "@/lib/polymarketLive/holderTradedMarketsCompose";
import { cn } from "@/lib/utils";

export function PolymarketLiveHolderTradedMarketsFields({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const raw = ctx.providerValue?.connectPolymarketLiveHolderTradedMarketsCompose;
  const setCompose = ctx.providerValue?.setConnectPolymarketLiveHolderTradedMarketsCompose;
  const state = useMemo(
    () =>
      normalizePolymarketHolderTradedMarketsComposeState(
        raw || emptyPolymarketHolderTradedMarketsComposeState(),
      ),
    [raw],
  );

  useEffect(() => {
    if (raw == null) setCompose?.(emptyPolymarketHolderTradedMarketsComposeState());
  }, [raw, setCompose]);

  const patch = useCallback(
    (partial) =>
      setCompose?.((previous) =>
        normalizePolymarketHolderTradedMarketsComposeState({
          ...(previous || emptyPolymarketHolderTradedMarketsComposeState()),
          ...partial,
        }),
      ),
    [setCompose],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1.5">
        <Label htmlFor="polymarket-traded-markets-addresses" className="text-[11px] text-foreground">
          User address or addresses
        </Label>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Enter holder wallet addresses separated by commas, spaces, or new lines. Each address
          returns the total number of markets that holder has traded.
        </p>
        <Textarea
          id="polymarket-traded-markets-addresses"
          className="min-h-20 font-mono text-xs"
          disabled={disabled}
          placeholder={"0x56687bf447db6ffa42ffe2204a05edaa20f55839\n0x…"}
          value={state.addresses}
          onChange={(event) => patch({ addresses: event.target.value })}
        />
      </div>
    </div>
  );
}
