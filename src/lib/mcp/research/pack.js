import { parseResearchIntent } from "./intent.js";
import { gateResearchPack } from "./gate.js";
import { formatXReply } from "./formatX.js";
import { compactSearchQuery, relevanceScore } from "./relevance.js";
import { jarvisPulse } from "@/lib/mcp/data/jarvis";
import {
  getLookalikeMarkets,
  getPolymarketHolders,
  getPolymarketTrader,
  searchKalshi,
  searchPolymarket,
} from "@/lib/mcp/data/providers";
import { compareVenues } from "@/lib/mcp/data/compareVenues";
import { analyzeHolders } from "@/lib/mcp/data/stats";
import { searchNewsHeadlines } from "@/lib/mcp/data/news";

function yesPrice(row) {
  const prices = row?.outcome_prices;
  if (Array.isArray(prices) && prices.length) {
    const n = Number(prices[0]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asMarket(row, query, venueHint) {
  const venue = row?.venue || venueHint || (row?.condition_id ? "polymarket" : "kalshi");
  const title = String(row?.title || row?.question || "").trim();
  return {
    venue,
    title,
    ticker: row?.ticker || null,
    condition_id: row?.condition_id || null,
    slug: row?.slug || null,
    event_slug: row?.event_slug || null,
    yes_price: yesPrice(row),
    volume_24h: row?.volume_24h ?? null,
    relevance: relevanceScore(query, title),
    url:
      venue === "kalshi" && row?.ticker
        ? `https://kalshi.com/markets/${encodeURIComponent(row.ticker)}`
        : row?.event_slug
          ? `https://polymarket.com/event/${row.event_slug}`
          : row?.slug
            ? `https://polymarket.com/market/${row.slug}`
            : null,
  };
}

async function searchBoth(query, limit = 6) {
  const q = compactSearchQuery(query);
  if (q.length < 2) return { kalshi: [], polymarket: [] };
  const [k, p] = await Promise.allSettled([searchKalshi(q, { limit }), searchPolymarket(q, { limit })]);
  return {
    kalshi: k.status === "fulfilled" && Array.isArray(k.value) ? k.value : [],
    polymarket: p.status === "fulfilled" && Array.isArray(p.value) ? p.value : [],
  };
}

function rankMarkets(query, kalshi, polymarket) {
  const rows = [
    ...kalshi.map((r) => asMarket(r, query, "kalshi")),
    ...polymarket.map((r) => asMarket(r, query, "polymarket")),
  ].filter((m) => m.title);
  rows.sort((a, b) => {
    const rel = (b.relevance || 0) - (a.relevance || 0);
    if (Math.abs(rel) > 0.04) return rel;
    return (Number(b.volume_24h) || 0) - (Number(a.volume_24h) || 0);
  });
  return rows;
}

function pickMarkets(ranked, mode) {
  const listedMin = 0.32;
  const cousinMin = mode === "news_impact" ? 0.28 : 0.2;
  const listed = ranked.filter((m) => (m.relevance || 0) >= listedMin);
  if (listed.length) return { verdict: "listed", markets: listed.slice(0, 3) };
  const cousins = ranked.filter((m) => (m.relevance || 0) >= cousinMin);
  if (cousins.length) return { verdict: "cousin", markets: cousins.slice(0, 2) };
  return { verdict: "none", markets: [] };
}

async function optionalNews(query) {
  try {
    const news = await searchNewsHeadlines({ query: compactSearchQuery(query) || query, days: 7, limit: 6 });
    return (news.articles || []).slice(0, 3).map((a) => ({
      title: a.title,
      source: a.source,
      published_at: a.published_at,
      url: a.url,
    }));
  } catch {
    return [];
  }
}

async function optionalHolders(conditionId) {
  if (!conditionId) return { whale_line: null, inferences: [], top_wallets: [] };
  try {
    const holders = await getPolymarketHolders(conditionId, { limit: 80 });
    const analysis = analyzeHolders(holders.rows, {});
    const line = analysis.inferences?.[0] || null;
    if (line && /0 wallets/i.test(line)) return { whale_line: null, inferences: [], top_wallets: [] };
    const top = (analysis.top_yes || []).slice(0, 2);
    return {
      whale_line: line ? String(line).slice(0, 140) : null,
      inferences: (analysis.inferences || []).slice(0, 3),
      top_wallets: top,
    };
  } catch {
    return { whale_line: null, inferences: [], top_wallets: [] };
  }
}

async function optionalLookalikes(conditionId) {
  if (!conditionId) return [];
  try {
    const pack = await getLookalikeMarkets({ conditionId, limit: 6 });
    return (pack.lookalikes || []).slice(0, 4).map((m) => asMarket(m, m.title || "", "polymarket"));
  } catch {
    return [];
  }
}

function settleDraft(pack) {
  const draft = formatXReply(pack);
  let gated = gateResearchPack({ ...pack, draft_reply: draft, x_reply: draft });
  let status = pack.status || "draft_ready";
  let outDraft = draft;
  if (!gated.can_post && status !== "needs_clarification") {
    outDraft =
      "Lychee didn't get a clean read on that — try a market link, wallet, or a clearer theme. lycheedata.com/jarvis";
    gated = gateResearchPack({
      ...pack,
      verdict: "none",
      markets: [],
      draft_reply: outDraft,
      x_reply: outDraft,
    });
    status = gated.can_post ? "draft_ready" : "blocked";
  }
  return {
    ...pack,
    draft_reply: outDraft,
    x_reply: outDraft,
    gate: gated,
    status: gated.can_post ? "draft_ready" : status,
  };
}

/**
 * One research kernel for MCP (GPT/Claude) and X Jarvis.
 */
export async function runResearchPack({
  text = "",
  parent_text = "",
  author_handle = "",
  deliver_default = "public_reply",
} = {}) {
  const intent = parseResearchIntent({ text, parent_text, author_handle, deliver_default });
  const as_of = new Date().toISOString();
  const query = intent.subject.query || "";

  if (intent.mode === "clarify") {
    return settleDraft({
      as_of,
      intent,
      verdict: "clarify",
      status: "needs_clarification",
      ask_user: intent.ask_user,
      markets: [],
      lookalikes: [],
      news: [],
      take: "",
      flows: ["clarify"],
    });
  }

  if (intent.mode === "pulse") {
    const pulse = await jarvisPulse({ limit: 6 });
    const cleanH = (s) =>
      String(s || "")
        .replace(/^(hey\s*[—\-]\s*)/i, "")
        .replace(/^(also watching|also moving):\s*/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    const alerts = (pulse.alerts || [])
      .slice(0, 3)
      .map((a) => ({ ...a, headline: cleanH(a.headline) }))
      .filter((a) => a?.headline);
    const take = alerts[0] ? String(alerts[0].headline).slice(0, 140) : "Nothing spicy on Lychee's active board.";
    return settleDraft({
      as_of,
      intent,
      verdict: alerts.length ? "listed" : "none",
      markets: [],
      lookalikes: [],
      news: [],
      take,
      pulse_alerts: alerts.map((a) => ({ headline: a.headline, detail: a.detail || a.why_interesting || "" })),
      flows: ["jarvis_pulse"],
    });
  }

  if (intent.mode === "calibrate") {
    return settleDraft({
      as_of,
      intent,
      verdict: "none",
      markets: [],
      take: `Calibration on “${query.slice(0, 80)}” is a Lychee chart pack — open the terminal for Brier / settled races.`,
      flows: ["search_closed_markets"],
    });
  }

  const searches = await searchBoth(query, 8);
  const ranked = rankMarkets(query, searches.kalshi, searches.polymarket);
  const picked = pickMarkets(ranked, intent.mode);
  let verdict = picked.verdict;
  const markets = picked.markets;

  const seed = markets.find((m) => m.condition_id);
  const wantDeep = ["holders", "research", "lookalikes", "verify", "news_impact", "market_for"].includes(intent.mode);

  const [lookalikes, whale, news] = await Promise.all([
    wantDeep && seed?.condition_id && intent.mode !== "gap" ? optionalLookalikes(seed.condition_id) : [],
    wantDeep && seed?.condition_id && intent.mode !== "gap" ? optionalHolders(seed.condition_id) : { whale_line: null, inferences: [] },
    intent.mode === "news_impact" || intent.mode === "verify" || intent.mode === "research"
      ? optionalNews(query)
      : [],
  ]);

  let gapTake = "";
  if (intent.mode === "gap") {
    try {
      const compared = await compareVenues({
        query,
        ticker: intent.subject.ticker || "",
        conditionId: intent.subject.condition_id || "",
        limit: 4,
      });
      const n = (compared.candidates || compared.matches || []).length;
      gapTake = n ? `Kalshi↔Poly: ${n} Lychee match(es).` : `Thin Kalshi↔Poly matches for that theme.`;
    } catch {
      gapTake = "";
    }
  }

  let verifyVerdict = verdict;
  let take = gapTake;
  if (intent.mode === "verify") {
    if (intent.subject.wallet) {
      try {
        const trader = await getPolymarketTrader(intent.subject.wallet, { limit: 20 });
        const n = Array.isArray(trader?.positions)
          ? trader.positions.length
          : Array.isArray(trader?.activity)
            ? trader.activity.length
            : 0;
        take = n ? `Wallet is on Lychee with activity we can pull.` : `Wallet didn't expand to a tradeable Lychee book.`;
        verifyVerdict = n ? "backed" : "none";
      } catch (err) {
        take = /protocol/i.test(err?.message || "")
          ? "That address is a protocol contract, not a trader proxy."
          : "Couldn't expand that wallet on Lychee.";
        verifyVerdict = "none";
      }
    } else if (verdict === "listed") {
      verifyVerdict = "backed";
      take = take || whale.inferences?.[0] || "Listed markets exist for this theme on Lychee.";
    } else if (verdict === "cousin") {
      verifyVerdict = "conflicts";
      take = "Closest listed markets are cousins — not a clean match to the claim.";
    } else {
      verifyVerdict = "none";
      take = take || "No listed Kalshi/Poly market backs that claim in Lychee.";
    }
  } else if (intent.mode === "news_impact") {
    take =
      verdict === "none"
        ? ""
        : whale.whale_line ||
          (news[0]?.title ? `Related coverage: ${String(news[0].title).slice(0, 90)}` : "") ||
          (markets.length ? "Prices/holders from Lychee live books — not the headline site." : "");
  } else if (!take && whale.whale_line && verdict === "listed") {
    take = whale.whale_line;
  }

  const pack = {
    as_of,
    intent,
    verdict: intent.mode === "verify" ? verifyVerdict : verdict,
    markets,
    lookalikes: (lookalikes || []).filter((m) => m.title).slice(0, 3),
    news: news || [],
    whale_line: whale.whale_line || null,
    take: String(take || "").slice(0, 180),
    flows: [
      "search_markets",
      seed?.condition_id ? "get_lookalike_markets" : null,
      seed?.condition_id ? "analyze_holders" : null,
      intent.mode === "news_impact" || intent.mode === "verify" ? "search_news" : null,
    ].filter(Boolean),
    lychee_url: "https://lycheedata.com/jarvis",
  };

  return settleDraft(pack);
}

export { parseResearchIntent, gateResearchPack, formatXReply, relevanceScore };
