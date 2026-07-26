"use client";

import { useCallback, useState } from "react";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  deriveEventTickerFromMarket,
  inferSeriesTickerFromEvent,
} from "@/lib/kalshiLive/eventCandlesticksCompose";
import { cn } from "@/lib/utils";

/**
 * Event Candlesticks — pick one event (semantic search over its markets, or type a
 * ticker) and confirm the parent series. Candlesticks are pulled for every market
 * in that event.
 *
 * @param {{ className?: string; disabled?: boolean }} props
 */
export function KalshiLiveEventCandlesticksField({ className, disabled }) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectKalshiLiveEventCandlesticksEventTicker = "",
    setConnectKalshiLiveEventCandlesticksEventTicker,
    connectKalshiLiveEventCandlesticksSeriesTicker = "",
    setConnectKalshiLiveEventCandlesticksSeriesTicker,
    setConnectKalshiLiveEventCandlesticksTickerMeta,
  } = ctx;

  const [marketSearch, setMarketSearch] = useState("");

  const applySelections = useCallback(
    (selections) => {
      const s = (selections || [])[0];
      if (!s) return;
      const marketTicker = String(s.ticker || "").trim().toUpperCase();
      const eventTicker = String(
        s.eventTicker || deriveEventTickerFromMarket(marketTicker),
      )
        .trim()
        .toUpperCase();
      if (!eventTicker) return;

      const series = inferSeriesTickerFromEvent(eventTicker);
      setConnectKalshiLiveEventCandlesticksEventTicker?.(eventTicker);
      if (series) setConnectKalshiLiveEventCandlesticksSeriesTicker?.(series);
      setConnectKalshiLiveEventCandlesticksTickerMeta?.({
        [eventTicker]: String(s.title || eventTicker).trim() || eventTicker,
      });
    },
    [
      setConnectKalshiLiveEventCandlesticksEventTicker,
      setConnectKalshiLiveEventCandlesticksSeriesTicker,
      setConnectKalshiLiveEventCandlesticksTickerMeta,
    ],
  );

  const handleEventTickerChange = useCallback(
    (raw) => {
      const eventTicker = String(raw || "").toUpperCase();
      setConnectKalshiLiveEventCandlesticksEventTicker?.(eventTicker);
      const series = inferSeriesTickerFromEvent(eventTicker);
      // Auto-fill series only while the user hasn't set one yet.
      if (series && !String(connectKalshiLiveEventCandlesticksSeriesTicker || "").trim()) {
        setConnectKalshiLiveEventCandlesticksSeriesTicker?.(series);
      }
    },
    [
      connectKalshiLiveEventCandlesticksSeriesTicker,
      setConnectKalshiLiveEventCandlesticksEventTicker,
      setConnectKalshiLiveEventCandlesticksSeriesTicker,
    ],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="text-xs font-semibold tracking-tight text-foreground">
        Which event are you looking for?
      </h2>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Search for the event (by title, market, or ticker) and we&apos;ll pull candlesticks for
        every market in it — one metadata sheet, then a sheet per market. Only one event per pull.
      </p>

      <div className="space-y-3 rounded-lg bg-muted/10 p-3">
        <MarketTickerSearch
          value={marketSearch}
          onChange={setMarketSearch}
          disabled={disabled}
          dataSource="live"
          searchScope="markets"
          maxTickers={1}
          showCutoffNotes={false}
          onSelectionsChange={applySelections}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Event ticker</Label>
            <Input
              value={connectKalshiLiveEventCandlesticksEventTicker}
              disabled={disabled}
              placeholder="e.g. KXHIGHNY-25JAN01"
              onChange={(e) => handleEventTickerChange(e.target.value)}
              className="h-9 font-mono text-xs uppercase"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Series ticker</Label>
            <Input
              value={connectKalshiLiveEventCandlesticksSeriesTicker}
              disabled={disabled}
              placeholder="e.g. KXHIGHNY"
              onChange={(e) =>
                setConnectKalshiLiveEventCandlesticksSeriesTicker?.(
                  String(e.target.value || "").toUpperCase(),
                )
              }
              className="h-9 font-mono text-xs uppercase"
            />
          </div>
        </div>
        <p className="text-[10px] leading-snug text-muted-foreground">
          The series ticker is deduced from the event automatically. Override it here if you already
          know it.
        </p>
      </div>
    </div>
  );
}
