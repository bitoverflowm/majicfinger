import { buildKalshiLiveMultivariateEventsDiscoveryQueryParams } from "@/lib/kalshiLive/multivariateEventsDiscovery";
import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

function queryParam(req, name) {
  const raw = req.query[name];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

/**
 * Proxy GET /events/multivariate (combo / multivariate event discovery).
 * @see https://docs.kalshi.com/api-reference/events/get-multivariate-events
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cursor = queryParam(req, "cursor");
  const rawLimit = queryParam(req, "limit");
  const limit = rawLimit ? Number(rawLimit) : 100;

  const seriesTicker = queryParam(req, "series_ticker");
  const collectionTicker = queryParam(req, "collection_ticker");
  if (seriesTicker && collectionTicker) {
    return res.status(400).json({
      error: "series_ticker and collection_ticker cannot be used together.",
    });
  }

  let params;
  try {
    params = buildKalshiLiveMultivariateEventsDiscoveryQueryParams(
      {
        seriesTicker,
        collectionTicker,
      },
      {
        limit,
        withNestedMarkets:
          queryParam(req, "with_nested_markets") === "1" ||
          queryParam(req, "with_nested_markets") === "true",
      },
    );
  } catch (e) {
    return res.status(400).json({
      error: e instanceof Error ? e.message : "Invalid filters",
    });
  }

  if (cursor) params.cursor = cursor;

  const qs = new URLSearchParams(params);
  const url = `${kalshiLiveUrl("events/multivariate")}?${qs.toString()}`;

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
          body?.message ||
          body?.error ||
          upstream.statusText ||
          "Kalshi multivariate events request failed",
        ...body,
      });
    }
    return res.status(200).json(body);
  } catch (e) {
    return res.status(502).json({
      error:
        e instanceof Error ? e.message : "Failed to reach Kalshi multivariate events API",
    });
  }
}
