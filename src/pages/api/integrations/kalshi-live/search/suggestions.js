import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

function scoreMatch(q, ticker, title) {
  const needle = q.toLowerCase();
  const t = String(ticker || "").toLowerCase();
  const h = String(title || "").toLowerCase();
  if (t === needle || h === needle) return 100;
  if (t.startsWith(needle)) return 80;
  if (h.includes(needle)) return 60;
  if (t.includes(needle)) return 50;
  return 0;
}

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
    const qs = new URLSearchParams({ limit: "100" });
    if (/^[A-Z0-9][A-Z0-9-]*$/i.test(q) && q.length <= 64) {
      qs.set("tickers", q.toUpperCase());
    }
    const upstream = await fetch(`${kalshiLiveUrl("markets")}?${qs.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(502).json({
        error: body?.message || body?.error || "Kalshi search failed",
      });
    }

    const markets = Array.isArray(body?.markets) ? body.markets : [];
    const needle = q.toLowerCase();
    const suggestions = markets
      .map((m) => {
        const ticker = String(m?.ticker || "").trim();
        const title = String(m?.title || m?.subtitle || ticker).trim();
        const eventTicker = String(m?.event_ticker || "").trim();
        const score = scoreMatch(needle, ticker, title);
        if (score <= 0 && !tickersExactMatch(q, ticker)) return null;
        return {
          entity: "market",
          ticker,
          title,
          eventTicker,
          status: String(m?.status || ""),
          score: tickersExactMatch(q, ticker) ? 100 : score,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ score: _s, ...rest }) => rest);

    return res.status(200).json({ suggestions, q });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Search failed",
    });
  }
}

function tickersExactMatch(q, ticker) {
  return String(ticker || "").toLowerCase() === String(q || "").toLowerCase();
}
