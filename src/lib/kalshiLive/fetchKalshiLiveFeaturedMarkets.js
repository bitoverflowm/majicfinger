import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

const FEATURED_LIMIT_DEFAULT = 5;
const FEATURED_POOL_SIZE = 20;
const FEATURED_PER_SERIES = 2;
const FEATURED_CACHE_TTL_MS = 5 * 60_000;

/** One discovery GET /markets page; Kalshi max page size is 1000. */
const DISCOVERY_PAGE_LIMIT = 1000;
/** Sequential pages — API has no min-volume filter, so we paginate then rank. */
const DISCOVERY_MAX_PAGES = 10;
const DISCOVERY_POOL_SIZE = 20;
const DISCOVERY_LIMIT_DEFAULT = 10;
const DISCOVERY_CACHE_TTL_MS = 24 * 60 * 60_000;
const DISCOVERY_CACHE_VERSION = 3;
const DISCOVERY_PER_EVENT = 1;
const DISCOVERY_PER_SERIES = 2;

/**
 * Kalshi GET /markets has no server-side volume sort. We probe open markets on
 * known high-volume series, then rank by volume_24h. Series list ranking would
 * require downloading ~12k series and is too slow for a marketing-page cold start.
 */
const SEED_SERIES = [
  "KXBTC15M",
  "KXBTCD",
  "KXETH15M",
  "KXETHD",
  "KXNFLGAME",
  "KXNBAGAME",
  "KXMLBGAME",
  "KXNCAAMBGAME",
  "KXATPMATCH",
  "KXWCGAME",
  "KXWTAMATCH",
  "KXFED",
  "KXPRES",
  "KXGDP",
  "KXCPI",
  "KXUNEMP",
  "KXDJT",
  "KXINX",
  "KXGOLD",
  "KXGOLDH",
];

/** @type {{ at: number; markets: FeaturedKalshiMarket[] } | null} */
let featuredCache = null;
/** @type {{ at: number; v?: number; markets: FeaturedKalshiMarket[] } | null} */
let discoveryCache = null;
/** @type {Promise<FeaturedKalshiMarket[]> | null} */
let discoveryInflight = null;

/**
 * @typedef {{
 *   ticker: string;
 *   eventTicker: string;
 *   seriesTicker: string;
 *   title: string;
 *   subtitle?: string;
 *   status: string;
 *   lastPriceDollars: number | null;
 *   volume24h: number | null;
 *   volume: number | null;
 *   openInterest: number | null;
 *   imageUrl?: string;
 *   seriesTitle?: string;
 *   category?: string;
 *   featured?: boolean;
 *   eventTitle?: string;
 *   tags?: string[];
 *   raw: Record<string, unknown>;
 * }} FeaturedKalshiMarket
 */

/**
 * Kalshi GET /markets has no documented `featured` query param. Prefer a boolean
 * if the payload ever includes one, otherwise rank by 24h volume.
 *
 * @param {Record<string, unknown> | null | undefined} market
 * @returns {boolean}
 */
export function isKalshiDiscoveryFeaturedFlag(market) {
  if (!market || typeof market !== "object") return false;
  return market.featured === true || market.is_featured === true;
}

/**
 * @param {Record<string, unknown> | null | undefined} market
 * @returns {number}
 */
export function kalshiDiscoveryVolumeScore(market) {
  const vol24 = toNum(market?.volume_24h_fp);
  if (vol24 != null) return vol24;
  return toNum(market?.volume_fp) ?? 0;
}

/**
 * Event title plus market subtitle, so "Over 2.5 1H points" includes the game name.
 *
 * @param {Record<string, unknown>} market
 * @param {Record<string, unknown> | null | undefined} event
 * @returns {string}
 */
export function composeKalshiFeaturedTitle(market, event) {
  const ticker = String(market?.ticker || "").trim().toUpperCase();
  const marketTitle = String(market?.title || market?.yes_sub_title || "").trim();
  const eventTitle = String(event?.title || event?.sub_title || "").trim();
  if (eventTitle && marketTitle) {
    const hay = marketTitle.toLowerCase();
    const needle = eventTitle.toLowerCase().slice(0, 18);
    if (needle && hay.includes(needle)) return marketTitle;
    return `${eventTitle} — ${marketTitle}`;
  }
  return eventTitle || marketTitle || ticker;
}

