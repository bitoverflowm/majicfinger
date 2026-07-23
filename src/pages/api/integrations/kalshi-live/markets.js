import { buildKalshiLiveMarketsDiscoveryQueryParams } from "@/lib/kalshiLive/marketDiscovery";
import { buildKalshiLiveMarketsQueryParams } from "@/lib/kalshiLive/marketFilterRules";
import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

function queryParam(req, name) {
  const raw = req.query[name];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

function parseFiltersParam(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseUnixParam(req, name) {
  const raw = queryParam(req, name);
  if (!raw) return "";
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : "";
}

/**
 * Proxy GET /markets (list). Supports:
 * - Legacy: filters JSON + tickers + limit + cursor
 * - Discovery: status, event_ticker, series_ticker, mve_filter, tickers, timestamp filters
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cursor = queryParam(req, "cursor");
  const discovery = queryParam(req, "discovery") === "1" || queryParam(req, "discovery") === "true";

  let params;
  try {
    if (discovery) {
      const rawLimit = queryParam(req, "limit");
      const limit = rawLimit ? Number(rawLimit) : 1000;
      params = buildKalshiLiveMarketsDiscoveryQueryParams(
        {
          status: queryParam(req, "status"),
          mveFilter: queryParam(req, "mve_filter") || "exclude",
          eventTicker: queryParam(req, "event_ticker"),
          seriesTicker: queryParam(req, "series_ticker"),
          tickers: queryParam(req, "tickers"),
          minCreatedTs: parseUnixParam(req, "min_created_ts"),
          maxCreatedTs: parseUnixParam(req, "max_created_ts"),
          minUpdatedTs: parseUnixParam(req, "min_updated_ts"),
          minCloseTs: parseUnixParam(req, "min_close_ts"),
          maxCloseTs: parseUnixParam(req, "max_close_ts"),
          minSettledTs: parseUnixParam(req, "min_settled_ts"),
          maxSettledTs: parseUnixParam(req, "max_settled_ts"),
        },
        { limit },
      );
    } else {
      const filters = parseFiltersParam(queryParam(req, "filters") || req.query.filters);
      const rawLimit = queryParam(req, "limit");
      const limit = rawLimit ? Number(rawLimit) : undefined;
      const tickers = queryParam(req, "tickers");
      params = buildKalshiLiveMarketsQueryParams(filters, { limit, tickers });
    }
  } catch (e) {
    return res.status(400).json({
      error: e instanceof Error ? e.message : "Invalid filters",
    });
  }

  if (cursor) params.cursor = cursor;

  const qs = new URLSearchParams(params);
  const url = `${kalshiLiveUrl("markets")}?${qs.toString()}`;

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
          body?.message || body?.error || upstream.statusText || "Kalshi markets request failed",
        ...body,
      });
    }
    return res.status(200).json(body);
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi markets API",
    });
  }
}
