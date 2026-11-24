import { rejectIfAnonymousRateLimited } from "@/lib/kalshiLive/anonymousIpRateLimit";
import { deskAndMarketFromQuery } from "@/lib/warRoom/href";
import { getWarRoomPreview, previewCacheControl } from "@/lib/warRoom/serving";

/**
 * GET /api/war-room/preview
 * Public CDN-cacheable homepage stories (max 3). Independent of auth.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (
    rejectIfAnonymousRateLimited(req, res, {
      keyPrefix: "war-room-preview",
      max: 60,
      windowMs: 60_000,
    })
  ) {
    return;
  }

  const { fixture } = deskAndMarketFromQuery(req.query);
  try {
    const preview = await getWarRoomPreview({ forceFixture: fixture });
    res.setHeader("Cache-Control", preview.fixture ? "private, no-store" : previewCacheControl());
    return res.status(200).json(preview);
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : "Failed to load War Room preview",
      stories: [],
      status: "empty",
    });
  }
}
