"use client";

import { useCallback, useState } from "react";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyStateV2 } from "@/context/stateContextV2";
import { inferSeriesTickerFromEvent } from "@/lib/kalshiLive/eventCandlesticksCompose";
import { cn } from "@/lib/utils";

/**
 * Event Candlesticks — series-style semantic search that resolves to one event.
 * Embedding hits with an event_ticker fill both path params directly; pure series
 * hits open an event picker. Candlesticks are pulled for every market in that event.
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

  const [searchValue, setSearchValue] = useState("");

  const applySelections = useCallback(
    (selections) => {
      const s = (selections || [])[0];
      if (!s) {
        setConnectKalshiLiveEventCandlesticksEventTicker?.("");
        setConnectKalshiLiveEventCandlesticksSeriesTicker?.("");
        setConnectKalshiLiveEventCandlesticksTickerMeta?.({});
        return;
      }

      const eventTicker = String(s.eventTicker || s.ticker || "")
        .trim()
        .toUpperCase();
      if (!eventTicker) return;

      const series =
        String(s.seriesTicker || "").trim().toUpperCase() ||
        inferSeriesTickerFromEvent(eventTicker);

      setConnectKalshiLiveEventCandlesticksEventTicker?.(eventTicker);
      if (series) setConnectKalshiLiveEventCandlesticksSeriesTicker?.(series);
      setConnectKalshiLiveEventCandlesticksTickerMeta?.({
        [eventTicker]: String(s.title || eventTicker).trim() || eventTicker,
      });
      // Clear the search chips after path params are filled — the inputs below
      // are the source of truth for the pull.
      setSearchValue("");
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
        Use the same semantic search as Series — we&apos;ll resolve to one event and fill the
        path parameters. Candlesticks land as one metadata sheet, then a sheet per market.
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
      </div>
    </div>
  );
}
