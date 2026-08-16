"use client";

import { useCallback, useEffect, useMemo } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  emptyPolymarketUserActivityComposeState,
  normalizePolymarketUserActivityComposeState,
  POLYMARKET_USER_ACTIVITY_TYPES,
} from "@/lib/polymarketLive/userActivityCompose";
import { cn } from "@/lib/utils";

export function PolymarketLiveUserActivityFields({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const raw = ctx.providerValue?.connectPolymarketLiveUserActivityCompose;
  const setCompose = ctx.providerValue?.setConnectPolymarketLiveUserActivityCompose;
  const state = useMemo(
    () =>
      normalizePolymarketUserActivityComposeState(
        raw || emptyPolymarketUserActivityComposeState(),
      ),
    [raw],
  );

  useEffect(() => {
    if (raw == null) setCompose?.(emptyPolymarketUserActivityComposeState());
  }, [raw, setCompose]);

  const patch = useCallback(
    (partial) =>
      setCompose?.((previous) =>
        normalizePolymarketUserActivityComposeState({
          ...(previous || emptyPolymarketUserActivityComposeState()),
          ...partial,
        }),
      ),
    [setCompose],
  );

  const toggleType = useCallback(
    (type, checked) =>
      patch({
        types: checked
          ? [...new Set([...state.types, type])]
          : state.types.filter((value) => value !== type),
      }),
    [patch, state.types],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1.5">
        <Label htmlFor="polymarket-activity-addresses" className="text-[11px] text-foreground">
          User address or addresses
        </Label>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Enter wallet addresses separated by commas, spaces, or new lines.
        </p>
        <Textarea
          id="polymarket-activity-addresses"
          className="min-h-20 font-mono text-xs"
          disabled={disabled}
          placeholder={"0x56687bf447db6ffa42ffe2204a05edaa20f55839\n0x…"}
          value={state.addresses}
          onChange={(event) => patch({ addresses: event.target.value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-activity-markets" className="text-[11px] text-foreground">
            Condition IDs
          </Label>
          <Input
            id="polymarket-activity-markets"
            className="h-8 font-mono text-xs"
            disabled={disabled || Boolean(state.eventId.trim())}
            placeholder="Optional, comma-separated"
            value={state.market}
            onChange={(event) => patch({ market: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-activity-events" className="text-[11px] text-foreground">
            Event IDs
          </Label>
          <Input
            id="polymarket-activity-events"
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

      <div className="space-y-2">
        <Label className="text-[11px] text-foreground">Activity types</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {POLYMARKET_USER_ACTIVITY_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 text-[10px] text-foreground">
              <Checkbox
                disabled={disabled}
                checked={state.types.includes(type)}
                onCheckedChange={(checked) => toggleType(type, checked === true)}
              />
              {type.replaceAll("_", " ")}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[10px] text-foreground">
          <Checkbox
            disabled={disabled}
            checked={state.excludeDepositsWithdrawals}
            onCheckedChange={(checked) => patch({ excludeDepositsWithdrawals: checked === true })}
          />
          Exclude deposits and withdrawals
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-activity-start" className="text-[11px] text-foreground">
            Start timestamp
          </Label>
          <Input
            id="polymarket-activity-start"
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
          <Label htmlFor="polymarket-activity-end" className="text-[11px] text-foreground">
            End timestamp
          </Label>
          <Input
            id="polymarket-activity-end"
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
          <Label htmlFor="polymarket-activity-limit" className="text-[11px] text-foreground">
            Limit per user
          </Label>
          <Input
            id="polymarket-activity-limit"
            type="number"
            min={0}
            max={500}
            className="h-8 text-xs"
            disabled={disabled}
            value={state.limit}
            onChange={(event) => patch({ limit: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-activity-side" className="text-[11px] text-foreground">
            Trade side
          </Label>
          <select
            id="polymarket-activity-side"
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
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-activity-sort" className="text-[11px] text-foreground">
            Sort by
          </Label>
          <select
            id="polymarket-activity-sort"
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
            disabled={disabled}
            value={state.sortBy}
            onChange={(event) => patch({ sortBy: event.target.value })}
          >
            <option value="TIMESTAMP">Timestamp</option>
            <option value="TOKENS">Tokens</option>
            <option value="CASH">Cash</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-activity-direction" className="text-[11px] text-foreground">
            Direction
          </Label>
          <select
            id="polymarket-activity-direction"
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
            disabled={disabled}
            value={state.sortDirection}
            onChange={(event) => patch({ sortDirection: event.target.value })}
          >
            <option value="DESC">Descending</option>
            <option value="ASC">Ascending</option>
          </select>
        </div>
      </div>
    </div>
  );
}
