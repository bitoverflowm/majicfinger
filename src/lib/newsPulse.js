/**
 * lychee_news pulse preview: recent headlines tied to live Polymarket (and Kalshi when
 * a lexical match lands). Same market→news direction as /api/news/headline — not an
 * LLM news_impact pass — so a page load stays cheap.
 *
 * Server only.
 */
import { pickMarkets } from "@/lib/holderLanding/featuredSubjects";
import { holderTerminalHref } from "@/lib/holderLanding/pages";
import { searchKalshi } from "@/lib/mcp/data/providers";
import { headlineHits, marketNewsTerms } from "@/lib/newsQuery";
import { googleNewsUrl, parseGoogleNewsRss, resolveArticlePublisherUrls, withinWindow } from "@/lib/newsSources";
import { FEED_LIMIT, mergePulsePairs, pickKalshiMatch } from "@/lib/newsPulseFormat";

export { mergePulsePairs, pickKalshiMatch } from "@/lib/newsPulseFormat";

const MINUTE = 60_000;
const TTL_MS = 10 * MINUTE;
const WINDOW_MS = 48 * 60 * MINUTE;
const MARKETS_TRIED = 8;
const ARTICLES_PER_MARKET = 3;
const FETCH_TIMEOUT_MS = 8_000;
const ARCHIVE_TIMEOUT_MS = 4_000;

/** Offline / design fixture when NEWS_PULSE_DEMO=1. */
export const NEWS_PULSE_DEMO_ITEMS = [
  {
    id: "demo-fed-cut",
    headline: "Fed officials signal openness to a June rate cut if inflation cools further",
    url: "https://www.reuters.com/",
    source: "Reuters",
    t: Date.parse("2026-03-12T14:22:00Z"),
    markets: [
      {
        venue: "polymarket",
        title: "Fed decision in June?",
        url: "https://polymarket.com/event/fed-decision-in-june",
        lychee_href: "/dashboard?terminal=holder",
      },
      {
        venue: "kalshi",
        title: "Fed funds rate after June 2026 meeting",
        url: "https://kalshi.com/markets/KXFED",
      },
    ],
  },
  {
    id: "demo-tariffs",
    headline: "White House weighs new auto tariffs as trade talks stall",
    url: "https://www.bloomberg.com/",
    source: "Bloomberg",
    t: Date.parse("2026-03-12T11:05:00Z"),
    markets: [
      {
        venue: "polymarket",
        title: "Will the US impose new auto tariffs in 2026?",
        url: "https://polymarket.com/event/us-auto-tariffs-2026",
        lychee_href: "/dashboard?terminal=holder",
      },
    ],
  },
];

let memo = { value: null, expires: 0 };
let pending = null;

function polyUrl(market) {
  const slug = String(market?.slug || "").trim();
  if (!slug) return null;
  return `https://polymarket.com/event/${encodeURIComponent(slug)}`;
}

function asPolyMarket(market) {
  return {
    venue: "polymarket",
    title: String(market.title || "").trim(),
    condition_id: market.conditionId || null,
    slug: market.slug || null,
    url: polyUrl(market),
    lychee_href: holderTerminalHref({
      kind: "market",
      conditionId: market.conditionId,
      title: market.title,
    }),
  };
}

async function googleHeadlines(terms, start, end) {
  const res = await fetch(googleNewsUrl(terms, start, end), {
    headers: { "User-Agent": "Lychee news pulse" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return [];
  // Prefer second-precision stamps so the feed isn't all day-bucketed Google rows.
  const parsed = withinWindow(parseGoogleNewsRss(await res.text()), start, end)
    .filter((article) => article.precision !== "day")
    .sort((a, b) => b.t - a.t)
    .slice(0, ARTICLES_PER_MARKET);
  // Post-2024 Google RSS links are opaque; resolve to publisher origins before the UI sees them.
  // On resolve failure we keep the headline with url=null (no news.google.com click target).
  return resolveArticlePublisherUrls(parsed, { concurrency: 3, timeoutMs: 5_000 });
}

async function archiveHeadlines(terms, start, end) {
  // Dynamic import keeps Athena/S3 off the cold path when Google News already answered.
  const { archiveConfigured, fromArchive } = await import("@/lib/newsArchive");
  if (!archiveConfigured()) return [];
  const archived = await Promise.race([
    fromArchive("gdelt", terms, start, end),
    new Promise((_, reject) => setTimeout(() => reject(new Error("archive timeout")), ARCHIVE_TIMEOUT_MS)),
  ]);
  if (archived?.status !== "ok" || !Array.isArray(archived.articles)) return [];
  return archived.articles.sort((a, b) => b.t - a.t).slice(0, ARTICLES_PER_MARKET);
}

function onHeadline(articles, terms) {
  // Google/GDELT can match body text; for the pulse we only want headlines that name the market.
  const need = Math.min(terms.length, terms.length >= 2 ? 2 : 1);
  return (articles || []).filter((article) => headlineHits(article.title, terms) >= need);
}

async function headlinesForMarket(terms, start, end) {
  const google = onHeadline(await googleHeadlines(terms, start, end).catch(() => []), terms);
  if (google.length) return google;
  return onHeadline(await archiveHeadlines(terms, start, end).catch(() => []), terms);
}

async function kalshiForTitle(title) {
  const rows = await searchKalshi(title, { limit: 4 }).catch(() => []);
  return pickKalshiMatch(title, rows);
}

async function buildFeed() {
  if (process.env.NEWS_PULSE_DEMO === "1") {
    return { items: NEWS_PULSE_DEMO_ITEMS, demo: true, as_of: new Date().toISOString() };
  }

  const markets = (await pickMarkets()).slice(0, MARKETS_TRIED);
  const end = Date.now();
  const start = end - WINDOW_MS;
  const pairs = [];

  await Promise.all(
    markets.map(async (market) => {
      const { terms } = marketNewsTerms(market.title);
      if (!terms.length) return;
      const [articles, kalshi] = await Promise.all([headlinesForMarket(terms, start, end), kalshiForTitle(market.title)]);
      const linked = [asPolyMarket(market), kalshi].filter(Boolean);
      for (const article of articles) {
        pairs.push({ article, markets: linked });
      }
    }),
  );

  const items = mergePulsePairs(pairs, { limit: FEED_LIMIT });
  return { items, demo: false, as_of: new Date().toISOString() };
}

/** Memoized feed for the /news page and /api/news/pulse. */
export async function getNewsPulseFeed({ force = false } = {}) {
  if (!force && memo.expires > Date.now() && memo.value) return memo.value;
  if (!force && pending) return pending;

  pending = buildFeed()
    .then((value) => {
      const ttl = value.items?.length ? TTL_MS : MINUTE;
      memo = { value, expires: Date.now() + ttl };
      return value;
    })
    .catch(() => {
      const empty = { items: [], demo: false, as_of: new Date().toISOString(), error: true };
      memo = { value: empty, expires: Date.now() + MINUTE };
      return empty;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}
