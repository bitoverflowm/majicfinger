"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import {
  buildForecastChartSeries,
  HubKalshiLiveBonusEventForecastChart,
} from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveBonusEventForecastChart";
import type { DemoChartColorTokenId } from "@/components/hubs/kalshiLiveDemo/demoChartColors";
import { Button } from "@/components/ui/button";
import { inferSeriesTickerFromEvent } from "@/lib/kalshiLive/eventCandlesticksCompose";
import {
  KALSHI_LIVE_EVENT_FORECAST_DEFAULT_PERCENTILE_PCTS,
  KALSHI_LIVE_EVENT_FORECAST_PERIOD_OPTIONS,
} from "@/lib/kalshiLive/eventForecastColumns";
import { deriveEventForecastWindowFromEvent } from "@/lib/kalshiLive/eventForecastCompose";
import { fetchKalshiLiveEvent } from "@/lib/kalshiLive/fetchKalshiLiveEvent";
import { fetchKalshiLiveEventForecastPull } from "@/lib/kalshiLive/fetchKalshiLiveEventForecastPull";
import { cn } from "@/lib/utils";

type EventSelection = {
  eventTicker: string;
  seriesTicker: string;
  title: string;
};

type ForecastState = {
  rows: Record<string, unknown>[];
  eventTicker: string;
  seriesTicker: string;
  title: string;
  startTs: number;
  endTs: number;
  periodInterval: number;
  adjustedEndTs: number | null;
  querySummary: string;
};

function periodLabel(periodInterval: number): string {
  const opt = KALSHI_LIVE_EVENT_FORECAST_PERIOD_OPTIONS.find(
    (o) => o.value === periodInterval,
  );
  return opt?.label || `${periodInterval}m`;
}

function formatUnixRange(startTs: number, endTs: number): string {
  const fmt = (sec: number) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(sec * 1000));
    } catch {
      return new Date(sec * 1000).toLocaleString();
    }
  };
  return `${fmt(startTs)} – ${fmt(endTs)}`;
}

