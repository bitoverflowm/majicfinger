/**
 * GET /api/integrations/kalshi-live/search/series-suggestions?q=…
 * Ticker-only typeahead for Series (no list endpoint yet).
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawQ = req.query.q;
  const q = String(Array.isArray(rawQ) ? rawQ[0] : rawQ || "").trim();
  if (q.length < 1) {
    return res.status(200).json({ suggestions: [], q });
  }

  const tickerLike = /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(q);
  if (!tickerLike) {
    return res.status(200).json({ suggestions: [], q });
  }

  const suggestions = [
    {
      entity: "series",
      ticker: q.toUpperCase(),
      title: q.toUpperCase(),
    },
  ];

  return res.status(200).json({ suggestions, q });
}
