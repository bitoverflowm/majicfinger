"use client";

import { useMemo } from "react";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { KalshiCandlestickCutoffNote } from "@/components/connectData/kalshiLive/KalshiLiveCandlestickHistoricalCutoffNote";
import { KalshiLiveMarketsDiscoveryFields } from "@/components/connectData/kalshiLive/KalshiLiveMarketsDiscoveryFields";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  emptyKalshiLiveMarketsDiscoveryParams,
  KALSHI_LIVE_MVE_FILTER_EXCLUDE,
} from "@/lib/kalshiLive/marketDiscovery";
import { cn } from "@/lib/utils";

/**
 * Markets ticker search with optional discovery mode (GET /markets list filters).
 *
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   className?: string;
 *   disabled?: boolean;
 * }} props
 */
export function KalshiLiveMarketsTickersField({ value, onChange, className, disabled }) {
  const ctx = useMyStateV2() ?? {};
  const {
    setConnectKalshiLiveMarketsTickerMeta,
    connectKalshiLiveMarketsDiscoveryMode = false,
    setConnectKalshiLiveMarketsDiscoveryMode,
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
  } = ctx;

  const discoveryValue = useMemo(
    () => ({
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

  const discoveryToggle = (
    <div className="flex items-center gap-2">
      <Label htmlFor="markets-discovery-mode" className="text-[11px] font-medium text-foreground">
        Toggle discovery mode
      </Label>
      <Switch
        id="markets-discovery-mode"
        checked={!!connectKalshiLiveMarketsDiscoveryMode}
        disabled={disabled}
        className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
        onCheckedChange={(checked) => {
          setConnectKalshiLiveMarketsDiscoveryMode?.(!!checked);
          if (checked) {
            const empty = emptyKalshiLiveMarketsDiscoveryParams();
            setDiscoveryValue(empty);
          }
        }}
      />
    </div>
  );

  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="text-xs font-semibold tracking-tight text-foreground">
        {connectKalshiLiveMarketsDiscoveryMode
          ? "Discover markets with filters"
          : "Add market tickers using the search below"}
      </h2>
      <KalshiCandlestickCutoffNote
        className="max-w-xl"
        direction="before"
        targetIntegration="kalshiHistorical"
        targetLabel="Kalshi Historical"
        dataLabel="market data"
      />
      <p className="text-[11px] leading-snug text-muted-foreground">
        {connectKalshiLiveMarketsDiscoveryMode
          ? "Browse Kalshi’s markets list with status, date, and ticker filters. All matching pages are pulled into one sheet."
          : "Search for markets (or open a series from semantic search to pick markets). You can pull multiple markets at once — choose one sheet or a sheet per market below."}
      </p>

      <div className="space-y-2 rounded-lg bg-muted/10 p-3">
        {connectKalshiLiveMarketsDiscoveryMode ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-6">
              {discoveryToggle}
            </div>
            <KalshiLiveMarketsDiscoveryFields
              value={discoveryValue}
              onChange={setDiscoveryValue}
              disabled={disabled}
            />
          </div>
        ) : (
          <MarketTickerSearch
            value={value}
            onChange={onChange}
            disabled={disabled}
            dataSource="live"
            showCutoffNotes={false}
            headerStart={discoveryToggle}
            onSelectionsChange={(selections) => {
              const next = {};
              for (const s of selections || []) {
                const ticker = String(s?.ticker || "").trim().toUpperCase();
                if (!ticker) continue;
                next[ticker] = String(s?.title || ticker).trim() || ticker;
              }
              setConnectKalshiLiveMarketsTickerMeta?.(next);
            }}
          />
        )}
      </div>
    </div>
  );
}
