import { rejectIfAnonymousRateLimited } from "@/lib/kalshiLive/anonymousIpRateLimit";
import { deskAndMarketFromQuery } from "@/lib/warRoom/href";
import { getWarRoomMarket, snapshotCacheControl } from "@/lib/warRoom/serving";

/**
 * GET /api/war-room/markets/:id
 * Rules, latest quote, chronological signals, research links, source status.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (
    rejectIfAnonymousRateLimited(req, res, {
      keyPrefix: "war-room-market",
      max: 60,
      windowMs: 60_000,
    })
  ) {
    return;
  }

  const rawId = req.query.id;
  const id = decodeURIComponent(String(Array.isArray(rawId) ? rawId[0] : rawId || "").trim());
  const { fixture } = deskAndMarketFromQuery(req.query);

  if (!id) {
    return res.status(400).json({ error: "market id is required", status: "invalid_id" });
  }

  try {
    const detail = await getWarRoomMarket(id, { forceFixture: fixture });
    const status = detail.status === "not_found" || detail.status === "invalid_id" ? 404 : 200;
    res.setHeader("Cache-Control", detail.fixture ? "private, no-store" : snapshotCacheControl());
    return res.status(status).json(detail);
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : "Failed to load market",
      status: "empty",
    });
  }
}