/**
 * @param {Record<string, unknown> | null | undefined} series
 * @returns {string[]}
 */
export function tagsFromKalshiSeries(series) {
  /** @type {string[]} */
  const tags = [];
  const category = String(series?.category || "").trim();
  if (category) tags.push(category);
  const raw = series?.tags;
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string" && raw.trim().startsWith("[")
      ? (() => {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];
  for (const item of list) {
    const tag = String(item || "").trim();
    if (tag && !tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      tags.push(tag);
    }
  }
  return tags.slice(0, 4);
}

/**
 * Keep the pool from collapsing into one game's totals/spreads.
 *
 * @param {Record<string, unknown>[]} markets
 * @param {number} [limit]
 * @returns {Record<string, unknown>[]}
 */
export function diversifyKalshiDiscoveryFeatured(markets, limit = DISCOVERY_POOL_SIZE) {
  const take = Math.max(1, Math.floor(Number(limit) || DISCOVERY_POOL_SIZE));
  const byEvent = new Map();
  const bySeries = new Map();
  /** @type {Record<string, unknown>[]} */
  const out = [];
  for (const market of Array.isArray(markets) ? markets : []) {
    if (!market || typeof market !== "object") continue;
    const event = String(market.event_ticker || "").trim().toUpperCase();
    const series = String(market.series_ticker || "").trim().toUpperCase();
    if (event && (byEvent.get(event) || 0) >= DISCOVERY_PER_EVENT) continue;
    if (series && (bySeries.get(series) || 0) >= DISCOVERY_PER_SERIES) continue;
    out.push(market);
    if (event) byEvent.set(event, (byEvent.get(event) || 0) + 1);
    if (series) bySeries.set(series, (bySeries.get(series) || 0) + 1);
    if (out.length >= take) break;
  }
  return out;
}

/**
 * Rank discovery markets: featured flag first, then highest volume.
 *
 * @param {unknown} markets
 * @param {number} [limit]
 * @returns {Record<string, unknown>[]}
 */
export function rankKalshiMarketsForDiscoveryFeatured(markets, limit = DISCOVERY_POOL_SIZE) {
  const take = Math.max(1, Math.floor(Number(limit) || DISCOVERY_POOL_SIZE));
  const list = Array.isArray(markets) ? markets : [];
  return list
    .filter((row) => row && typeof row === "object" && String(row.ticker || "").trim())
    .map((row) => {
      const market = /** @type {Record<string, unknown>} */ (row);
      return {
        market,
        featured: isKalshiDiscoveryFeaturedFlag(market),
        vol: kalshiDiscoveryVolumeScore(market),
      };
    })
    .filter((row) => row.vol > 0)
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return b.vol - a.vol;
    })
    .slice(0, take)
    .map((row) => row.market);
}

