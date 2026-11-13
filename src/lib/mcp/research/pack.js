import { parseResearchIntent } from "./intent.js";
import { gateResearchPack } from "./gate.js";
import { formatXReply } from "./formatX.js";
import { compactSearchQuery, relevanceScore } from "./relevance.js";
import { llmAvailable, llmModel } from "./llm.js";
import { understandRequest } from "./understand.js";
import { pickMarkets } from "./pick.js";
import { holderTemplate, writeReply } from "./write.js";
import { findHolder, holderDeepDive } from "./holder.js";
import { jarvisPulse } from "@/lib/mcp/data/jarvis";
import {
  getLookalikeMarkets,
  getPolymarketHolders,
  getPolymarketTrader,
  searchKalshi,
  searchKalshiEvents,
  searchPolymarket,
} from "@/lib/mcp/data/providers";
import { compareVenues } from "@/lib/mcp/data/compareVenues";
import { analyzeHolders } from "@/lib/mcp/data/stats";
import { searchNewsHeadlines } from "@/lib/mcp/data/news";

function yesPrice(row) {
  if (row?.yes_price != null && Number.isFinite(Number(row.yes_price))) return Number(row.yes_price);
  const prices = row?.outcome_prices;
  if (Array.isArray(prices) && prices.length) {
    const n = Number(prices[0]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Open outcomes of a multi-outcome event, highest price first. */
function openOutcomes(row) {
  if (row?.entity !== "event" || !Array.isArray(row.markets)) return [];
  return row.markets
    .filter((m) => !m.closed && m.yes_price != null)
    .sort((a, b) => b.yes_price - a.yes_price)
    .map((m) => ({
      label: m.outcome_label || m.title,
      yes_price: m.yes_price,
      price_change_24h: m.price_change_24h ?? null,
      condition_id: m.condition_id || null,
      ticker: m.ticker || null,
    }));
}

/** Headline outcome: the most likely one that isn't a near-certain floor or a dead long shot. */
function headlineOutcome(outcomes) {
  return outcomes.find((o) => o.yes_price >= 0.03 && o.yes_price <= 0.97) || outcomes[0] || null;
}

function withOutcome(title, label) {
  const l = String(label || "").trim();
  return l && !title.toLowerCase().includes(l.toLowerCase()) ? `${title} — ${l}` : title;
}

function asMarket(row, query, venueHint) {
  const venue = row?.venue || venueHint || (row?.condition_id ? "polymarket" : "kalshi");
  const baseTitle = String(row?.title || row?.question || "").trim();
  const outcomes = openOutcomes(row);
  const leader = headlineOutcome(outcomes);
  const title = withOutcome(baseTitle, leader?.label || row?.outcome_label);
  return {
    venue,
    title,
    event_title: outcomes.length ? baseTitle : undefined,
    ticker: leader?.ticker || row?.ticker || null,
    condition_id: leader?.condition_id || row?.condition_id || null,
    slug: row?.slug || null,
    event_slug: row?.event_slug || (row?.entity === "event" ? row?.slug : null) || null,
    yes_price: leader ? leader.yes_price : yesPrice(row),
    price_change_24h: leader ? leader.price_change_24h : row?.price_change_24h ?? null,
    outcomes: outcomes.length ? outcomes.slice(0, 8) : undefined,
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

/** `keywords`: q is a short title-style query (model path), so use Kalshi's ranked site search. */
async function searchBoth(query, limit = 6, { keywords = false } = {}) {
  const q = keywords ? String(query || "").trim().slice(0, 180) : compactSearchQuery(query);
  if (q.length < 2) return { kalshi: [], polymarket: [] };
  const kalshi = keywords
    ? searchKalshiEvents(q, { limit: 4 }).catch(() => searchKalshi(q, { limit, allTokens: true }))
    : searchKalshi(q, { limit });
  const [k, p] = await Promise.allSettled([kalshi, searchPolymarket(q, { limit, activeOnly: true })]);
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

/** Rule-based pick by word-overlap relevance; used when the model is off or fails. */
function pickByRelevance(ranked) {
  const listedMin = 0.32;
  const cousinMin = 0.28;
  const listed = ranked.filter((m) => (m.relevance || 0) >= listedMin);
  if (listed.length) return { verdict: "listed", markets: listed.slice(0, 3) };
  const cousins = ranked.filter((m) => (m.relevance || 0) >= cousinMin);
  if (cousins.length) return { verdict: "cousin", markets: cousins.slice(0, 2) };
  return { verdict: "none", markets: [] };
}

/** Every query on both venues, merged without duplicates; the pool the model picks from. */
async function searchCandidates(queries, limit = 18) {
  const results = await Promise.all(queries.slice(0, 3).map((q) => searchBoth(q, 6, { keywords: true })));
  const byTitle = new Map();
  const better = (a, b) =>
    (a.yes_price != null) !== (b.yes_price != null) ? a.yes_price != null : (Number(a.volume_24h) || 0) > (Number(b.volume_24h) || 0);
  results.forEach((found, i) => {
    for (const m of rankMarkets(queries[i], found.kalshi, found.polymarket)) {
      const key = candidateKey(m);
      const prev = byTitle.get(key);
      if (!prev || better(m, prev)) byTitle.set(key, m);
    }
  });
  return [...byTitle.values()].slice(0, limit);
}

function candidateKey(m) {
  return `${m.venue}:${(m.event_title || m.title).trim().toLowerCase()}`;
}

/** Near-certain (≥97¢) and dead (≤3¢) rows go last, and drop out once 3 informative rows exist. */
function informativeFirst(rows) {
  const live = (m) => m.yes_price == null || (m.yes_price > 0.03 && m.yes_price < 0.97);
  const good = rows.filter(live);
  return good.length >= 3 ? good : [...good, ...rows.filter((m) => !live(m))];
}

/** First `n` rows, but each venue's best row comes before any venue's second. */
function acrossVenues(rows, n) {
  const leads = [];
  const rest = [];
  const seen = new Set();
  for (const m of rows) {
    if (seen.has(m.venue)) rest.push(m);
    else {
      seen.add(m.venue);
      leads.push(m);
    }
  }
  return [...leads, ...rest].slice(0, n);
}

const CLARIFY_FALLBACK =
  "Reply under the tweet (or paste a market / wallet) and tag me again — I need a subject to pull from Lychee.";

/** The rule-based intent, with the model's reading of mode, subject, and search queries layered on. */
function withUnderstanding(intent, understanding) {
  const hasId = Boolean(intent.subject.condition_id || intent.subject.wallet);
  const mode = understanding.mode === "clarify" && hasId ? intent.mode : understanding.mode;
  return {
    ...intent,
    mode,
    depth: mode === "pulse" ? "quick" : "standard",
    ask_user: mode === "clarify" ? understanding.clarify_question || intent.ask_user || CLARIFY_FALLBACK : null,
    subject: {
      ...intent.subject,
      query: understanding.search_queries[0] || intent.subject.query,
      queries: understanding.search_queries,
      summary: understanding.subject,
      claim: understanding.claim || null,
    },
  };
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

async function optionalLookalikes(conditionId, query) {
  if (!conditionId) return [];
  try {
    const pack = await getLookalikeMarkets({ conditionId, limit: 6 });
    return (pack.lookalikes || [])
      .slice(0, 4)
      .map((m) => asMarket(m, query, "polymarket"))
      .filter((m) => (m.relevance || 0) >= 0.28);
  } catch {
    return [];
  }
}

/** A deep dive on one wallet: given directly, or the `holder_rank`-th holder on `holder_side` of the picked market. */
async function holderProfilePack({ as_of, intent, understanding, picked, llm }) {
  const market = (picked?.matches || []).find((m) => m.venue === "polymarket" && m.condition_id);
  let wallet = intent.subject.wallet || (/^0x[a-fA-F0-9]{40}$/.test(understanding?.wallet || "") ? understanding.wallet : "");
  let found = null;
  const base = { as_of, intent, markets: [], lookalikes: [], news: [], flows: ["polymarket_holders", "trader_profile"] };
  if (!wallet && market) {
    found = await findHolder(market.condition_id, {
      side: understanding?.holder_side || "NO",
      rank: understanding?.holder_rank || 1,
    }).catch((err) => {
      llm.issues.push(`holder: ${err?.message || err}`);
      return null;
    });
    wallet = found?.wallet || "";
  }
  if (!wallet) {
    return { ...base, verdict: "none", take: "Couldn't pin down which wallet you mean — paste the address or market and tag me again." };
  }
  try {
    const profile = await holderDeepDive({
      wallet,
      conditionId: market?.condition_id || "",
      themeKeywords: understanding?.category_keywords || [],
      newsQuery: intent.subject.queries?.[0] || "",
    });
    return {
      ...base,
      verdict: "listed",
      holder: { ...profile, market: market ? { title: market.title, price: market.yes_price } : null, rank: found },
      take: "",
    };
  } catch (err) {
    llm.issues.push(`holder: ${err?.message || err}`);
    return { ...base, verdict: "none", take: "Couldn't expand that wallet on Lychee." };
  }
}

async function settleDraft(pack, { text = "", parent_text = "" } = {}) {
  let draft = pack.holder ? holderTemplate(pack) : formatXReply(pack);
  const llm = pack.llm;
  if (llm?.understanding && pack.status !== "needs_clarification") {
    try {
      const written = await writeReply({ pack, text, parent_text });
      llm.writer = written.reply ? "model" : "template";
      llm.model_draft = written.draft;
      llm.issues.push(...written.issues.map((issue) => `write: ${issue}`));
      if (written.reply) draft = written.reply;
    } catch (err) {
      llm.writer = "template";
      llm.issues.push(`write: ${err?.message || err}`);
    }
  }
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
  /** true when the asker's X handle is linked to a Lychee account (DM follow-ups work), false/null otherwise. */
  asker_registered = null,
} = {}) {
  const ruleIntent = parseResearchIntent({ text, parent_text, author_handle, deliver_default });
  const llm = { on: llmAvailable(), model: llmModel(), issues: [] };
  let understanding = null;
  if (llm.on) {
    try {
      understanding = await understandRequest({ text, parent_text });
      llm.understanding = understanding;
    } catch (err) {
      llm.issues.push(`understand: ${err?.message || err}`);
    }
  }
  const intent = understanding ? withUnderstanding(ruleIntent, understanding) : ruleIntent;
  const as_of = new Date().toISOString();
  const query = intent.subject.query || "";
  const finish = (pack) => settleDraft({ ...pack, asker_registered, llm }, { text, parent_text });

  if (intent.mode === "clarify") {
    return finish({
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
    return finish({
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
    return finish({
      as_of,
      intent,
      verdict: "none",
      markets: [],
      take: `Calibration on “${query.slice(0, 80)}” is a Lychee chart pack — open the terminal for Brier / settled races.`,
      flows: ["search_closed_markets"],
    });
  }

  let ranked = [];
  let verdict = "none";
  let markets = [];
  let picked = null;
  if (understanding && intent.subject.queries?.length) {
    ranked = await searchCandidates(intent.subject.queries);
    try {
      picked = await pickMarkets({ understanding, request: text, candidates: ranked });
      if (picked.missing_searches.length) {
        const known = new Set(ranked.map(candidateKey));
        const fresh = (await searchCandidates(picked.missing_searches, 10)).filter((m) => !known.has(candidateKey(m)));
        llm.second_search = { queries: picked.missing_searches, new_candidates: fresh.length };
        if (fresh.length) {
          ranked = [...ranked, ...fresh];
          picked = await pickMarkets({ understanding, request: text, candidates: ranked });
        }
      }
      llm.picks = picked.picks.map((p) => ({
        ...p,
        title: ranked[p.id]?.title,
        venue: ranked[p.id]?.venue,
        outcomes: ranked[p.id]?.outcomes?.map((o) => o.label),
      }));
    } catch (err) {
      llm.issues.push(`pick: ${err?.message || err}`);
    }
  } else {
    const searches = await searchBoth(query, 8);
    ranked = rankMarkets(query, searches.kalshi, searches.polymarket);
  }
  if (picked) {
    const broad = ["news_impact", "research"].includes(intent.mode);
    verdict = picked.matches.length ? "listed" : picked.related.length ? "cousin" : "none";
    markets = broad
      ? acrossVenues(informativeFirst([...picked.matches, ...picked.related]), 5)
      : picked.matches.length
        ? acrossVenues(picked.matches, 3)
        : acrossVenues(picked.related, 2);
    ranked = [...picked.matches, ...picked.related];
  } else {
    ({ verdict, markets } = pickByRelevance(ranked));
  }

  if (intent.mode === "holder_profile") {
    return finish(await holderProfilePack({ as_of, intent, understanding, picked, llm }));
  }

  const seed = markets.find((m) => m.condition_id);
  const wantDeep = ["holders", "research", "lookalikes", "verify", "news_impact", "market_for"].includes(intent.mode);
  const wantNews = ["news_impact", "verify", "research"].includes(intent.mode) || Boolean(picked);

  const [lookalikes, whale, news] = await Promise.all([
    wantDeep && !picked && seed?.condition_id && intent.mode !== "gap" ? optionalLookalikes(seed.condition_id, query) : [],
    wantDeep && seed?.condition_id && intent.mode !== "gap" ? optionalHolders(seed.condition_id) : { whale_line: null, inferences: [] },
    wantNews ? optionalNews(understanding?.subject || query) : [],
  ]);
  const onTopicNews = understanding
    ? news.filter((n) => relevanceScore(understanding.subject, n.title) >= 0.5)
    : news;

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
          (onTopicNews[0]?.title ? `Related coverage: ${String(onTopicNews[0].title).slice(0, 90)}` : "") ||
          (markets.length ? "Prices/holders from Lychee live books — not the headline site." : "");
  } else if (!take && whale.whale_line && verdict === "listed") {
    take = whale.whale_line;
  }

  const pack = {
    as_of,
    intent,
    verdict: intent.mode === "verify" ? verifyVerdict : verdict,
    market_verdict: verdict,
    markets,
    venues_with_markets: picked ? [...new Set(ranked.map((m) => m.venue))] : undefined,
    lookalikes: (lookalikes || []).filter((m) => m.title).slice(0, 3),
    news: onTopicNews || [],
    whale_line: whale.whale_line || null,
    whale_market: whale.whale_line ? seed?.title || null : null,
    take: String(take || "").slice(0, 180),
    flows: [
      "search_markets",
      seed?.condition_id ? "get_lookalike_markets" : null,
      seed?.condition_id ? "analyze_holders" : null,
      intent.mode === "news_impact" || intent.mode === "verify" ? "search_news" : null,
    ].filter(Boolean),
    lychee_url: "https://lycheedata.com/jarvis",
  };

  return finish(pack);
}

export { parseResearchIntent, gateResearchPack, formatXReply, relevanceScore };
