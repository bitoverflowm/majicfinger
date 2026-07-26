"use client";

import { useMemo } from "react";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  KALSHI_LIVE_EVENTS_ROW_MODE_NESTED,
  KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET,
  normalizeKalshiLiveEventsRowMode,
} from "@/lib/kalshiLive/eventCompose";
import { cn } from "@/lib/utils";

/**
 * Multivariate events exploration filters (GET /events/multivariate).
 * Series ticker (semantic search) and collection ticker (manual) are mutually exclusive.
 *
 * @param {{ className?: string; disabled?: boolean }} props
 */
export function KalshiLiveMultivariateEventsFields({ className, disabled }) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectKalshiLiveMultivariateEventsSeriesTicker = "",
    setConnectKalshiLiveMultivariateEventsSeriesTicker,
    connectKalshiLiveMultivariateEventsCollectionTicker = "",
    setConnectKalshiLiveMultivariateEventsCollectionTicker,
    connectKalshiLiveMultivariateEventsIncludeMarkets = false,
    setConnectKalshiLiveMultivariateEventsIncludeMarkets,
    connectKalshiLiveMultivariateEventsRowMode = KALSHI_LIVE_EVENTS_ROW_MODE_NESTED,
    setConnectKalshiLiveMultivariateEventsRowMode,
    connectKalshiLiveEndpointId,
    setConnectKalshiLiveColumnSelections,
  } = ctx;

  const seriesTicker = String(connectKalshiLiveMultivariateEventsSeriesTicker || "");
  const collectionTicker = String(connectKalshiLiveMultivariateEventsCollectionTicker || "");
  const hasSeries = !!seriesTicker.trim();
  const hasCollection = !!collectionTicker.trim();
  const rowMode = normalizeKalshiLiveEventsRowMode(connectKalshiLiveMultivariateEventsRowMode);

  const clearColumns = () => {
    if (connectKalshiLiveEndpointId !== "multivariate_events") return;
    setConnectKalshiLiveColumnSelections?.((prev) => ({
      ...(prev || {}),
      multivariate_events: [],
    }));
  };

  const seriesDisabled = !!disabled || hasCollection;
  const collectionDisabled = !!disabled || hasSeries;

  const seriesHint = useMemo(
    () =>
      hasCollection
        ? "Clear Collection Ticker to filter by series instead."
        : "Filter multivariate events belonging to a series. Use semantic search or type a known ticker.",
    [hasCollection],
  );

  const collectionHint = useMemo(
    () =>
      hasSeries
        ? "Clear Series Ticker to filter by collection instead."
        : "Filter by a multivariate event collection ticker you already know. Cannot be combined with Series Ticker.",
    [hasSeries],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="text-xs font-semibold tracking-tight text-foreground">
        Discover multivariate events
      </h2>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Browse Kalshi combo (multivariate) events with optional series or collection filters.
        Matching pages are pulled into one sheet (capped at 20,000 rows).
      </p>

      <div className="space-y-4 rounded-lg bg-muted/10 p-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            className={cn(
              "flex flex-col space-y-1.5",
              seriesDisabled && hasCollection && "opacity-60",
            )}
          >
            <Label className="text-[11px] font-medium text-foreground">Series Ticker</Label>
            <p className="text-[10px] leading-snug text-muted-foreground">{seriesHint}</p>
            <MarketTickerSearch
              value={seriesTicker}
              onChange={(v) => {
                setConnectKalshiLiveMultivariateEventsSeriesTicker?.(v);
                if (String(v || "").trim()) {
                  setConnectKalshiLiveMultivariateEventsCollectionTicker?.("");
                }
              }}
              disabled={seriesDisabled}
              dataSource="live"
              searchScope="series"
              showCutoffNotes={false}
              maxTickers={1}
              required={false}
            />
          </div>

          <div
            className={cn(
              "flex flex-col space-y-1.5",
              collectionDisabled && hasSeries && "opacity-60",
            )}
          >
            <Label
              htmlFor="mve-collection-ticker"
              className="text-[11px] font-medium text-foreground"
            >
              Collection Ticker
            </Label>
            <p className="text-[10px] leading-snug text-muted-foreground">{collectionHint}</p>
            <Input
              id="mve-collection-ticker"
              value={collectionTicker}
              disabled={collectionDisabled}
              placeholder="e.g. KXSOMETHING-COLLECTION"
              className="h-8 text-[11px]"
              onChange={(e) => {
                const next = e.target.value;
                setConnectKalshiLiveMultivariateEventsCollectionTicker?.(next);
                if (String(next || "").trim()) {
                  setConnectKalshiLiveMultivariateEventsSeriesTicker?.("");
                }
              }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Checkbox
              id="mve-include-markets"
              checked={!!connectKalshiLiveMultivariateEventsIncludeMarkets}
              disabled={disabled}
              onCheckedChange={(checked) => {
                setConnectKalshiLiveMultivariateEventsIncludeMarkets?.(!!checked);
                clearColumns();
              }}
            />
            <div className="min-w-0 space-y-0.5">
              <Label
                htmlFor="mve-include-markets"
                className="text-[11px] font-medium leading-snug text-foreground"
              >
                Include all markets in event
              </Label>
              <p className="text-[10px] leading-snug text-muted-foreground">
                Requests nested markets for each event (`with_nested_markets=true`).
              </p>
            </div>
          </div>

          {connectKalshiLiveMultivariateEventsIncludeMarkets ? (
            <div className="space-y-1.5 pl-6">
              <Label className="text-[11px] font-medium text-muted-foreground">
                How should rows look?
              </Label>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={rowMode}
                onValueChange={(v) => {
                  if (!v) return;
                  setConnectKalshiLiveMultivariateEventsRowMode?.(
                    normalizeKalshiLiveEventsRowMode(v),
                  );
                  clearColumns();
                }}
                className="h-auto flex-wrap justify-start gap-1"
                aria-label="Multivariate event market row layout"
              >
                <ToggleGroupItem
                  value={KALSHI_LIVE_EVENTS_ROW_MODE_NESTED}
                  className="h-auto min-h-8 whitespace-normal px-2.5 py-1.5 text-left text-[11px]"
                >
                  1 row per event with markets nested in the row
                </ToggleGroupItem>
                <ToggleGroupItem
                  value={KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET}
                  className="h-auto min-h-8 whitespace-normal px-2.5 py-1.5 text-left text-[11px]"
                >
                  1 row per market
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="text-[10px] leading-snug text-muted-foreground">
                Nested keeps one event row (markets as JSON). Per-market expands each market into
                its own row and replicates event fields — column picker shows market fields only.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
