import { buildKalshiLiveEventsDiscoveryQueryParams } from "@/lib/kalshiLive/eventDiscovery";
import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

function queryParam(req, name) {
  const raw = req.query[name];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

function parseUnixParam(req, name) {
  const raw = queryParam(req, name);
  if (!raw) return "";
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : "";
}

/**
 * Proxy GET /events (list / discovery).
 * @see https://docs.kalshi.com/api-reference/events/get-events
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cursor = queryParam(req, "cursor");
  const rawLimit = queryParam(req, "limit");
  const limit = rawLimit ? Number(rawLimit) : 200;

  let params;
  try {
    params = buildKalshiLiveEventsDiscoveryQueryParams(
      {
        status: queryParam(req, "status"),
        seriesTicker: queryParam(req, "series_ticker"),
        tickers: queryParam(req, "tickers"),
        minCloseTs: parseUnixParam(req, "min_close_ts"),
        minUpdatedTs: parseUnixParam(req, "min_updated_ts"),
      },
      {
        limit,
        withNestedMarkets:
          queryParam(req, "with_nested_markets") === "1" ||
          queryParam(req, "with_nested_markets") === "true",
        withMilestones:
          queryParam(req, "with_milestones") === "1" ||
          queryParam(req, "with_milestones") === "true",
      },
    );
  } catch (e) {
    return res.status(400).json({
      error: e instanceof Error ? e.message : "Invalid filters",
    });
  }

  if (cursor) params.cursor = cursor;

  const qs = new URLSearchParams(params);
  const url = `${kalshiLiveUrl("events")}?${qs.toString()}`;

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
          body?.message || body?.error || upstream.statusText || "Kalshi events request failed",
        ...body,
      });
    }
    return res.status(200).json(body);
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi events API",
    });
  }
}
