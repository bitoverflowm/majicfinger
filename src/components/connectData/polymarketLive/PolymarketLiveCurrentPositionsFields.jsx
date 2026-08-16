"use client";

import { useCallback, useEffect, useMemo } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  emptyPolymarketCurrentPositionsComposeState,
  normalizePolymarketCurrentPositionsComposeState,
  POLYMARKET_CURRENT_POSITIONS_SORT_OPTIONS,
} from "@/lib/polymarketLive/currentPositionsCompose";
import { cn } from "@/lib/utils";

export function PolymarketLiveCurrentPositionsFields({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const raw = ctx.providerValue?.connectPolymarketLiveCurrentPositionsCompose;
  const setCompose = ctx.providerValue?.setConnectPolymarketLiveCurrentPositionsCompose;
  const state = useMemo(
    () =>
      normalizePolymarketCurrentPositionsComposeState(
        raw || emptyPolymarketCurrentPositionsComposeState(),
      ),
    [raw],
  );

  useEffect(() => {
    if (raw == null) setCompose?.(emptyPolymarketCurrentPositionsComposeState());
  }, [raw, setCompose]);

  const patch = useCallback(
    (partial) =>
      setCompose?.((previous) =>
        normalizePolymarketCurrentPositionsComposeState({
          ...(previous || emptyPolymarketCurrentPositionsComposeState()),
          ...partial,
        }),
      ),
    [setCompose],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1.5">
        <Label htmlFor="polymarket-position-addresses" className="text-[11px] text-foreground">
          User address or addresses
        </Label>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Enter holder wallet addresses separated by commas, spaces, or new lines.
        </p>
        <Textarea
          id="polymarket-position-addresses"
          className="min-h-20 font-mono text-xs"
          disabled={disabled}
          placeholder={"0x56687bf447db6ffa42ffe2204a05edaa20f55839\n0x…"}
          value={state.addresses}
          onChange={(event) => patch({ addresses: event.target.value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-position-markets" className="text-[11px] text-foreground">
            Condition IDs
          </Label>
          <Input
            id="polymarket-position-markets"
            className="h-8 font-mono text-xs"
            disabled={disabled || Boolean(state.eventId.trim())}
            placeholder="Optional, comma-separated"
            value={state.market}
            onChange={(event) => patch({ market: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-position-events" className="text-[11px] text-foreground">
            Event IDs
          </Label>
          <Input
            id="polymarket-position-events"
            className="h-8 text-xs"
            disabled={disabled || Boolean(state.market.trim())}
            placeholder="Optional, comma-separated"
            value={state.eventId}
            onChange={(event) => patch({ eventId: event.target.value })}
          />
        </div>
      </div>
      <p className="-mt-2 text-[10px] leading-snug text-muted-foreground">
        Use condition IDs or event IDs. Polymarket does not allow both in one request.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-position-size" className="text-[11px] text-foreground">
            Size threshold
          </Label>
          <Input
            id="polymarket-position-size"
            type="number"
            min={0}
            className="h-8 text-xs"
            disabled={disabled}
            value={state.sizeThreshold}
            onChange={(event) => patch({ sizeThreshold: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-position-limit" className="text-[11px] text-foreground">
            Limit per holder
          </Label>
          <Input
            id="polymarket-position-limit"
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
          <Label htmlFor="polymarket-position-title" className="text-[11px] text-foreground">
            Market title contains
          </Label>
          <Input
            id="polymarket-position-title"
            className="h-8 text-xs"
            disabled={disabled}
            maxLength={100}
            placeholder="Optional"
            value={state.title}
            onChange={(event) => patch({ title: event.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-position-sort" className="text-[11px] text-foreground">
            Sort by
          </Label>
          <select
            id="polymarket-position-sort"
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
            disabled={disabled}
            value={state.sortBy}
            onChange={(event) => patch({ sortBy: event.target.value })}
          >
            {POLYMARKET_CURRENT_POSITIONS_SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="polymarket-position-direction" className="text-[11px] text-foreground">
            Direction
          </Label>
          <select
            id="polymarket-position-direction"
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

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {[
          ["redeemable", "Redeemable only"],
          ["mergeable", "Mergeable only"],
          ["includeArchived", "Include archived"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-[11px] text-foreground">
            <Checkbox
              disabled={disabled}
              checked={state[key]}
              onCheckedChange={(checked) => patch({ [key]: checked === true })}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
