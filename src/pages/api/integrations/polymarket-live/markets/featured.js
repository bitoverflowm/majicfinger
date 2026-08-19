import { rejectIfAnonymousRateLimited } from "@/lib/kalshiLive/anonymousIpRateLimit";
import { fetchPolymarketLiveFeaturedMarkets } from "@/lib/polymarketLive/fetchPolymarketLiveFeaturedMarkets";

/**
 * GET /api/integrations/polymarket-live/markets/featured?limit=8
 * Highest-volume / featured live markets for marketing / hub demos.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (
    rejectIfAnonymousRateLimited(req, res, {
      keyPrefix: "polymarket-live-featured",
      max: 20,
      windowMs: 60_000,
    })
  ) {
    return;
  }

  const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const limit = rawLimit ? Number(rawLimit) : 8;
  const rawExclude = Array.isArray(req.query.exclude)
    ? req.query.exclude.join(",")
    : req.query.exclude;
  const excludeIds = String(rawExclude || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  try {
    const markets = await fetchPolymarketLiveFeaturedMarkets({ limit, excludeIds });
    res.setHeader(
      "Cache-Control",
      excludeIds.length
        ? "private, no-store"
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
