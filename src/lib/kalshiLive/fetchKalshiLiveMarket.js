/**
 * Fetch a single Kalshi Live market by ticker (via same-origin proxy).
 *
 * @param {{ marketTicker: string; signal?: AbortSignal }} opts
 * @returns {Promise<Record<string, unknown>>}
 */
export async function fetchKalshiLiveMarket(opts) {
  const ticker = String(opts.marketTicker || "").trim();
  if (!ticker) throw new Error("Market ticker is required.");

  const qs = new URLSearchParams({ ticker });
  const res = await fetch(`/api/integrations/kalshi-live/markets/get?${qs.toString()}`, {
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
          : res.statusText || "Market request failed";
    const err = new Error(msg);
    // @ts-expect-error status for rate-limit retry helpers
    err.status = res.status;
    const retryAfter = Number(res.headers.get("retry-after"));
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      // @ts-expect-error retryAfterMs for rate-limit retry helpers
      err.retryAfterMs = retryAfter * 1000;
    }
    throw err;
  }

  const market = body?.market;
  if (!market || typeof market !== "object") {
    throw new Error("Kalshi returned no market data for this ticker.");
  }
  return /** @type {Record<string, unknown>} */ (market);
}
