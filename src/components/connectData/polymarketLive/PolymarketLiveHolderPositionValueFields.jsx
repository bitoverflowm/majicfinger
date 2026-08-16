"use client";

import { useCallback, useEffect, useMemo } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  emptyPolymarketHolderPositionValueComposeState,
  normalizePolymarketHolderPositionValueComposeState,
} from "@/lib/polymarketLive/holderPositionValueCompose";
import { cn } from "@/lib/utils";

export function PolymarketLiveHolderPositionValueFields({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const raw = ctx.providerValue?.connectPolymarketLiveHolderPositionValueCompose;
  const setCompose = ctx.providerValue?.setConnectPolymarketLiveHolderPositionValueCompose;
  const state = useMemo(
    () =>
      normalizePolymarketHolderPositionValueComposeState(
        raw || emptyPolymarketHolderPositionValueComposeState(),
      ),
    [raw],
  );

  useEffect(() => {
    if (raw == null) setCompose?.(emptyPolymarketHolderPositionValueComposeState());
  }, [raw, setCompose]);

  const patch = useCallback(
    (partial) =>
      setCompose?.((previous) =>
        normalizePolymarketHolderPositionValueComposeState({
          ...(previous || emptyPolymarketHolderPositionValueComposeState()),
          ...partial,
        }),
      ),
    [setCompose],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1.5">
        <Label htmlFor="polymarket-position-value-addresses" className="text-[11px] text-foreground">
          User address or addresses
        </Label>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Enter holder wallet addresses separated by commas, spaces, or new lines.
        </p>
        <Textarea
          id="polymarket-position-value-addresses"
          className="min-h-20 font-mono text-xs"
          disabled={disabled}
          placeholder={"0x56687bf447db6ffa42ffe2204a05edaa20f55839\n0x…"}
          value={state.addresses}
          onChange={(event) => patch({ addresses: event.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="polymarket-position-value-markets" className="text-[11px] text-foreground">
          Condition IDs
        </Label>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Optional comma-separated markets. Leave blank for the holder&apos;s total across all positions.
        </p>
        <Input
          id="polymarket-position-value-markets"
          className="h-8 font-mono text-xs"
          disabled={disabled}
          placeholder="Optional, comma-separated"
          value={state.market}
          onChange={(event) => patch({ market: event.target.value })}
        />
      </div>
    </div>
  );
}
