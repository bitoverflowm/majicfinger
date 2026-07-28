import {
  KALSHI_LIVE_SEARCH_TRADERS_PAGE_SIZE_MAX,
  normalizeKalshiLiveSearchTradersQuery,
} from "@/lib/kalshiLive/searchTradersColumns";
import { KALSHI_LIVE_SOCIAL_API_BASE } from "@/lib/kalshiLive/kalshiLiveApiBase";

function queryParam(req, name) {
  const raw = req.query[name];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

/**
 * Proxy GET /v1/search/social_profiles (elections API host).
 * One page per request — client follows cursor for multi-page pulls.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = normalizeKalshiLiveSearchTradersQuery(queryParam(req, "query"));
  const cursor = queryParam(req, "cursor");
  const limitRaw = Number(queryParam(req, "limit"));
  const limit = Math.min(
    KALSHI_LIVE_SEARCH_TRADERS_PAGE_SIZE_MAX,
    Math.max(1, Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.floor(limitRaw) : 25),
  );

  if (!query) {
    return res.status(400).json({ error: "query is required" });
  }

  const qs = new URLSearchParams({
    query,
    limit: String(limit),
  });
  if (cursor) qs.set("cursor", cursor);

  // Search lives under /v1/search/… (sibling of /v1/social/…).
  const base = String(KALSHI_LIVE_SOCIAL_API_BASE).replace(/\/$/, "");
  const url = `${base}/search/social_profiles?${qs.toString()}`;

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
      const nested =
        body?.error && typeof body.error === "object" ? body.error.message : null;
      const details =
        body?.error && typeof body.error === "object" ? body.error.details : null;
      return res.status(upstream.status >= 400 ? upstream.status : 502).json({
        error:
          typeof nested === "string"
            ? nested
            : typeof body?.message === "string"
              ? body.message
              : typeof body?.error === "string"
                ? body.error
                : upstream.statusText || "Kalshi trader search request failed",
        details: typeof details === "string" ? details : undefined,
      });
    }

    return res.status(200).json({
      profiles: Array.isArray(body?.profiles) ? body.profiles : [],
      cursor: typeof body?.cursor === "string" ? body.cursor : "",
      limit,
      query,
    });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi trader search API",
    });
  }
}
