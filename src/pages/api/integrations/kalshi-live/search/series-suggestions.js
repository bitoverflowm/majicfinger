import { searchKalshiLiveSeriesSuggestions } from "@/lib/kalshiLive/kalshiLiveSeriesList";

function parseBool(raw) {
  const v = String(Array.isArray(raw) ? raw[0] : raw || "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/**
 * GET /api/integrations/kalshi-live/search/series-suggestions?q=…
 * Uses Kalshi GET /series (tags, category, then broad text match).
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawQ = req.query.q;
  const q = String(Array.isArray(rawQ) ? rawQ[0] : rawQ || "").trim();
  if (q.length < 2) {
    return res.status(200).json({ suggestions: [], q });
  }

  const includeVolume = parseBool(req.query.include_volume);

  try {
    const suggestions = await searchKalshiLiveSeriesSuggestions(q, { includeVolume });
    return res.status(200).json({ suggestions, q });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Series search failed",
      suggestions: [],
      q,
    });
  }
}
