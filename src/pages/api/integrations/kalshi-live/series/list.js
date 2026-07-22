import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

function parseBool(raw) {
  const v = String(Array.isArray(raw) ? raw[0] : raw || "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function firstQuery(raw) {
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

/**
 * GET /api/integrations/kalshi-live/series/list
 * Proxies Kalshi GET /series (series list / discovery).
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const qs = new URLSearchParams();
  const category = firstQuery(req.query.category);
  const tags = firstQuery(req.query.tags);
  if (category) qs.set("category", category);
  if (tags) qs.set("tags", tags);

  qs.set("include_volume", parseBool(req.query.include_volume) ? "true" : "false");
  qs.set(
    "include_product_metadata",
    parseBool(req.query.include_product_metadata) ? "true" : "false",
  );

  const minUpdated = firstQuery(req.query.min_updated_ts);
  if (minUpdated && Number.isFinite(Number(minUpdated))) {
    qs.set("min_updated_ts", String(Math.floor(Number(minUpdated))));
  }

  const url = `${kalshiLiveUrl("series")}?${qs.toString()}`;

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const retryAfter = upstream.headers.get("Retry-After");
      if (retryAfter) res.setHeader("Retry-After", retryAfter);
      return res.status(upstream.status >= 400 ? upstream.status : 502).json(body);
    }
    return res.status(200).json(body);
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi series list API",
    });
  }
}
