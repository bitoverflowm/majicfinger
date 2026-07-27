"use client";

import { useCallback, useState } from "react";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyStateV2 } from "@/context/stateContextV2";
import { inferSeriesTickerFromEvent } from "@/lib/kalshiLive/eventCandlesticksCompose";
import { cn } from "@/lib/utils";

/**
 * Event Forecast — series-style semantic search that resolves to one event,
 * filling both path params. Manual ticker entry is also supported.
 *
 * @param {{ className?: string; disabled?: boolean }} props
 */
export function KalshiLiveEventForecastField({ className, disabled }) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectKalshiLiveEventForecastEventTicker = "",
    setConnectKalshiLiveEventForecastEventTicker,
    connectKalshiLiveEventForecastSeriesTicker = "",
    setConnectKalshiLiveEventForecastSeriesTicker,
    setConnectKalshiLiveEventForecastTickerMeta,
  } = ctx;

  const [searchValue, setSearchValue] = useState("");

  const applySelections = useCallback(
    (selections) => {
      const s = (selections || [])[0];
      if (!s) {
        setConnectKalshiLiveEventForecastEventTicker?.("");
        setConnectKalshiLiveEventForecastSeriesTicker?.("");
        setConnectKalshiLiveEventForecastTickerMeta?.({});
        return;
      }

      const eventTicker = String(s.eventTicker || s.ticker || "")
        .trim()
        .toUpperCase();
      if (!eventTicker) return;

      const series =
        String(s.seriesTicker || "").trim().toUpperCase() ||
        inferSeriesTickerFromEvent(eventTicker);

      setConnectKalshiLiveEventForecastEventTicker?.(eventTicker);
      if (series) setConnectKalshiLiveEventForecastSeriesTicker?.(series);
      setConnectKalshiLiveEventForecastTickerMeta?.({
        [eventTicker]: String(s.title || eventTicker).trim() || eventTicker,
      });
      setSearchValue("");
    },
    [
      setConnectKalshiLiveEventForecastEventTicker,
      setConnectKalshiLiveEventForecastSeriesTicker,
      setConnectKalshiLiveEventForecastTickerMeta,
    ],
  );

  const handleEventTickerChange = useCallback(
    (raw) => {
      const eventTicker = String(raw || "").toUpperCase();
      setConnectKalshiLiveEventForecastEventTicker?.(eventTicker);
      const series = inferSeriesTickerFromEvent(eventTicker);
      if (series && !String(connectKalshiLiveEventForecastSeriesTicker || "").trim()) {
        setConnectKalshiLiveEventForecastSeriesTicker?.(series);
      }
    },
    [
      connectKalshiLiveEventForecastSeriesTicker,
      setConnectKalshiLiveEventForecastEventTicker,
      setConnectKalshiLiveEventForecastSeriesTicker,
    ],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="text-xs font-semibold tracking-tight text-foreground">
        Which event&apos;s forecast do you want?
      </h2>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Use semantic search (same as Series) to resolve one event and fill the path parameters, or
        type the tickers if you already know them.
      </p>

      <div className="space-y-3 rounded-lg bg-muted/10 p-3">
        <MarketTickerSearch
          value={searchValue}
          onChange={setSearchValue}
          disabled={disabled}
          dataSource="live"
          searchScope="events_semantic"
          maxTickers={1}
          showCutoffNotes={false}
          required={false}
          onSelectionsChange={applySelections}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Event ticker</Label>
            <Input
              value={connectKalshiLiveEventForecastEventTicker}
              disabled={disabled}
              placeholder="e.g. KXHIGHNY-25JAN01"
              onChange={(e) => handleEventTickerChange(e.target.value)}
              className="h-9 font-mono text-xs uppercase"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Series ticker</Label>
            <Input
              value={connectKalshiLiveEventForecastSeriesTicker}
              disabled={disabled}
              placeholder="e.g. KXHIGHNY"
              onChange={(e) =>
                setConnectKalshiLiveEventForecastSeriesTicker?.(
                  String(e.target.value || "").toUpperCase(),
                )
              }
              className="h-9 font-mono text-xs uppercase"
            />
          </div>
        </div>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Path params for{" "}
          <span className="font-mono text-[10px]">
            /series/{"{series_ticker}"}/events/{"{ticker}"}/forecast_percentile_history
          </span>
          .
        </p>
      </div>
    </div>
  );
}
