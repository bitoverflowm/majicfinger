import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

function queryParam(req, name) {
  const raw = req.query[name];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

function parseIntParam(req, name) {
  const n = Math.floor(Number(queryParam(req, name)));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Proxy GET /series/{series_ticker}/events/{ticker}/candlesticks — Get Event Candlesticks.
 * Returns aggregated candlesticks across every market in a single event.
 * @see https://docs.kalshi.com/api-reference/events/get-event-candlesticks
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ticker = queryParam(req, "ticker") || queryParam(req, "event_ticker");
  const seriesTicker = queryParam(req, "series_ticker");
  const startTs = parseIntParam(req, "start_ts");
  const endTs = parseIntParam(req, "end_ts");
  const periodInterval = parseIntParam(req, "period_interval");

  if (!ticker) {
    return res.status(400).json({ error: "ticker is required", code: "BAD_REQUEST" });
  }
  if (!seriesTicker) {
    return res.status(400).json({ error: "series_ticker is required", code: "BAD_REQUEST" });
  }
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) {
    return res.status(400).json({ error: "start_ts and end_ts are required", code: "BAD_REQUEST" });
  }
  if (![1, 60, 1440].includes(periodInterval)) {
    return res.status(400).json({
      error: "period_interval must be 1, 60, or 1440",
      code: "BAD_REQUEST",
    });
  }

  const qs = new URLSearchParams({
    start_ts: String(startTs),
    end_ts: String(endTs),
    period_interval: String(periodInterval),
  });
  const path = `series/${encodeURIComponent(seriesTicker)}/events/${encodeURIComponent(
    ticker,
  )}/candlesticks`;
  const url = `${kalshiLiveUrl(path)}?${qs.toString()}`;

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const retryAfter = upstream.headers.get("retry-after");
      if (retryAfter) res.setHeader("Retry-After", retryAfter);
      return res.status(upstream.status >= 400 ? upstream.status : 502).json({
        error:
          typeof body?.message === "string"
            ? body.message
            : typeof body?.error === "string"
              ? body.error
              : upstream.statusText || "Kalshi event candlesticks request failed",
        ...body,
      });
    }
    return res.status(200).json(body);
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi event candlesticks API",
    });
  }
}
