import { rejectIfAnonymousRateLimited } from "@/lib/kalshiLive/anonymousIpRateLimit";
import { fetchKalshiLiveFeaturedMarkets } from "@/lib/kalshiLive/fetchKalshiLiveFeaturedMarkets";

/**
 * GET /api/integrations/kalshi-live/markets/featured?limit=5
 * Highest-volume live markets for marketing / hub demos (cached server-side).
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

  const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const limit = rawLimit ? Number(rawLimit) : 5;

  try {
    const markets = await fetchKalshiLiveFeaturedMarkets({ limit });
    res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
    return res.status(200).json({ markets });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to load featured markets",
      markets: [],
    });
  }
}
