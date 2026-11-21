import { rejectIfAnonymousRateLimited } from "@/lib/kalshiLive/anonymousIpRateLimit";
import { deskAndMarketFromQuery } from "@/lib/warRoom/href";
import { getWarRoomSnapshot, snapshotCacheControl } from "@/lib/warRoom/serving";

/**
 * GET /api/war-room/snapshot?desk=&market=&cursor=&mobile=1
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (
    rejectIfAnonymousRateLimited(req, res, {
      keyPrefix: "war-room-snapshot",
      max: 60,
      windowMs: 60_000,
    })
  ) {
    return;
  }

  const { desk, market, fixture } = deskAndMarketFromQuery(req.query);
  const cursor = String(Array.isArray(req.query.cursor) ? req.query.cursor[0] : req.query.cursor || "").trim();
  const mobile = ["1", "true"].includes(String(req.query.mobile || "").toLowerCase());

  try {
    const snapshot = await getWarRoomSnapshot({
      desk,
      market,
      cursor,
      mobile,
      forceFixture: fixture,
    });
    res.setHeader("Cache-Control", snapshot.fixture ? "private, no-store" : snapshotCacheControl());
    return res.status(200).json(snapshot);
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : "Failed to load War Room snapshot",
      status: "empty",
      feed: [],
      features: { type: "FeatureCollection", features: [] },
    });
  }
}
