"use client";

import { useMemo } from "react";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { KalshiLiveEventsDiscoveryFields } from "@/components/connectData/kalshiLive/KalshiLiveEventsDiscoveryFields";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  KALSHI_LIVE_EVENTS_ROW_MODE_NESTED,
  KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET,
  normalizeKalshiLiveEventsRowMode,
} from "@/lib/kalshiLive/eventCompose";
import { emptyKalshiLiveEventsDiscoveryParams } from "@/lib/kalshiLive/eventDiscovery";
import { cn } from "@/lib/utils";

/**
 * Events ticker entry with optional discovery mode (GET /events list filters).
 * No semantic search for event tickers — type tickers directly.
 *
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   className?: string;
 *   disabled?: boolean;
 * }} props
 */
export function KalshiLiveEventsTickersField({ value, onChange, className, disabled }) {
  const ctx = useMyStateV2() ?? {};
  const {
    setConnectKalshiLiveEventsTickerMeta,
    connectKalshiLiveEventsDiscoveryMode = false,
    setConnectKalshiLiveEventsDiscoveryMode,
    connectKalshiLiveEventsDiscoveryStatus = "",
    setConnectKalshiLiveEventsDiscoveryStatus,
    connectKalshiLiveEventsDiscoverySeriesTicker = "",
    setConnectKalshiLiveEventsDiscoverySeriesTicker,
    connectKalshiLiveEventsDiscoveryTickers = "",
    setConnectKalshiLiveEventsDiscoveryTickers,
    connectKalshiLiveEventsDiscoveryMinCloseTs = "",
    setConnectKalshiLiveEventsDiscoveryMinCloseTs,
    connectKalshiLiveEventsDiscoveryMinUpdatedTs = "",
    setConnectKalshiLiveEventsDiscoveryMinUpdatedTs,
    connectKalshiLiveEventsIncludeMarkets = false,
    setConnectKalshiLiveEventsIncludeMarkets,
    connectKalshiLiveEventsRowMode = KALSHI_LIVE_EVENTS_ROW_MODE_NESTED,
    setConnectKalshiLiveEventsRowMode,
    connectKalshiLiveEndpointId,
    setConnectKalshiLiveColumnSelections,
  } = ctx;

  const discoveryValue = useMemo(
    () => ({
      status: connectKalshiLiveEventsDiscoveryStatus,
      seriesTicker: connectKalshiLiveEventsDiscoverySeriesTicker,
      tickers: connectKalshiLiveEventsDiscoveryTickers,
      minCloseTs: connectKalshiLiveEventsDiscoveryMinCloseTs,
      minUpdatedTs: connectKalshiLiveEventsDiscoveryMinUpdatedTs,
    }),
    [
      connectKalshiLiveEventsDiscoveryStatus,
      connectKalshiLiveEventsDiscoverySeriesTicker,
      connectKalshiLiveEventsDiscoveryTickers,
      connectKalshiLiveEventsDiscoveryMinCloseTs,
      connectKalshiLiveEventsDiscoveryMinUpdatedTs,
    ],
  );

  const setDiscoveryValue = (next) => {
    setConnectKalshiLiveEventsDiscoveryStatus?.(next.status ?? "");
    setConnectKalshiLiveEventsDiscoverySeriesTicker?.(next.seriesTicker ?? "");
    setConnectKalshiLiveEventsDiscoveryTickers?.(next.tickers ?? "");
    setConnectKalshiLiveEventsDiscoveryMinCloseTs?.(next.minCloseTs ?? "");
    setConnectKalshiLiveEventsDiscoveryMinUpdatedTs?.(next.minUpdatedTs ?? "");
  };

  const rowMode = normalizeKalshiLiveEventsRowMode(connectKalshiLiveEventsRowMode);

  const clearEventColumns = () => {
    if (!connectKalshiLiveEndpointId || connectKalshiLiveEndpointId !== "events") return;
    setConnectKalshiLiveColumnSelections?.((prev) => ({
      ...(prev || {}),
      events: [],
    }));
  };

  const discoveryToggle = (
    <div className="flex items-center gap-2">
      <Label htmlFor="events-discovery-mode" className="text-[11px] font-medium text-foreground">
        Toggle discovery mode
      </Label>
      <Switch
        id="events-discovery-mode"
        checked={!!connectKalshiLiveEventsDiscoveryMode}
        disabled={disabled}
        className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
        onCheckedChange={(checked) => {
          setConnectKalshiLiveEventsDiscoveryMode?.(!!checked);
          if (checked) {
            setDiscoveryValue(emptyKalshiLiveEventsDiscoveryParams());
          }
        }}
      />
    </div>
  );

  const marketsOptions = (
    <div className="space-y-3 rounded-md border border-border/50 bg-background/60 p-3">
      <div className="flex items-start gap-2">
        <Checkbox
          id="events-include-markets"
          checked={!!connectKalshiLiveEventsIncludeMarkets}
          disabled={disabled}
          onCheckedChange={(checked) => {
            setConnectKalshiLiveEventsIncludeMarkets?.(!!checked);
            clearEventColumns();
          }}
        />
        <div className="min-w-0 space-y-0.5">
          <Label
            htmlFor="events-include-markets"
            className="text-[11px] font-medium leading-snug text-foreground"
          >
            Include all markets in event
          </Label>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Requests nested markets for each event (`with_nested_markets=true`). Historical markets
            settled before the cutoff are omitted.
          </p>
        </div>
      </div>

      {connectKalshiLiveEventsIncludeMarkets ? (
        <div className="space-y-1.5 pl-6">
          <Label className="text-[11px] font-medium text-muted-foreground">How should rows look?</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={rowMode}
            onValueChange={(v) => {
              if (!v) return;
              setConnectKalshiLiveEventsRowMode?.(normalizeKalshiLiveEventsRowMode(v));
              clearEventColumns();
            }}
            className="h-auto flex-wrap justify-start gap-1"
            aria-label="Event market row layout"
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
            Nested keeps one event row (markets as JSON). Per-market expands each market into its
            own row and replicates event fields — column picker shows market fields only.
          </p>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="text-xs font-semibold tracking-tight text-foreground">
        {connectKalshiLiveEventsDiscoveryMode
          ? "Discover events with filters"
          : "Add event tickers below"}
      </h2>
      <p className="text-[11px] leading-snug text-muted-foreground">
        {connectKalshiLiveEventsDiscoveryMode
          ? "Browse Kalshi’s events list with status, series, ticker, and date filters. All matching pages are pulled into one sheet."
          : "Enter event tickers you already know (no semantic search). You can pull multiple events — choose one sheet or a sheet per event below."}
      </p>

      <div className="space-y-2 rounded-lg bg-muted/10 p-3">
        {connectKalshiLiveEventsDiscoveryMode ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-6">
              {discoveryToggle}
            </div>
            <KalshiLiveEventsDiscoveryFields
              value={discoveryValue}
              onChange={setDiscoveryValue}
              disabled={disabled}
            />
            {marketsOptions}
          </div>
        ) : (
          <div className="space-y-3">
            <MarketTickerSearch
              value={value}
              onChange={onChange}
              disabled={disabled}
              dataSource="live"
              searchScope="events"
              showCutoffNotes={false}
              headerStart={discoveryToggle}
              onSelectionsChange={(selections) => {
                const next = {};
                for (const s of selections || []) {
                  const ticker = String(s?.ticker || "").trim().toUpperCase();
                  if (!ticker) continue;
                  next[ticker] = String(s?.title || ticker).trim() || ticker;
                }
                setConnectKalshiLiveEventsTickerMeta?.(next);
              }}
            />
            {marketsOptions}
          </div>
        )}
      </div>
    </div>
  );
}
