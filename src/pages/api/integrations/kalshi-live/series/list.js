import { fetchKalshiLiveSeriesListUpstream } from "@/lib/kalshiLive/kalshiLiveSeriesList";

function parseBool(raw) {
  const v = String(Array.isArray(raw) ? raw[0] : raw || "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function queryParam(req, name) {
  const raw = req.query[name];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

/**
 * GET /api/integrations/kalshi-live/series/list
 * Proxy to Kalshi GET /series with optional category, tags, include_volume, etc.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const category = queryParam(req, "category");
  const tags = queryParam(req, "tags");
  const includeVolume = parseBool(req.query.include_volume);
  const includeProductMetadata = parseBool(req.query.include_product_metadata);
  const minUpdatedTs = queryParam(req, "min_updated_ts");

  const params = {};
  if (category) params.category = category;
  if (tags) params.tags = tags;
  if (includeVolume) params.include_volume = true;
  if (includeProductMetadata) params.include_product_metadata = true;
  if (minUpdatedTs) params.min_updated_ts = minUpdatedTs;

  try {
    const series = await fetchKalshiLiveSeriesListUpstream(params);
    return res.status(200).json({ series });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi series list API",
    });
  }
}
