/**
 * Fetch a single Kalshi Live event by ticker (via same-origin proxy).
 *
 * @param {{
 *   eventTicker: string;
 *   withNestedMarkets?: boolean;
 *   signal?: AbortSignal;
 * }} opts
 * @returns {Promise<{
 *   event: Record<string, unknown>;
 *   markets: unknown[];
 * }>}
 */
export async function fetchKalshiLiveEvent(opts) {
  const ticker = String(opts.eventTicker || "").trim();
  if (!ticker) throw new Error("Event ticker is required.");

  const qs = new URLSearchParams({ ticker });
  if (opts.withNestedMarkets) qs.set("with_nested_markets", "true");

  const res = await fetch(`/api/integrations/kalshi-live/events/get?${qs.toString()}`, {
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
          : res.statusText || "Event request failed";
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

  const event = body?.event;
  if (!event || typeof event !== "object") {
    throw new Error("Kalshi returned no event data for this ticker.");
  }
  const markets = Array.isArray(body?.markets) ? body.markets : [];
  return {
    event: /** @type {Record<string, unknown>} */ (event),
    markets,
  };
}
