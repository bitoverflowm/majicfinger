/**
 * GET /api/data-lake/kalshi-search/suggestions?q=…
 * Typeahead search across Kalshi markets and trades (Athena).
 */
import { fetchKalshiSearchSuggestions } from "@/lib/dataLake/kalshiSearchSuggestions";
import { getAthenaAccessFromRequest } from "@/lib/athenaAccess";

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed", code: "METHOD" });
  }

  const rawQ = req.query.q;
  const q = String(Array.isArray(rawQ) ? rawQ[0] : rawQ || "").trim();
  const rawMode = req.query.mode;
  const mode = String(Array.isArray(rawMode) ? rawMode[0] : rawMode || "").trim();
  if (q.length < 2) {
    return res.status(200).json({ suggestions: [] });
  }

  try {
    await getAthenaAccessFromRequest(req);
    const { suggestions } = await fetchKalshiSearchSuggestions(q, {
      mode: mode === "trade_search" || mode === "market_search" ? mode : "all",
    });
    return res.status(200).json({ suggestions, q, mode: mode || "all" });
  } catch (e) {
    const code = e?.code || "INTERNAL";
    if (code === "CONFIG") {
      return res.status(503).json({ error: e.message || "Athena not configured", code: "CONFIG" });
    }
    if (code === "ATHENA_FAILED" || code === "TIMEOUT") {
      return res.status(502).json({
        error: e.message || "Search query failed",
        code,
      });
    }
    if (code === "BAD_REQUEST") {
      return res.status(400).json({ error: e.message || "Invalid search request", code: "BAD_REQUEST" });
    }
    return res.status(500).json({ error: e?.message || "Internal error", code: "INTERNAL" });
  }
}
