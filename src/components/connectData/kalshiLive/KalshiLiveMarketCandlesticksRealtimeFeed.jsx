"use client";

import { useEffect, useMemo } from "react";
import { CircleOff, Radio } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
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
import { parseKalshiLiveMarketTickersInput } from "@/lib/kalshiLive/candlesticksColumns";
import {
  kalshiCandlestickTickerMetaEntry,
  kalshiCandlestickTickerMetaTitle,
} from "@/lib/kalshiLive/candlestickTickerMeta";
import {
  isKalshiMarketClosedStatus,
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
 * @param {ReturnType<typeof kalshiCandlestickTickerMetaEntry>} entry
 * @returns {boolean}
 */
function isSelectionClosed(entry) {
  if (!entry) return false;
  if (isKalshiMarketClosedStatus(entry.status)) return true;
  return isKalshiMarketPastTrading({
    status: entry.status,
    open_time: entry.openTime,
    close_time: entry.closeTime,
  });
}

/**
 * Compose-time Real Time Feed for Market Candlesticks.
 *
 * @param {{ className?: string; disabled?: boolean }} props
 */
export function KalshiLiveMarketCandlesticksRealtimeFeed({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectKalshiLiveWhereFilters = [],
    connectKalshiLiveCandlestickTickers = "",
    connectKalshiLiveCandlestickTickerMeta = {},
    connectKalshiLiveRealtimeFeedEnabled = false,
    setConnectKalshiLiveRealtimeFeedEnabled,
    connectKalshiLiveRealtimePollIntervalMs,
    setConnectKalshiLiveRealtimePollIntervalMs,
    connectKalshiLiveRealtimeMarketTickers = [],
    setConnectKalshiLiveRealtimeMarketTickers,
  } = ctx;

  const tickers = useMemo(
    () => parseKalshiLiveMarketTickersInput(connectKalshiLiveCandlestickTickers),
    [connectKalshiLiveCandlestickTickers],
  );

  const classified = useMemo(() => {
    /** @type {{ ticker: string; title: string; closed: boolean; known: boolean }[]} */
    const rows = [];
    for (const ticker of tickers) {
      const entry = kalshiCandlestickTickerMetaEntry(
        connectKalshiLiveCandlestickTickerMeta,
        ticker,
      );
      const known = !!(entry?.status || entry?.closeTime);
      const closed = known ? isSelectionClosed(entry) : false;
      rows.push({
        ticker,
        title: kalshiCandlestickTickerMetaTitle(connectKalshiLiveCandlestickTickerMeta, ticker),
        closed,
        known,
      });
    }
    return rows;
  }, [tickers, connectKalshiLiveCandlestickTickerMeta]);

  const activeTickers = useMemo(
    () => classified.filter((r) => !r.closed).map((r) => r.ticker),
    [classified],
  );
  const closedTickers = useMemo(
    () => classified.filter((r) => r.closed).map((r) => r.ticker),
    [classified],
  );
  const allClosed = tickers.length > 0 && activeTickers.length === 0 && closedTickers.length > 0;
  const noTickers = tickers.length === 0;

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

  // Sync live-tracked subset to active tickers (drop closed / removed).
  useEffect(() => {
    if (!setConnectKalshiLiveRealtimeMarketTickers) return;
    const activeSet = new Set(activeTickers);
    const prev = Array.isArray(connectKalshiLiveRealtimeMarketTickers)
      ? connectKalshiLiveRealtimeMarketTickers
      : [];
    let next = prev
      .map((t) => String(t || "").trim().toUpperCase())
      .filter((t) => activeSet.has(t));
    if (activeTickers.length === 1) {
      next = [activeTickers[0]];
    } else if (activeTickers.length > 1 && next.length === 0) {
      next = [...activeTickers];
    }
    const same =
      next.length === prev.length && next.every((t, i) => t === String(prev[i] || "").toUpperCase());
    if (!same) setConnectKalshiLiveRealtimeMarketTickers(next);
  }, [
    activeTickers,
    connectKalshiLiveRealtimeMarketTickers,
    setConnectKalshiLiveRealtimeMarketTickers,
  ]);

  useEffect(() => {
    if (allClosed) setConnectKalshiLiveRealtimeFeedEnabled?.(false);
  }, [allClosed, setConnectKalshiLiveRealtimeFeedEnabled]);

  const selectedLive = useMemo(() => {
    const set = new Set(
      (Array.isArray(connectKalshiLiveRealtimeMarketTickers)
        ? connectKalshiLiveRealtimeMarketTickers
        : []
      ).map((t) => String(t || "").trim().toUpperCase()),
    );
    return activeTickers.filter((t) => set.has(t));
  }, [connectKalshiLiveRealtimeMarketTickers, activeTickers]);

  const enabled =
    !!connectKalshiLiveRealtimeFeedEnabled && !allClosed && !noTickers && selectedLive.length > 0;
  const controlsDisabled = disabled || allClosed || noTickers;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5">
        {allClosed ? (
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
        Optionally start a live REST poll when you submit this pull. You can enable or disable the
        feed later from Power moves.
      </p>

      {allClosed ? (
        <div
          role="status"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2"
        >
          <p className="text-[11px] font-semibold leading-snug text-amber-950 dark:text-amber-100">
            Markets have ended — no feed available
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-amber-950/90 dark:text-amber-100/90">
            Selected markets are closed according to Kalshi metadata. You can still pull historical
            candlesticks.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch
              id="market-candles-realtime-enable"
              checked={!!connectKalshiLiveRealtimeFeedEnabled && !allClosed && !noTickers}
              disabled={controlsDisabled}
              className="h-4 w-7 shrink-0 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
              onCheckedChange={(checked) => {
                setConnectKalshiLiveRealtimeFeedEnabled?.(!!checked);
              }}
            />
            <Label
              htmlFor="market-candles-realtime-enable"
              className="cursor-pointer text-[11px] font-medium text-foreground"
            >
              Enable real time feed
            </Label>
          </div>

          {connectKalshiLiveRealtimeFeedEnabled && !allClosed && !noTickers ? (
            <>
              {activeTickers.length > 1 ? (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground">
                    Markets to stream
                  </Label>
                  <div className="space-y-1.5">
                    {classified.map((row) => {
                      const checked = selectedLive.includes(row.ticker);
                      return (
                        <label
                          key={row.ticker}
                          className={cn(
                            "flex items-start gap-2 text-[11px]",
                            row.closed
                              ? "cursor-not-allowed text-muted-foreground/70"
                              : "cursor-pointer text-foreground",
                          )}
                        >
                          <Checkbox
                            checked={row.closed ? false : checked}
                            disabled={controlsDisabled || row.closed}
                            className="mt-0.5"
                            onCheckedChange={(next) => {
                              if (row.closed) return;
                              const on = !!next;
                              setConnectKalshiLiveRealtimeMarketTickers?.((prev) => {
                                const list = Array.isArray(prev) ? [...prev] : [];
                                const upper = list.map((t) => String(t || "").trim().toUpperCase());
                                if (on) {
                                  if (!upper.includes(row.ticker)) upper.push(row.ticker);
                                } else {
                                  return upper.filter((t) => t !== row.ticker);
                                }
                                return upper;
                              });
                            }}
                          />
                          <span className="min-w-0">
                            <span className="font-medium">{row.title}</span>
                            <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                              {row.ticker}
                            </span>
                            {row.closed ? (
                              <span className="ml-1 text-[10px] text-amber-700 dark:text-amber-300">
                                · closed
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {closedTickers.length > 0 ? (
                    <p className="text-[10px] leading-snug text-muted-foreground">
                      Closed markets cannot join the live feed.
                    </p>
                  ) : null}
                </div>
              ) : null}

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
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
