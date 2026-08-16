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
  POLYMARKET_TRADER_LEADERBOARD_CATEGORY_OPTIONS,
  POLYMARKET_TRADER_LEADERBOARD_ORDER_OPTIONS,
  POLYMARKET_TRADER_LEADERBOARD_TIME_PERIOD_OPTIONS,
} from "@/lib/polymarketLive/traderLeaderboardCompose";
import { cn } from "@/lib/utils";

const LABELS = {
  OVERALL: "Overall",
  POLITICS: "Politics",
  SPORTS: "Sports",
  ESPORTS: "Esports",
  CRYPTO: "Crypto",
  CULTURE: "Culture",
  MENTIONS: "Mentions",
  WEATHER: "Weather",
  ECONOMICS: "Economics",
  TECH: "Tech",
  FINANCE: "Finance",
  DAY: "Daily",
  WEEK: "Weekly",
  MONTH: "Monthly",
  ALL: "All time",
  PNL: "Profit and loss",
  VOL: "Volume",
};

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
          options={POLYMARKET_TRADER_LEADERBOARD_CATEGORY_OPTIONS}
          disabled={disabled}
          onValueChange={(value) => patch({ category: value })}
        />
        <SelectField
          label="Time period"
          value={state.timePeriod}
          options={POLYMARKET_TRADER_LEADERBOARD_TIME_PERIOD_OPTIONS}
          disabled={disabled}
          onValueChange={(value) => patch({ timePeriod: value })}
        />
        <SelectField
          label="Rank by"
          value={state.orderBy}
          options={POLYMARKET_TRADER_LEADERBOARD_ORDER_OPTIONS}
          disabled={disabled}
          onValueChange={(value) => patch({ orderBy: value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InputField
          id="polymarket-leaderboard-limit"
          label="Limit"
          type="number"
          min={1}
          max={50}
          value={state.limit}
          disabled={disabled}
          onChange={(value) => patch({ limit: value })}
        />
        <InputField
          id="polymarket-leaderboard-offset"
          label="Offset"
          type="number"
          min={0}
          max={1000}
          value={state.offset}
          disabled={disabled}
          onChange={(value) => patch({ offset: value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InputField
          id="polymarket-leaderboard-user"
          label="User wallet (optional)"
          className="font-mono"
          placeholder="0x…"
          value={state.user}
          disabled={disabled}
          onChange={(value) => patch({ user: value })}
        />
        <InputField
          id="polymarket-leaderboard-username"
          label="Username (optional)"
          placeholder="Trader username"
          value={state.userName}
          disabled={disabled}
          onChange={(value) => patch({ userName: value })}
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
          {options.map((option) => (
            <SelectItem key={option} value={option} className="text-xs">
              {LABELS[option] || option}
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
