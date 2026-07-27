import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";
import { normalizeForecastApiPercentiles } from "@/lib/kalshiLive/eventForecastColumns";
import { forecastPeriodIntervalSeconds } from "@/lib/kalshiLive/eventForecastCompose";

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
 * @param {unknown} body
 */
function upstreamErrorMessage(body) {
  if (!body || typeof body !== "object") return "";
  const err = /** @type {Record<string, unknown>} */ (body).error;
  if (typeof err === "string" && err.trim()) return err.trim();
  if (err && typeof err === "object") {
    const nested = /** @type {Record<string, unknown>} */ (err).message;
    if (typeof nested === "string" && nested.trim()) return nested.trim();
  }
  const msg = /** @type {Record<string, unknown>} */ (body).message;
  if (typeof msg === "string" && msg.trim()) return msg.trim();
  const msg2 = /** @type {Record<string, unknown>} */ (body).msg;
  if (typeof msg2 === "string" && msg2.trim()) return msg2.trim();
  return "";
}

/**
 * Kalshi often returns opaque `{error:{code:"bad_request"}}` when the window
 * extends past available forecast history (unlike candlesticks' adjusted_end_ts).
 * @param {unknown} body
 * @param {number} status
 */
function isOpaqueForecastBadRequest(body, status) {
  if (status !== 400) return false;
  const msg = upstreamErrorMessage(body).toLowerCase();
  if (!msg || msg === "bad request") return true;
  const err = body && typeof body === "object" ? /** @type {any} */ (body).error : null;
  return err && typeof err === "object" && String(err.code || "") === "bad_request";
}

/**
 * @param {{
 *   seriesTicker: string;
 *   ticker: string;
 *   startTs: number;
 *   endTs: number;
 *   periodInterval: number;
 *   percentiles: number[];
 * }} params
 */
function buildUpstreamUrl(params) {
  const qs = new URLSearchParams({
    start_ts: String(params.startTs),
    end_ts: String(params.endTs),
    period_interval: String(params.periodInterval),
  });
  for (const p of params.percentiles) {
    qs.append("percentiles", String(p));
  }
  const path = `series/${encodeURIComponent(params.seriesTicker)}/events/${encodeURIComponent(
    params.ticker,
  )}/forecast_percentile_history`;
  return `${kalshiLiveUrl(path)}?${qs.toString()}`;
}

/**
 * @param {string} url
 */
async function fetchUpstream(url) {
  const upstream = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const body = await upstream.json().catch(() => ({}));
  return { status: upstream.status, body, retryAfter: upstream.headers.get("retry-after") };
}

/**
 * Binary-search the latest end_ts Kalshi will accept for this window.
 * @returns {Promise<{ ok: true; endTs: number; body: any } | { ok: false; last: { status: number; body: any; retryAfter: string | null } }>}
 */
async function findLatestValidEndTs(base) {
  const periodSec = forecastPeriodIntervalSeconds(base.periodInterval);
  const step = Number.isFinite(periodSec) ? periodSec : 60;
  let low = base.startTs + step;
  let high = base.endTs;
  if (!(low < high)) {
    return { ok: false, last: { status: 400, body: { error: "bad request" }, retryAfter: null } };
  }

  /** @type {{ status: number; body: any; retryAfter: string | null } | null} */
  let lastFail = null;
  /** @type {{ endTs: number; body: any } | null} */
  let best = null;

  // 12 probes ≈ hour resolution over multi-day spans without hammering Kalshi.
  for (let i = 0; i < 12; i++) {
    const mid = Math.floor((low + high) / 2);
    const aligned = Math.max(low, Math.floor(mid / step) * step);
    const endTs = Math.min(high, Math.max(base.startTs + step, aligned));
    const result = await fetchUpstream(
      buildUpstreamUrl({ ...base, startTs: base.startTs, endTs }),
    );
    if (result.status >= 200 && result.status < 300) {
      best = { endTs, body: result.body };
      low = endTs + step;
      if (low > high) break;
      continue;
    }
    lastFail = result;
    if (!isOpaqueForecastBadRequest(result.body, result.status)) {
      return { ok: false, last: result };
    }
    high = endTs - step;
    if (high < base.startTs + step) break;
  }

  if (best) return { ok: true, endTs: best.endTs, body: best.body };
  return {
    ok: false,
    last: lastFail || { status: 400, body: { error: "bad request" }, retryAfter: null },
  };
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

  const base = {
    seriesTicker,
    ticker,
    startTs,
    endTs: Math.max(startTs + 1, endTs),
    periodInterval,
    percentiles,
  };

  try {
    const first = await fetchUpstream(buildUpstreamUrl(base));
    if (first.status >= 200 && first.status < 300) {
      return res.status(200).json(first.body);
    }

    // Candlesticks return adjusted_end_ts; forecast returns opaque 400 instead.
    // Probe for the latest end_ts that still has forecast coverage.
    if (isOpaqueForecastBadRequest(first.body, first.status)) {
      const recovered = await findLatestValidEndTs(base);
      if (recovered.ok) {
        return res.status(200).json({
          ...recovered.body,
          adjusted_end_ts: recovered.endTs,
          requested_end_ts: base.endTs,
        });
      }
      if (recovered.last.retryAfter) {
        res.setHeader("Retry-After", recovered.last.retryAfter);
      }
      const detail = upstreamErrorMessage(recovered.last.body);
      return res.status(400).json({
        code: "FORECAST_WINDOW_UNAVAILABLE",
        error:
          "No forecast percentile history in this range. Kalshi often returns a generic bad request when end_ts is past available forecast data (or the event has none yet) — try an earlier end date.",
        upstream: detail || undefined,
      });
    }

    if (first.retryAfter) res.setHeader("Retry-After", first.retryAfter);
    const detail = upstreamErrorMessage(first.body);
    return res.status(first.status >= 400 ? first.status : 502).json({
      error: detail || "Kalshi event forecast request failed",
      code:
        first.body && typeof first.body === "object" && first.body.error?.code
          ? first.body.error.code
          : undefined,
    });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi event forecast API",
    });
  }
}
