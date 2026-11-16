/**
 * Pure helpers for the lychee_news pulse feed (no network / AWS).
 */
import { articleKey } from "@/lib/newsQuery";
import { relevanceScore } from "@/lib/mcp/research/relevance";
import { isGoogleNewsUrl } from "@/lib/newsSources";

export const KALSHI_RELEVANCE_MIN = 0.32;
export const FEED_LIMIT = 24;

/** Pulse click target: publisher origin only — never a Google News redirect. */
export function pulseArticleUrl(article) {
  for (const cand of [article?.publisher_url, article?.url]) {
    const href = String(cand || "").trim();
    if (href && !isGoogleNewsUrl(href)) return href;
  }
  return null;
}

function kalshiUrl(ticker) {
  const t = String(ticker || "").trim();
  if (!t) return null;
  return `https://kalshi.com/markets/${encodeURIComponent(t)}`;
}

function asKalshiMarket(row) {
  const title = String(row?.title || "").trim();
  const ticker = row?.ticker || null;
  const url = kalshiUrl(ticker);
  if (!title || !url) return null;
  return { venue: "kalshi", title, ticker, url };
}

/** Keep the best Kalshi hit for a Polymarket title (lexical relevance, no LLM). */
export function pickKalshiMatch(polyTitle, kalshiRows, minScore = KALSHI_RELEVANCE_MIN) {
  let best = null;
  let bestScore = 0;
  for (const row of kalshiRows || []) {
    const score = relevanceScore(polyTitle, row?.title || "");
    if (score < minScore || score <= bestScore) continue;
    const market = asKalshiMarket(row);
    if (!market) continue;
    best = market;
    bestScore = score;
  }
  return best;
}

/**
 * Collapse the same story across markets into one pulse item (newest first).
 * `pairs` is `{ article, markets[] }[]`.
 */
export function mergePulsePairs(pairs, { limit = FEED_LIMIT } = {}) {
  const byKey = new Map();
  for (const pair of pairs || []) {
    const article = pair?.article;
    if (!article?.title || !Number.isFinite(article.t)) continue;
    const markets = (pair.markets || []).filter((m) => m?.title && (m.url || m.lychee_href));
    if (!markets.length) continue;
    const key = articleKey(article.title);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, {
        id: key,
        headline: article.title,
        url: pulseArticleUrl(article),
        source: article.source || article.domain || null,
        t: article.t,
        markets: [...markets],
      });
      continue;
    }
    if (article.t > prev.t) {
      prev.t = article.t;
      prev.headline = article.title;
      prev.url = pulseArticleUrl(article) || prev.url;
      if (isGoogleNewsUrl(prev.url)) prev.url = null;
      if (article.source || article.domain) prev.source = article.source || article.domain;
    }
    for (const m of markets) {
      const dup = prev.markets.some(
        (x) => x.venue === m.venue && (x.condition_id || x.ticker || x.title) === (m.condition_id || m.ticker || m.title),
      );
      if (!dup) prev.markets.push(m);
    }
  }
  return [...byKey.values()]
    .filter((item) => item.markets.length > 0)
    .sort((a, b) => b.t - a.t)
    .slice(0, Math.max(1, limit));
}
