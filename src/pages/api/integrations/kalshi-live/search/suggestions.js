import { rejectIfAnonymousRateLimited } from "@/lib/kalshiLive/anonymousIpRateLimit";
import { fetchKalshiLiveSearchSuggestions } from "@/lib/kalshiLive/kalshiLiveSearchSuggestions";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (
    rejectIfAnonymousRateLimited(req, res, {
      keyPrefix: "kalshi-live-search",
      max: 30,
      windowMs: 60_000,
    })
  ) {
    return;
  }

  const rawQ = req.query.q;
  const q = String(Array.isArray(rawQ) ? rawQ[0] : rawQ || "").trim();
  if (q.length < 2) {
    return res.status(200).json({ suggestions: [], q });
  }

  const rawLimit = req.query.limit;
  const rawCursor = req.query.cursor;
  const limitParam = String(Array.isArray(rawLimit) ? rawLimit[0] : rawLimit || "").trim();
  const cursorParam = String(Array.isArray(rawCursor) ? rawCursor[0] : rawCursor || "").trim();

  try {
    if (limitParam || cursorParam) {
      const limit = Math.min(40, Math.max(1, Math.floor(Number(limitParam) || 20)));
      const { suggestions, cursor, hasMore } = await fetchKalshiLiveSearchSuggestions(q, {
        limit,
        cursor: cursorParam,
      });
      return res.status(200).json({
        suggestions,
        q,
        cursor: cursor || "",
        hasMore: !!hasMore,
      });
    }
    const { suggestions } = await fetchKalshiLiveSearchSuggestions(q);
    return res.status(200).json({ suggestions, q });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Search failed",
    });
  }
}
