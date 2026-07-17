import { fetchKalshiEmbeddingSearchSuggestions } from "@/lib/kalshiLive/kalshiLiveEmbeddingSearch";

/**
 * GET /api/integrations/kalshi-live/search/embedding-suggestions?q=…
 * Proxies Kalshi elections embedding search (no auth).
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawQ = req.query.q;
  const q = String(Array.isArray(rawQ) ? rawQ[0] : rawQ || "").trim();

  try {
    const result = await fetchKalshiEmbeddingSearchSuggestions(q);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Embedding search failed",
      suggestions: [],
      q,
    });
  }
}
