import {
  KALSHI_LIVE_HOLDER_TRADES_PAGE_SIZE_MAX,
  normalizeKalshiLiveHolderTradesLimit,
  normalizeKalshiLiveHolderTradesMinAmount,
} from "@/lib/kalshiLive/holderTradesColumns";
import { kalshiLiveSocialUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

function queryParam(req, name) {
  const raw = req.query[name];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

/**
 * Proxy GET /v1/social/trades (elections social API host).
 * One page per request — client follows cursor for multi-page pulls.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const nickname = queryParam(req, "nickname");
  const seriesTicker = queryParam(req, "series_ticker");
  const eventTicker = queryParam(req, "event_ticker");
  const cursor = queryParam(req, "cursor");
  const minAmount = normalizeKalshiLiveHolderTradesMinAmount(queryParam(req, "min_amount"));
  const pageSizeRaw = queryParam(req, "page_size") || queryParam(req, "limit");
  const pageSize = Math.min(
    KALSHI_LIVE_HOLDER_TRADES_PAGE_SIZE_MAX,
    Math.max(1, normalizeKalshiLiveHolderTradesLimit(pageSizeRaw || 100)),
  );

  const qs = new URLSearchParams({ page_size: String(pageSize) });
  if (nickname) qs.set("nickname", nickname);
  if (seriesTicker) qs.set("series_ticker", seriesTicker);
  if (eventTicker) qs.set("event_ticker", eventTicker);
  if (minAmount != null) qs.set("min_amount", String(minAmount));
  if (cursor) qs.set("cursor", cursor);

  const url = `${kalshiLiveSocialUrl("social/trades")}?${qs.toString()}`;

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
                : upstream.statusText || "Kalshi holder trades request failed",
        details: typeof details === "string" ? details : undefined,
      });
    }

    return res.status(200).json({
      trades: Array.isArray(body?.trades) ? body.trades : [],
      cursor: typeof body?.cursor === "string" ? body.cursor : "",
      visibility_state:
        typeof body?.visibility_state === "string" ? body.visibility_state : "",
      page_size: pageSize,
    });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi social trades API",
    });
  }
}
