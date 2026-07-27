"use client";

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
  KALSHI_LIVE_CATEGORY_OTHER,
  KALSHI_LIVE_SERIES_CATEGORY_OPTIONS,
} from "@/lib/kalshiLive/kalshiLiveCategories";
import {
  KALSHI_LIVE_LEADERBOARD_METRIC_OPTIONS,
  KALSHI_LIVE_LEADERBOARD_TIME_PERIOD_OPTIONS,
  normalizeKalshiLiveLeaderboardMetric,
  normalizeKalshiLiveLeaderboardTimePeriod,
} from "@/lib/kalshiLive/leaderboardColumns";
import { cn } from "@/lib/utils";

/**
 * Leaderboard queries: rank order, time period, optional category.
 *
 * @param {{ className?: string; disabled?: boolean }} props
 */
export function KalshiLiveLeaderboardFields({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectKalshiLiveLeaderboardMetricName,
    setConnectKalshiLiveLeaderboardMetricName,
    connectKalshiLiveLeaderboardTimePeriod,
    setConnectKalshiLiveLeaderboardTimePeriod,
    connectKalshiLiveLeaderboardCategory = "",
    setConnectKalshiLiveLeaderboardCategory,
    connectKalshiLiveLeaderboardCategoryOther = "",
    setConnectKalshiLiveLeaderboardCategoryOther,
  } = ctx;

  const metric = normalizeKalshiLiveLeaderboardMetric(connectKalshiLiveLeaderboardMetricName);
  const timePeriod = normalizeKalshiLiveLeaderboardTimePeriod(
    connectKalshiLiveLeaderboardTimePeriod,
  );
  const categoryValue = String(connectKalshiLiveLeaderboardCategory || "").trim();
  const categorySelectValue = categoryValue || "__any__";
  const isOther = categoryValue === KALSHI_LIVE_CATEGORY_OTHER;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <h2 className="text-xs font-semibold tracking-tight text-foreground">Leaderboard</h2>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Social rankings from Kalshi&apos;s public leaderboard. Pick how to rank users, the time
          window, and optionally a market category. Row limit is set under Refine your query
          (max 100).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-muted-foreground">Rank order</Label>
          <Select
            value={metric}
            disabled={disabled}
            onValueChange={(v) => setConnectKalshiLiveLeaderboardMetricName?.(v)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Rank by…" />
            </SelectTrigger>
            <SelectContent>
              {KALSHI_LIVE_LEADERBOARD_METRIC_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Sent as <span className="font-mono text-[10px]">metric_name</span>. PnL / ROI map to
            Kalshi&apos;s <span className="font-mono text-[10px]">projected_pnl</span> /{" "}
            <span className="font-mono text-[10px]">projected_roi</span>.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-muted-foreground">Time period</Label>
          <Select
            value={timePeriod}
            disabled={disabled}
            onValueChange={(v) => setConnectKalshiLiveLeaderboardTimePeriod?.(v)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              {KALSHI_LIVE_LEADERBOARD_TIME_PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium text-muted-foreground">
          Category <span className="font-normal">(optional)</span>
        </Label>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Same category list used elsewhere in Kalshi Live (e.g. Series discovery).
        </p>
        <Select
          value={categorySelectValue}
          disabled={disabled}
          onValueChange={(v) => {
            if (v === "__any__") {
              setConnectKalshiLiveLeaderboardCategory?.("");
              setConnectKalshiLiveLeaderboardCategoryOther?.("");
              return;
            }
            setConnectKalshiLiveLeaderboardCategory?.(v);
            if (v !== KALSHI_LIVE_CATEGORY_OTHER) {
              setConnectKalshiLiveLeaderboardCategoryOther?.("");
            }
          }}
        >
          <SelectTrigger className="h-9 max-w-md text-xs">
            <SelectValue placeholder="Any category" />
          </SelectTrigger>
          <SelectContent className="max-h-[min(20rem,50vh)]">
            <SelectItem value="__any__" className="text-xs">
              Any category
            </SelectItem>
            {KALSHI_LIVE_SERIES_CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
            <SelectItem value={KALSHI_LIVE_CATEGORY_OTHER} className="text-xs font-medium">
              Other…
            </SelectItem>
          </SelectContent>
        </Select>
        {isOther ? (
          <Input
            className="mt-1.5 h-9 max-w-md text-xs"
            disabled={disabled}
            placeholder="Custom category text"
            value={connectKalshiLiveLeaderboardCategoryOther}
            onChange={(e) => setConnectKalshiLiveLeaderboardCategoryOther?.(e.target.value)}
          />
        ) : null}
      </div>
    </div>
  );
}
