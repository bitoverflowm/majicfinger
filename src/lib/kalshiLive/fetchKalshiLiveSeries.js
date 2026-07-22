/**
 * Fetch a single Kalshi Live series by ticker (via same-origin proxy).
 *
 * @param {{ seriesTicker: string; includeVolume?: boolean; signal?: AbortSignal }} opts
 */
export async function fetchKalshiLiveSeries(opts) {
  const ticker = String(opts.seriesTicker || "").trim();
  if (!ticker) throw new Error("Series ticker is required.");

  const qs = new URLSearchParams({
    series_ticker: ticker,
    // Volume column selection drives this; Kalshi defaults to false when omitted,
    // but we always send the flag so the request matches the UI checkbox.
    include_volume: opts.includeVolume ? "true" : "false",
  });

  const res = await fetch(`/api/integrations/kalshi-live/series?${qs.toString()}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal: opts.signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
          ? body.error
          : res.statusText || "Series request failed";
    throw new Error(msg);
  }

  const series = body?.series;
  if (!series || typeof series !== "object") {
    throw new Error("Kalshi returned no series data for this ticker.");
  }
  return /** @type {Record<string, unknown>} */ (series);
}

/**
 * @param {{ seriesTicker: string; includeVolume?: boolean }} opts
 */
export function summarizeKalshiLiveSeriesRequest(opts) {
  const parts = [
    `GET /series/${opts.seriesTicker}`,
    `include_volume=${opts.includeVolume ? "true" : "false"}`,
  ];
  return parts.join(" · ");
}
