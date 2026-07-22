import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

/**
 * GET /api/integrations/kalshi-live/search/tags-by-categories
 * Proxies Kalshi GET /search/tags_by_categories.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const url = kalshiLiveUrl("search/tags_by_categories");

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status >= 400 ? upstream.status : 502).json(body);
    }
    return res.status(200).json(body);
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi tags_by_categories API",
      tags_by_categories: {},
    });
  }
}
