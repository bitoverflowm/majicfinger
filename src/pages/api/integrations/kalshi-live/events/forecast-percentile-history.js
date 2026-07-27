import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";
import { normalizeForecastApiPercentiles } from "@/lib/kalshiLive/eventForecastColumns";

function queryParam(req, name) {
  const raw = req.query[name];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

function parseIntParam(req, name) {
  const n = Math.floor(Number(queryParam(req, name)));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Read repeated `percentiles` query params (form explode) or a comma-separated list.
 * @param {import("next").NextApiRequest} req
 */
function parsePercentiles(req) {
  const raw = req.query.percentiles;
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(/[,\s]+/)
      : [];
  return normalizeForecastApiPercentiles(list);
}

/**
 * Proxy GET /series/{series_ticker}/events/{ticker}/forecast_percentile_history.
 * Auth is not required despite the OpenAPI security block.
 * @see https://docs.kalshi.com/api-reference/events/get-event-forecast-percentile-history
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
  const percentiles = parsePercentiles(req);

  if (!ticker) {
    return res.status(400).json({ error: "ticker is required", code: "BAD_REQUEST" });
  }
  if (!seriesTicker) {
    return res.status(400).json({ error: "series_ticker is required", code: "BAD_REQUEST" });
  }
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) {
    return res.status(400).json({ error: "start_ts and end_ts are required", code: "BAD_REQUEST" });
  }
  if (![0, 1, 60, 1440].includes(periodInterval)) {
    return res.status(400).json({
      error: "period_interval must be 0 (5s), 1, 60, or 1440",
      code: "BAD_REQUEST",
    });
  }
  if (!percentiles.length) {
    return res.status(400).json({
      error: "percentiles is required (1–10 values between 0 and 9999)",
      code: "BAD_REQUEST",
    });
  }

  const qs = new URLSearchParams({
    start_ts: String(startTs),
    end_ts: String(endTs),
    period_interval: String(periodInterval),
  });
  for (const p of percentiles) {
    qs.append("percentiles", String(p));
  }

  const path = `series/${encodeURIComponent(seriesTicker)}/events/${encodeURIComponent(
    ticker,
  )}/forecast_percentile_history`;
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
              : upstream.statusText || "Kalshi event forecast request failed",
        ...body,
      });
    }
    return res.status(200).json(body);
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi event forecast API",
    });
  }
}
