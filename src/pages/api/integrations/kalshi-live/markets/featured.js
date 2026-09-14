import { rejectIfAnonymousRateLimited } from "@/lib/kalshiLive/anonymousIpRateLimit";
import {
  fetchKalshiLiveDiscoveryFeaturedMarkets,
  fetchKalshiLiveFeaturedMarkets,
} from "@/lib/kalshiLive/fetchKalshiLiveFeaturedMarkets";

/**
 * GET /api/integrations/kalshi-live/markets/featured?limit=5
 * Highest-volume live markets for marketing / hub demos (cached server-side).
 *
 * `source=discovery` — one GET /markets page per 24h, ranked featured-then-volume
 * (used by the Kalshi vs Polymarket compare landing).
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (
    rejectIfAnonymousRateLimited(req, res, {
      keyPrefix: "kalshi-live-featured",
      max: 20,
      windowMs: 60_000,
    })
  ) {
    return;
  }

  const source = String(
    Array.isArray(req.query.source) ? req.query.source[0] : req.query.source || "",
  )
    .trim()
    .toLowerCase();
  const isDiscovery = source === "discovery";

  const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const limit = rawLimit ? Number(rawLimit) : isDiscovery ? 10 : 5;
  const rawExclude = Array.isArray(req.query.exclude)
    ? req.query.exclude.join(",")
    : req.query.exclude;
  const excludeTickers = String(rawExclude || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  try {
    const markets = isDiscovery
      ? await fetchKalshiLiveDiscoveryFeaturedMarkets({ limit, excludeTickers })
      : await fetchKalshiLiveFeaturedMarkets({ limit, excludeTickers });
    res.setHeader(
      "Cache-Control",
      excludeTickers.length
        ? "private, no-store"
        : isDiscovery
          ? "public, s-maxage=86400, stale-while-revalidate=3600"
          : "public, s-maxage=120, stale-while-revalidate=300",
    );
    return res.status(200).json({ markets });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to load featured markets",
      markets: [],
    });
  }
}
