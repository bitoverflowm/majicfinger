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
import {
  PRICE_HISTORY_PAD_MS,
  PRICE_TRAILING_MS,
  asProb,
  fetchPolymarketYesHistory,
  kalshiCandlesToHistory,
  withMarketPrice,
} from "@/lib/newsPulsePrices";

export { mergePulsePairs, pickKalshiMatch } from "@/lib/newsPulseFormat";
export { formatPulsePrice, formatPulsePriceChange } from "@/lib/newsPulseFormat";
export { PRICE_TRAILING_MS, priceChangeFromHistory } from "@/lib/newsPulsePrices";

const MINUTE = 60_000;
/** Soft memo for open tabs — tighter than the old 10m so polling feels live. */
const TTL_MS = 90_000;
/** Even with refresh=1, coalesce rebuilds so Google/CLOB aren't hammered. */
const FORCE_COOLDOWN_MS = 45_000;
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
        price: 0.42,
        price_change: 0.035,
        price_change_window: "since_article",
        price_as_of: Date.parse("2026-03-12T15:00:00Z"),
      },
      {
        venue: "kalshi",
        title: "Fed funds rate after June 2026 meeting",
        url: "https://kalshi.com/markets/KXFED",
        price: 0.38,
        price_change: 0.02,
        price_change_window: "trailing_6h",
        price_as_of: Date.parse("2026-03-12T15:00:00Z"),
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
        price: 0.61,
        price_change: -0.04,
        price_change_window: "since_article",
        price_as_of: Date.parse("2026-03-12T15:00:00Z"),
      },
    ],
  },
];

let memo = { value: null, expires: 0, builtAt: 0 };
let pending = null;

function polyUrl(market) {
  const slug = String(market?.slug || "").trim();
  if (!slug) return null;
  return `https://polymarket.com/event/${encodeURIComponent(slug)}`;
}

function asPolyMarket(market) {
  const price = asProb(market.yesPrice);
  return {
    venue: "polymarket",
    title: String(market.title || "").trim(),
    condition_id: market.conditionId || null,
    slug: market.slug || null,
    yes_token_id: market.yesTokenId || null,
    url: polyUrl(market),
    lychee_href: holderTerminalHref({
      kind: "market",
      conditionId: market.conditionId,
      title: market.title,
    }),
    ...(price != null ? { price } : {}),
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

/**
 * Batch CLOB / Kalshi history once per unique market, then stamp each pulse row.
 * @param {Array<Record<string, unknown>>} items
 */
async function enrichItemsWithPrices(items) {
  if (!items?.length) return items;
  const now = Date.now();
  const oldestArticle = Math.min(...items.map((item) => Number(item.t) || now));
  const histStart = Math.min(oldestArticle, now) - PRICE_HISTORY_PAD_MS;

  /** @type {Map<string, string>} tokenId → known price */
  const polyTokens = new Map();
  /** @type {Set<string>} */
  const kalshiTickers = new Set();

  for (const item of items) {
    for (const market of item.markets || []) {
      if (market.venue === "polymarket" && market.yes_token_id) {
        polyTokens.set(String(market.yes_token_id), market.price ?? null);
      }
      if (market.venue === "kalshi" && market.ticker) {
        kalshiTickers.add(String(market.ticker).toUpperCase());
      }
    }
  }

  /** @type {Map<string, Array<{ tMs: number; p: number }>>} */
  const polyHist = new Map();
  await Promise.all(
    [...polyTokens.keys()].map(async (tokenId) => {
      const points = await fetchPolymarketYesHistory(tokenId, histStart, now).catch(() => []);
      if (points.length) polyHist.set(tokenId, points);
    }),
  );

  /** @type {Map<string, Array<{ tMs: number; p: number }>>} */
  let kalshiHist = new Map();
  if (kalshiTickers.size) {
    try {
      const { fetchKalshiLiveCandlesticksBatchUpstream } = await import(
        "@/lib/kalshiLive/fetchKalshiLiveCandlesticksUpstream"
      );
      const rows = await fetchKalshiLiveCandlesticksBatchUpstream({
        marketTickers: [...kalshiTickers],
        start_ts: Math.floor(histStart / 1000),
        end_ts: Math.floor(now / 1000),
        period_interval: 60,
        include_latest_before_start: true,
        timeoutMs: 6_000,
      });
      kalshiHist = kalshiCandlesToHistory(rows);
    } catch {
      kalshiHist = new Map();
    }
  }

  return items.map((item) => ({
    ...item,
    markets: (item.markets || []).map((market) => {
      if (market.venue === "polymarket" && market.yes_token_id) {
        return withMarketPrice(
          market,
          polyHist.get(String(market.yes_token_id)) || [],
          item.t,
          market.price ?? polyTokens.get(String(market.yes_token_id)),
        );
      }
      if (market.venue === "kalshi" && market.ticker) {
        const key = String(market.ticker).toUpperCase();
        return withMarketPrice(market, kalshiHist.get(key) || [], item.t, market.price);
      }
      return market;
    }),
  }));
}

async function buildFeed() {
  if (process.env.NEWS_PULSE_DEMO === "1") {
    return {
      items: NEWS_PULSE_DEMO_ITEMS,
      demo: true,
      as_of: new Date().toISOString(),
      price_window: {
        since_article: "YES at/before article time (history pad 6h before article)",
        trailing_6h: `fallback when no near-article print; YES vs ~${PRICE_TRAILING_MS / 3_600_000}h ago`,
      },
    };
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

  const merged = mergePulsePairs(pairs, { limit: FEED_LIMIT });
  const items = await enrichItemsWithPrices(merged);
  return {
    items,
    demo: false,
    as_of: new Date().toISOString(),
    price_window: {
      since_article: "YES at/before article time (history pad 6h before article)",
      trailing_6h: `fallback when no near-article print; YES vs ~${PRICE_TRAILING_MS / 3_600_000}h ago`,
    },
  };
}

/** Stable weak ETag for open-tab polling (304). */
export function newsPulseEtag(feed) {
  const ids = (feed?.items || []).map((item) => item.id).join(",");
  const asOf = feed?.as_of || "";
  const raw = `${asOf}|${ids}|${(feed?.items || []).length}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  return `"pulse-${hash.toString(16)}"`;
}

/**
 * Memoized feed for the /news page and /api/news/pulse.
 * @param {{ force?: boolean }} [opts] force bypasses soft TTL (respects FORCE_COOLDOWN_MS).
 */
export async function getNewsPulseFeed({ force = false } = {}) {
  const now = Date.now();
  if (!force && memo.expires > now && memo.value) return memo.value;
  if (force && memo.value && now - memo.builtAt < FORCE_COOLDOWN_MS) return memo.value;
  if (pending) return pending;

  pending = buildFeed()
    .then((value) => {
      const ttl = value.items?.length ? TTL_MS : MINUTE;
      memo = { value, expires: Date.now() + ttl, builtAt: Date.now() };
      return value;
    })
    .catch(() => {
      const empty = {
        items: [],
        demo: false,
        as_of: new Date().toISOString(),
        error: true,
        price_window: {
          since_article: "YES at/before article time (history pad 6h before article)",
          trailing_6h: `fallback when no near-article print; YES vs ~${PRICE_TRAILING_MS / 3_600_000}h ago`,
        },
      };
      memo = { value: empty, expires: Date.now() + MINUTE, builtAt: Date.now() };
      return empty;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}
