import {
  partitionEventForecastApiParams,
  resolveForecastApiPercentilesFromDisplay,
  summarizeKalshiLiveEventForecastRequest,
  validateKalshiLiveEventForecastPull,
} from "@/lib/kalshiLive/eventForecastCompose";
import { inferSeriesTickerFromEvent } from "@/lib/kalshiLive/eventCandlesticksCompose";
import { parseKalshiLiveEventForecastTicker } from "@/lib/kalshiLive/eventForecastCompose";
import { projectKalshiLiveEventForecastRows } from "@/lib/kalshiLive/normalizeEventForecastRow";

/**
 * Pull event forecast percentile history for one event.
 *
 * @param {{
 *   eventTicker: string;
 *   seriesTicker?: string;
 *   whereFilters?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[];
 *   percentilePcts?: number[];
 *   selectedColumns?: string[];
 *   signal?: AbortSignal;
 *   onProgress?: (info: { label: string; progress: number }) => void;
 * }} opts
 */
export async function fetchKalshiLiveEventForecastPull(opts) {
  const whereFilters = Array.isArray(opts.whereFilters) ? opts.whereFilters : [];
  const err = validateKalshiLiveEventForecastPull(
    opts.eventTicker,
    opts.seriesTicker || "",
    whereFilters,
    opts.percentilePcts,
  );
  if (err) throw new Error(err);

  const eventTicker = parseKalshiLiveEventForecastTicker(opts.eventTicker);
  const seriesTicker =
    parseKalshiLiveEventForecastTicker(opts.seriesTicker || "") ||
    inferSeriesTickerFromEvent(eventTicker);

  const { apiParams } = partitionEventForecastApiParams(whereFilters);
  const percentiles = resolveForecastApiPercentilesFromDisplay(opts.percentilePcts);

  if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  opts.onProgress?.({ label: `Fetching forecast for ${eventTicker}…`, progress: 20 });

  const qs = new URLSearchParams({
    ticker: eventTicker,
    series_ticker: seriesTicker,
    start_ts: String(apiParams.start_ts),
    end_ts: String(apiParams.end_ts),
    period_interval: String(apiParams.period_interval),
  });
  for (const p of percentiles) {
    qs.append("percentiles", String(p));
  }

  const res = await fetch(
    `/api/integrations/kalshi-live/events/forecast-percentile-history?${qs.toString()}`,
    {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: opts.signal,
    },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : typeof body?.message === "string"
          ? body.message
          : res.statusText || "Event forecast request failed",
    );
  }

  const history = Array.isArray(body?.forecast_history) ? body.forecast_history : [];
  opts.onProgress?.({ label: "Projecting forecast rows…", progress: 80 });

  const rows = projectKalshiLiveEventForecastRows(history, opts.selectedColumns);

  return {
    raw: history,
    rows,
    percentiles,
    eventTicker,
    seriesTicker,
    querySummary: summarizeKalshiLiveEventForecastRequest(
      eventTicker,
      seriesTicker,
      apiParams,
      percentiles,
      { loadedRowCount: rows.length },
    ),
  };
}