function ChartSkeleton() {
  return (
    <div className="flex min-h-[18rem] flex-1 flex-col justify-end gap-3 px-4 py-6 sm:min-h-[22rem]">
      <div className="flex items-end gap-2">
        {[42, 58, 36, 70, 48, 64, 40, 72, 55, 68, 44, 60].map((h, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-sm bg-muted/70"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="h-px w-full bg-border/60" />
    </div>
  );
}

type HubKalshiLiveBonusEventForecastsProps = {
  className?: string;
};

/**
 * Bonus Features — Event Forecasts panel.
 * Semantic event search → fixed event window → forecast percentile history chart.
 */
export function HubKalshiLiveBonusEventForecasts({
  className,
}: HubKalshiLiveBonusEventForecastsProps) {
  const [tickersValue, setTickersValue] = useState("");
  const [selection, setSelection] = useState<EventSelection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastState | null>(null);
  const [hiddenSeriesIds, setHiddenSeriesIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [seriesColors, setSeriesColors] = useState<
    Record<string, DemoChartColorTokenId>
  >({});

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const percentilePcts = KALSHI_LIVE_EVENT_FORECAST_DEFAULT_PERCENTILE_PCTS;

  const chartSeries = useMemo(() => {
    return buildForecastChartSeries(percentilePcts).map((s) => ({
      ...s,
      colorToken: seriesColors[s.key] ?? s.colorToken,
    }));
  }, [percentilePcts, seriesColors]);

  const loadForecast = useCallback(async (sel: EventSelection) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    setForecast(null);

    try {
      const { event, markets: topMarkets } = await fetchKalshiLiveEvent({
        eventTicker: sel.eventTicker,
        withNestedMarkets: true,
        signal: ac.signal,
      });

      const nested = Array.isArray(event.markets) ? event.markets : [];
      const markets = nested.length ? nested : topMarkets;

      const seriesTicker =
        String(event.series_ticker || "").trim().toUpperCase() ||
        sel.seriesTicker ||
        inferSeriesTickerFromEvent(sel.eventTicker);

      const title =
        String(event.title || event.sub_title || "").trim() || sel.title;

      const window = deriveEventForecastWindowFromEvent(event, markets);

      const result = await fetchKalshiLiveEventForecastPull({
        eventTicker: sel.eventTicker,
        seriesTicker,
        percentilePcts,
        whereFilters: [
          { id: "start_ts", column: "start_ts", op: "eq", value: window.start_ts },
          { id: "end_ts", column: "end_ts", op: "eq", value: window.end_ts },
          {
            id: "period_interval",
            column: "period_interval",
            op: "eq",
            value: window.period_interval,
          },
        ],
        signal: ac.signal,
      });

      if (requestId !== requestIdRef.current) return;

      setForecast({
        rows: result.rows as Record<string, unknown>[],
        eventTicker: result.eventTicker,
        seriesTicker: result.seriesTicker,
        title,
        startTs: window.start_ts,
        endTs: result.adjustedEndTs ?? window.end_ts,
        periodInterval: window.period_interval,
        adjustedEndTs: result.adjustedEndTs,
        querySummary: result.querySummary,
      });
      setHiddenSeriesIds(new Set());
    } catch (e) {
      if (ac.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
        return;
      }
      if (requestId !== requestIdRef.current) return;
      setError(
        e instanceof Error ? e.message : "Failed to load event forecast.",
      );
      setForecast(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [percentilePcts]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleTickersChange = useCallback((next: string) => {
    setTickersValue(next);
    const hasSelection = next
      .split(",")
      .some((part) => Boolean(String(part || "").trim()));
    if (!hasSelection) {
      setSelection(null);
      setForecast(null);
      setError(null);
      abortRef.current?.abort();
      setLoading(false);
    }
  }, []);

  const handleSelectionsChange = useCallback(
    (selections: Array<{
      ticker?: string;
      title?: string;
      eventTicker?: string;
      seriesTicker?: string;
    }>) => {
      const s = selections?.[0];
      if (!s) return;

      const eventTicker = String(s.eventTicker || s.ticker || "")
        .trim()
        .toUpperCase();
      if (!eventTicker) return;

      const seriesTicker =
        String(s.seriesTicker || "").trim().toUpperCase() ||
        inferSeriesTickerFromEvent(eventTicker);
      const title = String(s.title || eventTicker).trim() || eventTicker;
      const next = { eventTicker, seriesTicker, title };

      setSelection((prev) => {
        if (
          prev &&
          prev.eventTicker === next.eventTicker &&
          prev.seriesTicker === next.seriesTicker
        ) {
          return prev;
        }
        return next;
      });
      void loadForecast(next);
    },
    [loadForecast],
  );

  const toggleSeries = useCallback((id: string) => {
    setHiddenSeriesIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const changeSeriesColor = useCallback(
    (id: string, tokenId: DemoChartColorTokenId) => {
      setSeriesColors((prev) => ({ ...prev, [id]: tokenId }));
    },
    [],
  );

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <div className="rounded-xl border border-border/70 bg-muted/15 px-4 py-3.5 sm:px-5">
        <p className="text-sm font-medium text-foreground">
          What is an event forecast?
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
          Kalshi publishes a time series of the market’s implied distribution over
          an event’s continuous outcome (for example a temperature or index level).
          Each line is a percentile of that distribution at each interval—the{" "}
          <span className="text-foreground/90">50th</span> is the central
          expectation, while the outer bands (10th / 90th) sketch how wide the
          market’s priced range is. We pull the event’s natural open→close window
          and chart those percentiles immediately.
        </p>
      </div>

      <div className="space-y-2">
        <MarketTickerSearch
          value={tickersValue}
          onChange={handleTickersChange}
          onSelectionsChange={handleSelectionsChange}
          maxTickers={1}
          dataSource="live"
          searchScope="events_semantic"
          showCutoffNotes={false}
          required={false}
          placeholder="Search events in natural language — e.g. NYC high temperature tomorrow"
          className="w-full"
        />
        {selection ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{selection.title}</span>
            {selection.seriesTicker ? (
              <span className="font-mono opacity-80">{selection.seriesTicker}</span>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Pick an event to load its forecast percentile history.
          </p>
        )}
      </div>

      <div
        className={cn(
          "flex min-h-[22rem] flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/20",
          (loading || forecast) && "min-h-[28rem]",
        )}
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Forecast percentiles
            </p>
            {forecast ? (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {formatUnixRange(forecast.startTs, forecast.endTs)}
                {" · "}
                {periodLabel(forecast.periodInterval)}
                {forecast.adjustedEndTs
                  ? " · end adjusted to available history"
                  : ""}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {loading ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Loading…
              </span>
            ) : forecast ? (
              <span className="text-xs text-muted-foreground">
                {forecast.rows.length.toLocaleString()} point
                {forecast.rows.length === 1 ? "" : "s"}
              </span>
            ) : null}
            {selection ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => void loadForecast(selection)}
                className="h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground"
              >
                <RefreshCw
                  className={cn("size-3.5", loading && "animate-spin")}
                  aria-hidden
                />
                Refresh
              </Button>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">Couldn’t load forecast</p>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
              {error}
            </p>
            {selection ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => void loadForecast(selection)}
              >
                Try again
              </Button>
            ) : null}
          </div>
        ) : loading ? (
          <ChartSkeleton />
        ) : forecast ? (
          <HubKalshiLiveBonusEventForecastChart
            rows={forecast.rows}
            series={chartSeries}
            hiddenSeriesIds={hiddenSeriesIds}
            onToggleSeries={toggleSeries}
            onChangeSeriesColor={changeSeriesColor}
            className="min-h-[22rem]"
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">
              Chart an event forecast
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
              Use semantic search above to find an event. We’ll derive the time
              window from that event and plot percentile history right away.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
