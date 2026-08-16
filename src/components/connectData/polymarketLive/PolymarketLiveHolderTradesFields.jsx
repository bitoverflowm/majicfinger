"use client";

import { useCallback, useEffect, useMemo } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  emptyPolymarketHolderTradesComposeState,
  normalizePolymarketHolderTradesComposeState,
} from "@/lib/polymarketLive/holderTradesCompose";
import { cn } from "@/lib/utils";

export function PolymarketLiveHolderTradesFields({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const raw = ctx.providerValue?.connectPolymarketLiveHolderTradesCompose;
  const setCompose = ctx.providerValue?.setConnectPolymarketLiveHolderTradesCompose;
  const state = useMemo(
    () =>
      normalizePolymarketHolderTradesComposeState(
        raw || emptyPolymarketHolderTradesComposeState(),
      ),
    [raw],
  );

  useEffect(() => {
    if (raw == null) setCompose?.(emptyPolymarketHolderTradesComposeState());
  }, [raw, setCompose]);

  const patch = useCallback(
    (partial) =>
      setCompose?.((previous) =>
        normalizePolymarketHolderTradesComposeState({
          ...(previous || emptyPolymarketHolderTradesComposeState()),
          ...partial,
        }),
      ),
    [setCompose],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1.5">
        <Label htmlFor="polymarket-holder-trades-addresses" className="text-[11px] text-foreground">
          Holder address or addresses
        </Label>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Enter wallet addresses separated by commas, spaces, or new lines.
        </p>
        <Textarea
          id="polymarket-holder-trades-addresses"
          className="min-h-20 font-mono text-xs"
          disabled={disabled}
          placeholder={"0x56687bf447db6ffa42ffe2204a05edaa20f55839\n0x…"}
          value={state.addresses}
          onChange={(event) => patch({ addresses: event.target.value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-holder-trades-markets" className="text-[11px] text-foreground">
            Condition IDs
          </Label>
          <Input
            id="polymarket-holder-trades-markets"
            className="h-8 font-mono text-xs"
            disabled={disabled || Boolean(state.eventId.trim())}
            placeholder="Optional, comma-separated"
            value={state.market}
            onChange={(event) => patch({ market: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-holder-trades-events" className="text-[11px] text-foreground">
            Event IDs
          </Label>
          <Input
            id="polymarket-holder-trades-events"
            className="h-8 text-xs"
            disabled={disabled || Boolean(state.market.trim())}
            placeholder="Optional, comma-separated"
            value={state.eventId}
            onChange={(event) => patch({ eventId: event.target.value })}
          />
        </div>
      </div>
      <p className="-mt-2 text-[10px] leading-snug text-muted-foreground">
        Use condition IDs or event IDs, not both.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-holder-trades-side" className="text-[11px] text-foreground">
            Side
          </Label>
          <select
            id="polymarket-holder-trades-side"
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
            disabled={disabled}
            value={state.side}
            onChange={(event) => patch({ side: event.target.value })}
          >
            <option value="">Any side</option>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-holder-trades-filter" className="text-[11px] text-foreground">
            Minimum filter type
          </Label>
          <select
            id="polymarket-holder-trades-filter"
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
            disabled={disabled}
            value={state.filterType}
            onChange={(event) =>
              patch({
                filterType: event.target.value,
                filterAmount: event.target.value ? state.filterAmount : "",
              })
            }
          >
            <option value="">No minimum</option>
            <option value="CASH">Cash</option>
            <option value="TOKENS">Tokens</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-holder-trades-amount" className="text-[11px] text-foreground">
            Minimum amount
          </Label>
          <Input
            id="polymarket-holder-trades-amount"
            type="number"
            min={0}
            className="h-8 text-xs"
            disabled={disabled || !state.filterType}
            placeholder="Required with filter"
            value={state.filterAmount}
            onChange={(event) => patch({ filterAmount: event.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-holder-trades-start" className="text-[11px] text-foreground">
            Start timestamp
          </Label>
          <Input
            id="polymarket-holder-trades-start"
            type="number"
            min={0}
            className="h-8 text-xs"
            disabled={disabled}
            placeholder="Optional epoch seconds"
            value={state.start}
            onChange={(event) => patch({ start: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-holder-trades-end" className="text-[11px] text-foreground">
            End timestamp
          </Label>
          <Input
            id="polymarket-holder-trades-end"
            type="number"
            min={0}
            className="h-8 text-xs"
            disabled={disabled}
            placeholder="Optional epoch seconds"
            value={state.end}
            onChange={(event) => patch({ end: event.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-holder-trades-limit" className="text-[11px] text-foreground">
            Limit per holder
          </Label>
          <Input
            id="polymarket-holder-trades-limit"
            type="number"
            min={0}
            max={10000}
            className="h-8 text-xs"
            disabled={disabled}
            value={state.limit}
            onChange={(event) => patch({ limit: event.target.value })}
          />
        </div>
        <label className="flex items-end gap-2 pb-2 text-[11px] text-foreground">
          <Checkbox
            disabled={disabled}
            checked={state.takerOnly}
            onCheckedChange={(checked) => patch({ takerOnly: checked === true })}
          />
          Taker trades only
        </label>
      </div>
    </div>
  );
}
