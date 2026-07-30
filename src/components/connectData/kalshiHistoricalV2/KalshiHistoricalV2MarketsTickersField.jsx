"use client";

import { useMemo } from "react";

import { KalshiLiveMarketsDiscoveryFields } from "@/components/connectData/kalshiLive/KalshiLiveMarketsDiscoveryFields";
import { useMyStateV2 } from "@/context/stateContextV2";
import { KALSHI_LIVE_MVE_FILTER_EXCLUDE } from "@/lib/kalshiLive/marketDiscovery";
import { normalizeKalshiHistoricalV2MarketsDiscoveryScope } from "@/lib/kalshiHistoricalV2/historicalMarketsDiscovery";
import { cn } from "@/lib/utils";

/**
 * Historical v2 markets: discovery filters only (semantic search deferred).
 *
 * Uses the shared connectKalshiLive* state keys so we can reuse the existing
 * markets compose operation panel.
 *
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   className?: string;
 *   disabled?: boolean;
 * }} props
 */
export function KalshiHistoricalV2MarketsTickersField({ value: _value, onChange: _onChange, className, disabled }) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectKalshiLiveMarketsDiscoveryStatus = "",
    setConnectKalshiLiveMarketsDiscoveryStatus,
    connectKalshiLiveMarketsDiscoveryMveFilter = KALSHI_LIVE_MVE_FILTER_EXCLUDE,
    setConnectKalshiLiveMarketsDiscoveryMveFilter,
    connectKalshiLiveMarketsDiscoveryEventTicker = "",
    setConnectKalshiLiveMarketsDiscoveryEventTicker,
    connectKalshiLiveMarketsDiscoverySeriesTicker = "",
    setConnectKalshiLiveMarketsDiscoverySeriesTicker,
    connectKalshiLiveMarketsDiscoveryTickers = "",
    setConnectKalshiLiveMarketsDiscoveryTickers,
    connectKalshiLiveMarketsDiscoveryMinCreatedTs = "",
    setConnectKalshiLiveMarketsDiscoveryMinCreatedTs,
    connectKalshiLiveMarketsDiscoveryMaxCreatedTs = "",
    setConnectKalshiLiveMarketsDiscoveryMaxCreatedTs,
    connectKalshiLiveMarketsDiscoveryMinUpdatedTs = "",
    setConnectKalshiLiveMarketsDiscoveryMinUpdatedTs,
    connectKalshiLiveMarketsDiscoveryMinCloseTs = "",
    setConnectKalshiLiveMarketsDiscoveryMinCloseTs,
    connectKalshiLiveMarketsDiscoveryMaxCloseTs = "",
    setConnectKalshiLiveMarketsDiscoveryMaxCloseTs,
    connectKalshiLiveMarketsDiscoveryMinSettledTs = "",
    setConnectKalshiLiveMarketsDiscoveryMinSettledTs,
    connectKalshiLiveMarketsDiscoveryMaxSettledTs = "",
    setConnectKalshiLiveMarketsDiscoveryMaxSettledTs,
    connectKalshiHistoricalV2MarketsDiscoveryScope = "event",
    setConnectKalshiHistoricalV2MarketsDiscoveryScope,
  } = ctx;

  const discoveryValue = useMemo(
    () => ({
      tickerScope: normalizeKalshiHistoricalV2MarketsDiscoveryScope(
        connectKalshiHistoricalV2MarketsDiscoveryScope,
      ),
      status: connectKalshiLiveMarketsDiscoveryStatus,
      mveFilter: connectKalshiLiveMarketsDiscoveryMveFilter,
      eventTicker: connectKalshiLiveMarketsDiscoveryEventTicker,
      seriesTicker: connectKalshiLiveMarketsDiscoverySeriesTicker,
      tickers: connectKalshiLiveMarketsDiscoveryTickers,
      minCreatedTs: connectKalshiLiveMarketsDiscoveryMinCreatedTs,
      maxCreatedTs: connectKalshiLiveMarketsDiscoveryMaxCreatedTs,
      minUpdatedTs: connectKalshiLiveMarketsDiscoveryMinUpdatedTs,
      minCloseTs: connectKalshiLiveMarketsDiscoveryMinCloseTs,
      maxCloseTs: connectKalshiLiveMarketsDiscoveryMaxCloseTs,
      minSettledTs: connectKalshiLiveMarketsDiscoveryMinSettledTs,
      maxSettledTs: connectKalshiLiveMarketsDiscoveryMaxSettledTs,
    }),
    [
      connectKalshiHistoricalV2MarketsDiscoveryScope,
      connectKalshiLiveMarketsDiscoveryStatus,
      connectKalshiLiveMarketsDiscoveryMveFilter,
      connectKalshiLiveMarketsDiscoveryEventTicker,
      connectKalshiLiveMarketsDiscoverySeriesTicker,
      connectKalshiLiveMarketsDiscoveryTickers,
      connectKalshiLiveMarketsDiscoveryMinCreatedTs,
      connectKalshiLiveMarketsDiscoveryMaxCreatedTs,
      connectKalshiLiveMarketsDiscoveryMinUpdatedTs,
      connectKalshiLiveMarketsDiscoveryMinCloseTs,
      connectKalshiLiveMarketsDiscoveryMaxCloseTs,
      connectKalshiLiveMarketsDiscoveryMinSettledTs,
      connectKalshiLiveMarketsDiscoveryMaxSettledTs,
    ],
  );

  const setDiscoveryValue = (next) => {
    if (next.tickerScope != null) {
      setConnectKalshiHistoricalV2MarketsDiscoveryScope?.(
        normalizeKalshiHistoricalV2MarketsDiscoveryScope(next.tickerScope),
      );
    }
    setConnectKalshiLiveMarketsDiscoveryStatus?.(next.status ?? "");
    setConnectKalshiLiveMarketsDiscoveryMveFilter?.(
      next.mveFilter ?? KALSHI_LIVE_MVE_FILTER_EXCLUDE,
    );
    setConnectKalshiLiveMarketsDiscoveryEventTicker?.(next.eventTicker ?? "");
    setConnectKalshiLiveMarketsDiscoverySeriesTicker?.(next.seriesTicker ?? "");
    setConnectKalshiLiveMarketsDiscoveryTickers?.(next.tickers ?? "");
    setConnectKalshiLiveMarketsDiscoveryMinCreatedTs?.(next.minCreatedTs ?? "");
    setConnectKalshiLiveMarketsDiscoveryMaxCreatedTs?.(next.maxCreatedTs ?? "");
    setConnectKalshiLiveMarketsDiscoveryMinUpdatedTs?.(next.minUpdatedTs ?? "");
    setConnectKalshiLiveMarketsDiscoveryMinCloseTs?.(next.minCloseTs ?? "");
    setConnectKalshiLiveMarketsDiscoveryMaxCloseTs?.(next.maxCloseTs ?? "");
    setConnectKalshiLiveMarketsDiscoveryMinSettledTs?.(next.minSettledTs ?? "");
    setConnectKalshiLiveMarketsDiscoveryMaxSettledTs?.(next.maxSettledTs ?? "");
  };

  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="text-xs font-semibold tracking-tight text-foreground">
        Discover or Explore Kalshi Historical Markets
      </h2>

      <p className="text-[11px] leading-snug text-muted-foreground">
        Browse Kalshi’s historical markets with an event ticker, series ticker, or market tickers
        filter. Matching pages are pulled into one sheet.
      </p>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Note: historical v2 only supports ticker search due to recency and dynamic nature of this
        data archive. Category and advanced filter support coming soon
      </p>

      <div className="space-y-2 rounded-lg bg-muted/10 p-3">
        <KalshiLiveMarketsDiscoveryFields
          value={discoveryValue}
          onChange={setDiscoveryValue}
          disabled={disabled}
          cutoffMode="historical"
        />
      </div>
    </div>
  );
}
