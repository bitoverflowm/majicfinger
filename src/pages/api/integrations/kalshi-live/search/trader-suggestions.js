import { searchKalshiLiveTraderSuggestions } from "@/lib/kalshiLive/kalshiLiveTraderSuggestions";

/**
 * GET /api/integrations/kalshi-live/search/trader-suggestions?q=…
 * Nickname prefix search + parallel public metrics for suggestion rows.
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

  try {
    const suggestions = await searchKalshiLiveTraderSuggestions(q, { limit: 8 });
    return res.status(200).json({ suggestions, q });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Trader search failed",
      suggestions: [],
      q,
    });
  }
}
