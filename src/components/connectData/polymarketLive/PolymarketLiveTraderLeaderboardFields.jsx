"use client";

import { useCallback, useEffect, useMemo } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  emptyPolymarketTraderLeaderboardComposeState,
  normalizePolymarketTraderLeaderboardComposeState,
  polymarketLeaderboardCategoryOptions,
  POLYMARKET_TRADER_LEADERBOARD_ORDER_OPTIONS,
  POLYMARKET_TRADER_LEADERBOARD_TIME_PERIOD_OPTIONS,
} from "@/lib/polymarketLive/traderLeaderboardCompose";
import { cn } from "@/lib/utils";

const PERIOD_LABELS = { day: "Day", week: "Week", month: "Month", all: "All" };
const SORT_LABELS = { PNL: "PnL", VOLUME: "Volume" };

export function PolymarketLiveTraderLeaderboardFields({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const raw = ctx.providerValue?.connectPolymarketLiveTraderLeaderboardCompose;
  const setCompose = ctx.providerValue?.setConnectPolymarketLiveTraderLeaderboardCompose;
  const state = useMemo(
    () =>
      normalizePolymarketTraderLeaderboardComposeState(
        raw || emptyPolymarketTraderLeaderboardComposeState(),
      ),
    [raw],
  );

  useEffect(() => {
    if (raw == null) setCompose?.(emptyPolymarketTraderLeaderboardComposeState());
  }, [raw, setCompose]);

  const patch = useCallback(
    (partial) =>
      setCompose?.((previous) =>
        normalizePolymarketTraderLeaderboardComposeState({
          ...(previous || emptyPolymarketTraderLeaderboardComposeState()),
          ...partial,
        }),
      ),
    [setCompose],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-[10px] leading-snug text-muted-foreground">
        Rank Polymarket traders by profit and loss or volume, filtered by market category and time
        period.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Category"
          value={state.category}
          options={polymarketLeaderboardCategoryOptions()}
          disabled={disabled}
          onValueChange={(value) => patch({ category: value })}
        />
        <SelectField
          label="Time period"
          value={state.time_period}
          options={POLYMARKET_TRADER_LEADERBOARD_TIME_PERIOD_OPTIONS.map((value) => [value, PERIOD_LABELS[value] || value])}
          disabled={disabled}
          onValueChange={(value) => patch({ time_period: value })}
        />
        <SelectField
          label="Sort by"
          value={state.sort_by}
          options={POLYMARKET_TRADER_LEADERBOARD_ORDER_OPTIONS.map((value) => [value, SORT_LABELS[value] || value])}
          disabled={disabled}
          onValueChange={(value) => patch({ sort_by: value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InputField
          id="polymarket-leaderboard-limit"
          label="Limit"
          type="number"
          min={1}
          max={1000}
          value={state.limit}
          disabled={disabled}
          onChange={(value) => patch({ limit: value })}
        />
        <InputField
          id="polymarket-leaderboard-user"
          label="User wallet (optional)"
          className="font-mono"
          placeholder="0x…"
          value={state.user}
          disabled={disabled}
          onChange={(value) => patch({ user: value })}
        />
      </div>
    </div>
  );
}

function SelectField({ label, value, options, disabled, onValueChange }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-foreground">{label}</Label>
      <Select value={value} disabled={disabled} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([option, optionLabel]) => (
            <SelectItem key={option} value={option} className="text-xs">
              {optionLabel || option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function InputField({ id, label, className, value, onChange, ...props }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] text-foreground">
        {label}
      </Label>
      <Input
        id={id}
        className={cn("h-8 text-xs", className)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </div>
  );
}
