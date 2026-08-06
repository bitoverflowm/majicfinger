"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleOff, Radio } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMyStateV2 } from "@/context/stateContextV2";
import { fetchKalshiLiveEvent } from "@/lib/kalshiLive/fetchKalshiLiveEvent";
import {
  evaluateTrackedMarketsClosure,
  isKalshiMarketPastTrading,
} from "@/lib/liveFeeds/marketClosure";
import {
  clampLiveFeedPollIntervalMs,
  describeCandlePeriod,
  filterLiveFeedPollOptionsForPeriod,
  pollIntervalMsForPeriod,
} from "@/lib/liveFeeds/registry";
import { cn } from "@/lib/utils";

/**
 * @param {unknown[]} filters
 * @param {string} column
 */
function readFilterValue(filters, column) {
  const f = (Array.isArray(filters) ? filters : []).find((row) => row?.column === column);
  return f?.value;
}

/**
 * Compose-time Real Time Feed controls for Events Candlesticks.
 * Mirrors the Power moves live-feed frequency picker, gated by candle period.
 *
 * @param {{ className?: string; disabled?: boolean }} props
 */
export function KalshiLiveEventCandlesticksRealtimeFeed({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectKalshiLiveWhereFilters = [],
    connectKalshiLiveEventCandlesticksEventTicker = "",
    connectKalshiLiveRealtimeFeedEnabled = false,
    setConnectKalshiLiveRealtimeFeedEnabled,
    connectKalshiLiveRealtimePollIntervalMs,
    setConnectKalshiLiveRealtimePollIntervalMs,
  } = ctx;

  const eventTicker = String(connectKalshiLiveEventCandlesticksEventTicker || "")
    .trim()
    .toUpperCase();

  const periodRaw = Number(readFilterValue(connectKalshiLiveWhereFilters, "period_interval"));
  const periodInterval = [1, 60, 1440].includes(periodRaw) ? periodRaw : 60;
  const candleLabel = describeCandlePeriod(periodInterval);

  const pollOptions = useMemo(
    () => filterLiveFeedPollOptionsForPeriod(periodInterval),
    [periodInterval],
  );

  const pollValueMs = useMemo(() => {
    return clampLiveFeedPollIntervalMs(
      connectKalshiLiveRealtimePollIntervalMs ?? pollIntervalMsForPeriod(periodInterval),
      periodInterval,
    );
  }, [connectKalshiLiveRealtimePollIntervalMs, periodInterval]);

  const [eventEnded, setEventEnded] = useState(false);
  const [timingLoading, setTimingLoading] = useState(false);

  // Keep poll interval valid when candle period changes.
  useEffect(() => {
    if (!setConnectKalshiLiveRealtimePollIntervalMs) return;
    const next = clampLiveFeedPollIntervalMs(
      connectKalshiLiveRealtimePollIntervalMs ?? pollIntervalMsForPeriod(periodInterval),
      periodInterval,
    );
    if (next !== Number(connectKalshiLiveRealtimePollIntervalMs)) {
      setConnectKalshiLiveRealtimePollIntervalMs(next);
    }
  }, [
    periodInterval,
    connectKalshiLiveRealtimePollIntervalMs,
    setConnectKalshiLiveRealtimePollIntervalMs,
  ]);

  // Resolve whether the selected event has ended from live event + nested markets.
  useEffect(() => {
    if (!eventTicker) {
      setEventEnded(false);
      setTimingLoading(false);
      return undefined;
    }

    let cancelled = false;
    const ac = new AbortController();
    setTimingLoading(true);

    (async () => {
      try {
        const { markets } = await fetchKalshiLiveEvent({
          eventTicker,
          withNestedMarkets: true,
          signal: ac.signal,
        });
        if (cancelled) return;
        const rows = Array.isArray(markets) ? markets : [];
        if (!rows.length) {
          setEventEnded(false);
          return;
        }
        const tickers = rows
          .map((m) => String(m?.ticker || m?.market_ticker || "").trim().toUpperCase())
          .filter(Boolean);
        const closure = evaluateTrackedMarketsClosure(rows, tickers);
        const allPast =
          closure.allClosed ||
          (rows.length > 0 && rows.every((m) => isKalshiMarketPastTrading(m)));
        setEventEnded(!!allPast);
        if (allPast) {
          setConnectKalshiLiveRealtimeFeedEnabled?.(false);
        }
      } catch {
        if (!cancelled && !ac.signal.aborted) {
          // Unknown status — leave feed selectable; post-pull closure still gates start.
          setEventEnded(false);
        }
      } finally {
        if (!cancelled) setTimingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [eventTicker, setConnectKalshiLiveRealtimeFeedEnabled]);

  const enabled = !!connectKalshiLiveRealtimeFeedEnabled && !eventEnded;
  const controlsDisabled = disabled || eventEnded || timingLoading;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5">
        {eventEnded ? (
          <CircleOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <Radio
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              enabled ? "text-emerald-500" : "text-muted-foreground",
            )}
            aria-hidden
          />
        )}
        <h2 className="text-xs font-semibold tracking-tight text-foreground">Real Time Feed</h2>
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">
        Start live feed when you submit this pull. You can enable or disable the
        feed later from Power moves.
      </p>

      {eventEnded ? (
        <div
          role="status"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2"
        >
          <p className="text-[11px] font-semibold leading-snug text-amber-950 dark:text-amber-100">
            Event has ended — no feed available
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-amber-950/90 dark:text-amber-100/90">
            Markets for this event are closed according to Kalshi metadata. You can still pull
            historical candlesticks.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch
              id="event-candles-realtime-enable"
              checked={enabled}
              disabled={controlsDisabled}
              className="h-4 w-7 shrink-0 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
              onCheckedChange={(checked) => {
                setConnectKalshiLiveRealtimeFeedEnabled?.(!!checked);
              }}
            />
            <Label
              htmlFor="event-candles-realtime-enable"
              className="cursor-pointer text-[11px] font-medium text-foreground"
            >
              Enable real time feed
            </Label>
          </div>

          {enabled ? (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Feed refresh rate
              </Label>
              <Select
                value={String(pollValueMs)}
                disabled={controlsDisabled}
                onValueChange={(raw) => {
                  const next = clampLiveFeedPollIntervalMs(Number(raw), periodInterval);
                  setConnectKalshiLiveRealtimePollIntervalMs?.(next);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Refresh rate" />
                </SelectTrigger>
                <SelectContent>
                  {pollOptions.map((opt) => (
                    <SelectItem key={opt.valueMs} value={String(opt.valueMs)} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] leading-snug text-muted-foreground">
                Limited by your{" "}
                <span className="font-medium text-foreground">{candleLabel}</span> candle period —
                refresh cannot be faster than one candle.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