function toNum(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {string} path
 * @param {Record<string, string | number | undefined | null>} [query]
 */
async function kalshiGet(path, query = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v == null || v === "") continue;
    qs.set(k, String(v));
  }
  const url = `${kalshiLiveUrl(path)}${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
          ? body.error
          : res.statusText || `Kalshi ${path} failed`,
    );
  }
  return body;
}

/**
 * @param {string} seriesTicker
 * @param {number} [take]
 * @returns {Promise<Record<string, unknown>[]>}
 */
async function fetchTopOpenMarketsForSeries(seriesTicker, take = FEATURED_PER_SERIES) {
  const body = await kalshiGet("markets", {
    series_ticker: seriesTicker,
    status: "open",
    mve_filter: "exclude",
    limit: 100,
  });
  const markets = Array.isArray(body?.markets) ? body.markets : [];
  if (!markets.length) return [];

  return markets
    .filter((m) => m && typeof m === "object")
    .map((m) => ({
      market: /** @type {Record<string, unknown>} */ (m),
      vol: toNum(m.volume_24h_fp) ?? toNum(m.volume_fp) ?? 0,
    }))
    .sort((a, b) => b.vol - a.vol)
    .slice(0, Math.max(1, take))
    .map((row) => row.market);
}

/**
 * @param {string} eventTicker
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function fetchEventMetadata(eventTicker) {
  if (!eventTicker) return null;
  try {
    const body = await kalshiGet(`events/${encodeURIComponent(eventTicker)}/metadata`);
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} body
 * @param {string} marketTicker
 */
function imageFromEventMetadata(body, marketTicker) {
  if (!body) return "";
  const ticker = String(marketTicker || "").trim().toUpperCase();
  const details = Array.isArray(body.market_details) ? body.market_details : [];
  const match = details.find(
    (d) =>
      String(d?.market_ticker || "")
        .trim()
        .toUpperCase() === ticker,
  );
  return (
    String(match?.image_url || "").trim() ||
    String(body.featured_image_url || "").trim() ||
    String(body.image_url || "").trim() ||
    ""
  );
}

/**
 * @param {string} eventTicker
 * @param {string} marketTicker
 */
async function fetchEventImage(eventTicker, marketTicker) {
  const body = await fetchEventMetadata(eventTicker);
  return imageFromEventMetadata(body, marketTicker);
}

/**
 * @param {Record<string, unknown>} market
 * @param {{
 *   seriesTicker?: string;
 *   imageUrl?: string;
 *   featured?: boolean;
 *   title?: string;
 *   eventTitle?: string;
 *   tags?: string[];
 *   seriesTitle?: string;
 *   category?: string;
 * }} extra
 * @returns {FeaturedKalshiMarket}
 */
function toFeaturedMarket(market, extra = {}) {
  const ticker = String(market.ticker || "").trim().toUpperCase();
  const imageUrl =
    extra.imageUrl ||
    String(market.image_url || market.featured_image_url || "").trim() ||
    undefined;
  const eventTitle = String(extra.eventTitle || "").trim() || undefined;
  const tags = Array.isArray(extra.tags)
    ? extra.tags.map((tag) => String(tag || "").trim()).filter(Boolean).slice(0, 4)
    : [];
  return {
    ticker,
    eventTicker: String(market.event_ticker || "").trim().toUpperCase(),
    seriesTicker: String(
      extra.seriesTicker || market.series_ticker || "",
    )
      .trim()
      .toUpperCase(),
    title:
      String(extra.title || "").trim() ||
      String(market.title || market.yes_sub_title || ticker).trim() ||
      ticker,
    subtitle: String(market.yes_sub_title || "").trim() || undefined,
    status: String(market.status || "").trim() || "open",
    lastPriceDollars: toNum(market.last_price_dollars),
    volume24h: toNum(market.volume_24h_fp),
    volume: toNum(market.volume_fp),
    openInterest: toNum(market.open_interest_fp),
    imageUrl,
    featured: extra.featured === true || isKalshiDiscoveryFeaturedFlag(market),
    eventTitle,
    tags,
    seriesTitle: extra.seriesTitle || undefined,
    category: extra.category || undefined,
    raw: market,
  };
}

/**
 * @param {FeaturedKalshiMarket[]} pool
 * @param {{ limit: number; excludeTickers?: string[] }} opts
 * @returns {FeaturedKalshiMarket[]}
 */
function pickFromFeaturedPool(pool, opts) {
  const limit = opts.limit;
  const exclude = new Set(
    (Array.isArray(opts.excludeTickers) ? opts.excludeTickers : [])
      .map((t) => String(t || "").trim().toUpperCase())
      .filter(Boolean),
  );
  if (!pool.length) return [];
  const preferred = exclude.size
    ? pool.filter((m) => !exclude.has(String(m.ticker || "").toUpperCase()))
    : pool;
  const source = preferred.length >= Math.min(limit, pool.length) ? preferred : pool;
  return source.slice(0, limit);
}

/**
 * @returns {Promise<FeaturedKalshiMarket[]>}
 */
async function getFeaturedPool() {
  if (featuredCache && Date.now() - featuredCache.at < FEATURED_CACHE_TTL_MS) {
    return featuredCache.markets;
  }

  const marketHits = await Promise.all(
    SEED_SERIES.map(async (seriesTicker) => {
      try {
        const markets = await fetchTopOpenMarketsForSeries(seriesTicker, FEATURED_PER_SERIES);
        return markets.map((market) => ({ seriesTicker, market }));
      } catch {
        return [];
      }
    }),
  );

  /** @type {Map<string, { seriesTicker: string; market: Record<string, unknown>; vol: number }>} */
  const byTicker = new Map();
  for (const hit of marketHits.flat()) {
    if (!hit?.market) continue;
    const ticker = String(hit.market.ticker || "").trim().toUpperCase();
    if (!ticker) continue;
    const vol =
      toNum(hit.market.volume_24h_fp) ?? toNum(hit.market.volume_fp) ?? 0;
    const prev = byTicker.get(ticker);
    if (!prev || vol > prev.vol) {
      byTicker.set(ticker, { seriesTicker: hit.seriesTicker, market: hit.market, vol });
    }
  }

  const scored = [...byTicker.values()]
    .sort((a, b) => b.vol - a.vol)
    .slice(0, FEATURED_POOL_SIZE);

  const withImages = await Promise.all(
    scored.map(async ({ seriesTicker, market }) => {
      const ticker = String(market.ticker || "").trim().toUpperCase();
      const eventTicker = String(market.event_ticker || "").trim().toUpperCase();
      const imageUrl = await fetchEventImage(eventTicker, ticker);
      return toFeaturedMarket(market, { seriesTicker, imageUrl });
    }),
  );

  featuredCache = { at: Date.now(), markets: withImages };
  return withImages;
}

/**
 * Highest-volume live Kalshi markets for hub demo initial state.
 * Cached in-process (~5 min) as a larger pool so refresh can rotate results.
 *
 * @param {{
 *   limit?: number;
 *   excludeTickers?: string[];
 * }} [opts]
 * @returns {Promise<FeaturedKalshiMarket[]>}
 */
export async function fetchKalshiLiveFeaturedMarkets(opts = {}) {
  const limit = Math.max(1, Math.min(12, Math.floor(Number(opts.limit) || FEATURED_LIMIT_DEFAULT)));
  const pool = await getFeaturedPool();
  return pickFromFeaturedPool(pool, { limit, excludeTickers: opts.excludeTickers });
}

/**
 * @returns {Promise<Record<string, unknown>[]>}
 */
async function fetchAllOpenDiscoveryMarkets() {
  /** @type {Record<string, unknown>[]} */
  const all = [];
  let cursor = "";
  for (let page = 0; page < DISCOVERY_MAX_PAGES; page += 1) {
    const body = await kalshiGet("markets", {
      status: "open",
      mve_filter: "exclude",
      limit: DISCOVERY_PAGE_LIMIT,
      cursor: cursor || undefined,
    });
    const batch = Array.isArray(body?.markets) ? body.markets : [];
    for (const row of batch) {
      if (row && typeof row === "object") all.push(row);
    }
    cursor = String(body?.cursor || "").trim();
    if (!cursor || batch.length === 0) break;
  }
  return all;
}

/**
 * @param {string} eventTicker
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function fetchEvent(eventTicker) {
  if (!eventTicker) return null;
  try {
    const body = await kalshiGet(`events/${encodeURIComponent(eventTicker)}`);
    const event = body?.event;
    return event && typeof event === "object" ? event : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} seriesTicker
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function fetchSeries(seriesTicker) {
  if (!seriesTicker) return null;
  try {
    const body = await kalshiGet(`series/${encodeURIComponent(seriesTicker)}`);
    const series = body?.series;
    return series && typeof series === "object" ? series : null;
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<FeaturedKalshiMarket[]>}
 */
async function loadDiscoveryFeaturedPool() {
  const openMarkets = await fetchAllOpenDiscoveryMarkets();
  const ranked = rankKalshiMarketsForDiscoveryFeatured(openMarkets, 200);
  const picked = diversifyKalshiDiscoveryFeatured(ranked, DISCOVERY_POOL_SIZE);

  const eventTickers = [
    ...new Set(
      picked
        .map((market) => String(market.event_ticker || "").trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  /** @type {Map<string, Record<string, unknown> | null>} */
  const eventByTicker = new Map();
  /** @type {Map<string, Record<string, unknown> | null>} */
  const metadataByEvent = new Map();
  await Promise.all(
    eventTickers.map(async (eventTicker) => {
      const [event, metadata] = await Promise.all([
        fetchEvent(eventTicker),
        fetchEventMetadata(eventTicker),
      ]);
      eventByTicker.set(eventTicker, event);
      metadataByEvent.set(eventTicker, metadata);
    }),
  );

  const seriesTickers = [
    ...new Set(
      picked
        .map((market) => {
          const eventTicker = String(market.event_ticker || "").trim().toUpperCase();
          const event = eventByTicker.get(eventTicker);
          return String(
            market.series_ticker || event?.series_ticker || "",
          )
            .trim()
            .toUpperCase();
        })
        .filter(Boolean),
    ),
  ];
  /** @type {Map<string, Record<string, unknown> | null>} */
  const seriesByTicker = new Map();
  await Promise.all(
    seriesTickers.map(async (seriesTicker) => {
      seriesByTicker.set(seriesTicker, await fetchSeries(seriesTicker));
    }),
  );

  const markets = picked.map((market) => {
    const ticker = String(market.ticker || "").trim().toUpperCase();
    const eventTicker = String(market.event_ticker || "").trim().toUpperCase();
    const event = eventByTicker.get(eventTicker);
    const seriesTicker = String(
      market.series_ticker || event?.series_ticker || "",
    )
      .trim()
      .toUpperCase();
    const series = seriesByTicker.get(seriesTicker);
    const eventTitle = String(event?.title || event?.sub_title || "").trim();
    return toFeaturedMarket(market, {
      featured: isKalshiDiscoveryFeaturedFlag(market),
      seriesTicker,
      seriesTitle: String(series?.title || "").trim() || undefined,
      category: String(series?.category || "").trim() || undefined,
      eventTitle: eventTitle || undefined,
      title: composeKalshiFeaturedTitle(market, event),
      tags: tagsFromKalshiSeries(series),
      imageUrl: imageFromEventMetadata(metadataByEvent.get(eventTicker), ticker) || undefined,
    });
  });
  if (markets.length) {
    discoveryCache = { at: Date.now(), v: DISCOVERY_CACHE_VERSION, markets };
  }
  return markets;
}

/**
 * @returns {Promise<FeaturedKalshiMarket[]>}
 */
async function getDiscoveryFeaturedPool() {
  if (
    discoveryCache &&
    discoveryCache.v === DISCOVERY_CACHE_VERSION &&
    Date.now() - discoveryCache.at < DISCOVERY_CACHE_TTL_MS
  ) {
    return discoveryCache.markets;
  }
  if (discoveryInflight) return discoveryInflight;
  discoveryInflight = loadDiscoveryFeaturedPool().finally(() => {
    discoveryInflight = null;
  });
  return discoveryInflight;
}

/**
 * Compare-landing featured Kalshi markets: one discovery GET /markets per 24h,
 * ranked by featured flag (if present) then volume. Cached in-process.
 *
 * @param {{
 *   limit?: number;
 *   excludeTickers?: string[];
 * }} [opts]
 * @returns {Promise<FeaturedKalshiMarket[]>}
 */
export async function fetchKalshiLiveDiscoveryFeaturedMarkets(opts = {}) {
  const limit = Math.max(
    1,
    Math.min(20, Math.floor(Number(opts.limit) || DISCOVERY_LIMIT_DEFAULT)),
  );
  const pool = await getDiscoveryFeaturedPool();
  return pickFromFeaturedPool(pool, { limit, excludeTickers: opts.excludeTickers });
}
