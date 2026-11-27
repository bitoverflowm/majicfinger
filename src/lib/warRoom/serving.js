import { holderTerminalHref } from "@/lib/holderLanding/pages";
import {
  activityMatchesCategory,
  CATEGORIES,
  kalshiSeriesCategoriesForWarRoom,
  matchesCategory,
  normalizeCategory,
  normalizeExploreFeed,
} from "@/lib/markets/exploreCategories";
import {
  fetchKalshiLiveMarketByTicker,
  fetchKalshiLiveMarketsBySeriesCategories,
  fetchKalshiLiveTradableMarkets,
} from "@/lib/kalshiLive/fetchKalshiLiveFeaturedMarkets";
import {
  fetchPolymarketMarketByConditionId,
  fetchPolymarketMarketsByExploreFeed,
  fetchPolymarketMarketsByTagSlug,
} from "@/lib/polymarketLive/fetchPolymarketLiveFeaturedMarkets";
import { fetchLiveWarRoomSources, fromKalshiFeatured, fromPolymarketFeatured } from "./adapters";
import {
  DESKTOP_POINT_CAP,
  FEED_ROW_CAP,
  MOBILE_POINT_CAP,
  NEWS_ACTIVITY_CAP,
  POLL_INTERVAL_MS,
  PREVIEW_CACHE_TTL_MS,
  PREVIEW_STORY_CAP,
  SNAPSHOT_CACHE_TTL_MS,
  TRADE_ACTIVITY_CAP,
  WAR_ROOM_MODEL_VERSION,
} from "./constants";
import { allowFixtureFallback, isWarRoomFixtureForced } from "./flags";
import { buildFixtureBundle, fixtureLinkedSignal } from "./fixture";
import { normalizeDesk, warRoomHref } from "./href";
import { decodeCursor, encodeCursor, parseWarRoomMarketId } from "./ids";
import { isFeaturedWeatherMarket, rankMarkets } from "./ranking";
import { sortSignals } from "./timeline";

/** @typedef {"poll"} WarRoomTransport */

const MARKET_LOOKUP_TIMEOUT_MS = 4_000;
const BOOST_CACHE_TTL_MS = SNAPSHOT_CACHE_TTL_MS * 2;
const RECENT_MARKET_TTL_MS = 10 * 60_000;

let liveMemo = { at: 0, bundle: null, inflight: null };
let lastGoodLive = /** @type {ReturnType<typeof normalizeBundle> | null} */ (null);
/** @type {Map<string, { at: number; market: Record<string, unknown> }>} */
const recentMarkets = new Map();
/** @type {Map<string, { at: number; markets: Array<Record<string, unknown>>; inflight: Promise<Array<Record<string, unknown>>> | null }>} */
const boostMemo = new Map();

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]);
}

function rememberMarkets(markets) {
  const now = Date.now();
  for (const market of markets || []) {
    const id = String(market?.id || "").trim();
    if (!id) continue;
    recentMarkets.set(id, { at: now, market });
  }
  if (recentMarkets.size > 2_000) {
    const cutoff = now - RECENT_MARKET_TTL_MS;
    for (const [id, row] of recentMarkets) {
      if (row.at < cutoff) recentMarkets.delete(id);
    }
  }
}

function rememberedMarket(id) {
  const hit = recentMarkets.get(id);
  if (!hit) return null;
  if (Date.now() - hit.at > RECENT_MARKET_TTL_MS) {
    recentMarkets.delete(id);
    return null;
  }
  return hit.market;
}

/** @internal test helper: seed globe/snapshot markets without a live fetch. */
export function rememberWarRoomMarkets(markets) {
  rememberMarkets(markets);
}

function peekLiveBundle() {
  return liveMemo.bundle || lastGoodLive;
}

function emptyBundleFor(market) {
  return normalizeBundle({
    asOf: nowIso(),
    fixture: false,
    markets: market ? [market] : [],
    signals: [],
    links: [],
    activity: [],
    featuredMarketId: market?.id || null,
  });
}

async function cachedBoost(key, loader) {
  const now = Date.now();
  const hit = boostMemo.get(key);
  if (hit && !hit.inflight && Array.isArray(hit.markets) && now - hit.at < BOOST_CACHE_TTL_MS) {
    return hit.markets;
  }
  if (!hit?.inflight) {
    const inflight = Promise.resolve()
      .then(loader)
      .then((markets) => {
        const rows = Array.isArray(markets) ? markets : [];
        boostMemo.set(key, { at: Date.now(), markets: rows, inflight: null });
        return rows;
      })
      .catch((err) => {
        const prev = boostMemo.get(key);
        boostMemo.set(key, {
          at: prev?.at || 0,
          markets: prev?.markets || [],
          inflight: null,
        });
        throw err;
      });
    boostMemo.set(key, { at: hit?.at || 0, markets: hit?.markets || [], inflight });
  }
  const current = boostMemo.get(key);
  if (current?.markets?.length) return current.markets;
  return current?.inflight || [];
}

/** Clamp an optional progressive boostLimit to the venue default max. */
function resolveBoostLimit(requested, defaultLimit) {
  const def = Math.max(1, Math.floor(Number(defaultLimit) || DESKTOP_POINT_CAP));
  const raw = Number(requested);
  if (!Number.isFinite(raw) || raw <= 0) return def;
  return Math.max(1, Math.min(def, Math.floor(raw)));
}

/**
 * Prefer a warmer/fuller cache entry when a progressive tier asks for fewer rows.
 * @param {string} fullKey
 * @param {number} limit
 */
function sliceCachedBoost(fullKey, limit) {
  const now = Date.now();
  const hit = boostMemo.get(fullKey);
  if (!hit || hit.inflight || !Array.isArray(hit.markets) || now - hit.at >= BOOST_CACHE_TTL_MS) {
    return null;
  }
  if (!hit.markets.length) return null;
  return hit.markets.slice(0, Math.max(1, limit));
}

function nowIso(ms = Date.now()) {
  return new Date(ms).toISOString();
}

function ageMs(asOf, now = Date.now()) {
  const t = Date.parse(String(asOf || ""));
  return Number.isFinite(t) ? Math.max(0, now - t) : 0;
}

function normalizeBundle(raw, { fixture = false, stale = false } = {}) {
  const asOf = raw.asOf || nowIso();
  const markets = Array.isArray(raw.markets) ? raw.markets : [];
  const ranked = rankMarkets(markets, { now: Date.parse(asOf) || Date.now() });
  return {
    version: WAR_ROOM_MODEL_VERSION,
    asOf,
    fixture: Boolean(fixture || raw.fixture),
    fixtureLabel: fixture || raw.fixture ? raw.fixtureLabel || "Lab fixture" : null,
    stale: Boolean(stale),
    transport: "poll",
    pollIntervalMs: raw.pollIntervalMs || POLL_INTERVAL_MS,
    freshness: raw.freshness || {},
    markets: ranked,
    signals: sortSignals(raw.signals || []),
    links: Array.isArray(raw.links) ? raw.links : [],
    activity: Array.isArray(raw.activity) ? raw.activity : [],
    featuredMarketId: raw.featuredMarketId || ranked.find(isFeaturedWeatherMarket)?.id || ranked[0]?.id || null,
  };
}

async function loadLiveBundle() {
  const now = Date.now();
  if (liveMemo.bundle && now - liveMemo.at < SNAPSHOT_CACHE_TTL_MS) {
    return liveMemo.bundle;
  }

  if (!liveMemo.inflight) {
    liveMemo.inflight = fetchLiveWarRoomSources()
      .then((live) => {
        if (!live.liveOk) throw new Error("No live War Room markets");
        const bundle = normalizeBundle({
          asOf: live.observedTs,
          fixture: false,
          freshness: live.freshness,
          markets: live.markets,
          signals: live.signals,
          links: live.links,
          activity: live.activity,
          featuredMarketId: live.featuredMarketId,
          pollIntervalMs: POLL_INTERVAL_MS,
        });
        rememberMarkets(bundle.markets);
        liveMemo = { at: Date.now(), bundle, inflight: null };
        lastGoodLive = bundle;
        return bundle;
      })
      .catch((err) => {
        liveMemo.inflight = null;
        throw err;
      });
  }

  // Serve the last good bundle immediately while a refresh runs so market
  // lookups and homepage polls don't stall the Next server for ~12s.
  const stale = liveMemo.bundle || lastGoodLive;
  if (stale) return stale;
  return liveMemo.inflight;
}

/**
 * @param {{ forceFixture?: boolean }} [opts]
 */
export async function loadWarRoomBundle(opts = {}) {
  if (opts.forceFixture || isWarRoomFixtureForced()) {
    return normalizeBundle(buildFixtureBundle(), { fixture: true });
  }

  try {
    return await loadLiveBundle();
  } catch (err) {
    if (lastGoodLive) {
      return {
        ...lastGoodLive,
        stale: true,
        freshness: Object.fromEntries(
          Object.entries(lastGoodLive.freshness || {}).map(([key, value]) => [
            key,
            { ...value, status: value.status === "ok" ? "stale" : value.status, ageMs: ageMs(lastGoodLive.asOf) },
          ]),
        ),
      };
    }
    if (allowFixtureFallback()) {
      return normalizeBundle(buildFixtureBundle(), { fixture: true });
    }
    return normalizeBundle({
      asOf: nowIso(),
      fixture: false,
      freshness: {
        kalshi: { asOf: nowIso(), status: "error", ageMs: 0, error: String(err?.message || err) },
        polymarket: { asOf: nowIso(), status: "missing", ageMs: 0 },
        nws: { asOf: nowIso(), status: "missing", ageMs: 0 },
        news: { asOf: nowIso(), status: "idle", ageMs: 0 },
      },
      markets: [],
      signals: [],
      links: [],
      featuredMarketId: null,
    });
  }
}

function marketDesk(market) {
  if (market?.category === "weather" || market?.desk === "weather") return "weather";
  if (market?.category === "geopolitics" || market?.desk === "geopolitics") return "geopolitics";
  return "global";
}

function matchesDesk(market, desk) {
  if (desk === "all") return true;
  return marketDesk(market) === desk;
}

/**
 * Map Gamma/explore rows into War Room markets, skipping ids already present.
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} observedTs
 * @param {Set<string>} existingIds
 * @param {(market: Record<string, unknown>) => boolean} [accept]
 */
function mapBoostedMarkets(rows, observedTs, existingIds, accept) {
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const mapped = fromPolymarketFeatured(row, observedTs);
    if (!mapped?.market) continue;
    if (accept && !accept(mapped.market)) continue;
    if (seen.has(mapped.market.id)) continue;
    // Always keep boosted rows in `out`. The feed pool is built from this list
    // (plus Kalshi), so skipping desk duplicates used to drop most tradable markets.
    seen.add(mapped.market.id);
    existingIds.add(mapped.market.id);
    out.push(mapped.market);
  }
  return out;
}

/**
 * When a category chip is active, pull volume-ranked Polymarket markets for that
 * tag so the globe / rail aren't limited to the small featured pool.
 * @param {string} category
 * @param {string} observedTs
 * @param {Set<string>} existingIds
 */
async function categoryPolymarketBoost(category, observedTs, existingIds, boostLimit) {
  const definition = CATEGORIES.find((row) => row.id === category);
  if (!definition) return [];
  const tagSlug = definition.tags[0];
  if (!tagSlug) return [];
  const limit = resolveBoostLimit(boostLimit, 120);
  const fullKey = `poly-tag:${tagSlug}`;
  try {
    const fromFull = sliceCachedBoost(fullKey, limit);
    if (fromFull) {
      for (const market of fromFull) existingIds.add(market.id);
      return fromFull;
    }
    const cacheKey = limit >= 120 ? fullKey : `${fullKey}:L${limit}`;
    const boosted = await cachedBoost(cacheKey, async () => {
      const rows = await fetchPolymarketMarketsByTagSlug(tagSlug, { limit });
      // Trust Gamma's event tag filter — don't re-drop rows whose local tags omit the
      // chip slug (e.g. politics events tagged "Elections" but not "politics").
      return mapBoostedMarkets(rows, observedTs, new Set()).map((market) => ({
        ...market,
        category,
        tags: [...new Set([...(market.tags || []), category, tagSlug].filter(Boolean))],
      }));
    });
    for (const market of boosted) existingIds.add(market.id);
    return boosted;
  } catch {
    return [];
  }
}

/**
 * Same category chip → Kalshi GET /series?category=… then open markets.
 * Without this, Kalshi-only + category is empty (desk featured rarely matches).
 * @param {string} category
 * @param {string} observedTs
 * @param {Set<string>} existingIds
 */
async function categoryKalshiBoost(category, observedTs, existingIds, boostLimit) {
  const kalshiCategories = kalshiSeriesCategoriesForWarRoom(category);
  if (!kalshiCategories.length) return [];
  const limit = resolveBoostLimit(boostLimit, 100);
  const fullKey = `kalshi-cat:${kalshiCategories.join(",")}`;
  try {
    const fromFull = sliceCachedBoost(fullKey, limit);
    const boosted =
      fromFull ||
      (await cachedBoost(limit >= 100 ? fullKey : `${fullKey}:L${limit}`, async () => {
        const rows = await fetchKalshiLiveMarketsBySeriesCategories({
          categories: kalshiCategories,
          limit,
        });
        /** @type {Array<Record<string, unknown>>} */
        const out = [];
        const seen = new Set();
        for (const row of rows) {
          const mapped = fromKalshiFeatured(row, observedTs);
          if (!mapped?.market) continue;
          if (seen.has(mapped.market.id)) continue;
          seen.add(mapped.market.id);
          out.push({
            ...mapped.market,
            category,
            tags: [...new Set([...(mapped.market.tags || []), category, ...kalshiCategories].filter(Boolean))],
          });
        }
        return out;
      }));
    return boosted.filter((market) => {
      if (existingIds.has(market.id)) return false;
      existingIds.add(market.id);
      return true;
    });
  } catch {
    return [];
  }
}

function exploreFeedDefaultLimit(exploreFeed) {
  if (exploreFeed === "tradable" || exploreFeed === "volume" || exploreFeed === "liquidity") {
    return 220;
  }
  if (exploreFeed === "new" || exploreFeed === "trending" || exploreFeed === "competitive") {
    return 160;
  }
  return 100;
}

/**
 * When an Explore feed chip is active, pull that Gamma ranking onto the globe.
 * War Room then re-sorts the rail/map by volume.
 * @param {string} exploreFeed
 * @param {string} observedTs
 * @param {Set<string>} existingIds
 * @param {number} [boostLimit] Progressive tier — fewer Gamma pages before the full cap.
 */
async function exploreFeedPolymarketBoost(exploreFeed, observedTs, existingIds, boostLimit) {
  if (!exploreFeed) return [];
  const defaultLimit = exploreFeedDefaultLimit(exploreFeed);
  const limit = resolveBoostLimit(boostLimit, defaultLimit);
  const fullKey = `poly-feed:${exploreFeed}`;
  try {
    const fromFull = sliceCachedBoost(fullKey, limit);
    if (fromFull) {
      for (const market of fromFull) existingIds.add(market.id);
      return fromFull;
    }
    const cacheKey = limit >= defaultLimit ? fullKey : `${fullKey}:L${limit}`;
    const boosted = await cachedBoost(cacheKey, async () => {
      const rows = await fetchPolymarketMarketsByExploreFeed(exploreFeed, { limit });
      return mapBoostedMarkets(rows, observedTs, new Set());
    });
    for (const market of boosted) existingIds.add(market.id);
    return boosted;
  } catch {
    return [];
  }
}

/**
 * Kalshi counterpart to Gamma explore boosts. Without this, “all tradable” + Kalshi
 * only shows the tiny featured/seed desk (~a few NFL rows).
 * @param {string} exploreFeed
 * @param {string} observedTs
 * @param {Set<string>} existingIds
 * @param {number} [boostLimit] Progressive tier — slice pool sooner when a fuller cache exists.
 */
async function exploreFeedKalshiBoost(exploreFeed, observedTs, existingIds, boostLimit) {
  if (!exploreFeed) return [];
  // Featured / new / trending stay on the desk seed pool; tradable/volume need a real pull.
  if (
    exploreFeed !== "tradable" &&
    exploreFeed !== "volume" &&
    exploreFeed !== "liquidity"
  ) {
    return [];
  }
  const defaultLimit = 220;
  const limit = resolveBoostLimit(boostLimit, defaultLimit);
  const fullKey = `kalshi-feed:${exploreFeed}`;
  const mapRows = (rows) => {
    /** @type {Array<Record<string, unknown>>} */
    const out = [];
    const seen = new Set();
    for (const row of rows || []) {
      const mapped = fromKalshiFeatured(row, observedTs);
      if (!mapped?.market) continue;
      if (seen.has(mapped.market.id)) continue;
      seen.add(mapped.market.id);
      out.push(mapped.market);
    }
    return out;
  };
  const take = (markets) =>
    markets.filter((market) => {
      if (existingIds.has(market.id)) return false;
      existingIds.add(market.id);
      return true;
    });
  try {
    const fromFull = sliceCachedBoost(fullKey, limit);
    if (fromFull) return take(fromFull);

    // Mid progressive tiers: never block on the full ~80-series pull.
    // Paint poly (+ any Kalshi partials) now; background fill warms the full cache.
    if (limit < defaultLimit) {
      const partialRows = await fetchKalshiLiveTradableMarkets({ limit, wait: false });
      void fetchKalshiLiveTradableMarkets({ limit: defaultLimit, wait: true })
        .then((fullRows) => {
          const mapped = mapRows(fullRows);
          if (mapped.length) {
            boostMemo.set(fullKey, { at: Date.now(), markets: mapped, inflight: null });
          }
        })
        .catch(() => {});
      return take(mapRows(partialRows));
    }

    const boosted = await cachedBoost(fullKey, async () => {
      const rows = await fetchKalshiLiveTradableMarkets({ limit, wait: true });
      return mapRows(rows);
    });
    return take(boosted);
  } catch {
    return [];
  }
}

/** War Room Markets rail is always volume language — sort by 24h volume. */
function sortMarketsByVolume(markets) {
  return [...markets].sort((a, b) => {
    const av = Number(a.volume24h) || 0;
    const bv = Number(b.volume24h) || 0;
    if (bv !== av) return bv - av;
    return Math.abs(Number(b.quote?.move) || 0) - Math.abs(Number(a.quote?.move) || 0);
  });
}

/**
 * For dual-venue tradable desks, reserve half the point cap per venue so a
 * client Kalshi/Polymarket filter still has a dense volume-ranked set after
 * the mixed top-N slice (Polymarket USD volume otherwise crowds Kalshi out).
 * @param {Array<Record<string, unknown>>} markets
 * @param {number} cap
 * @param {string} exploreFeed
 */
function rankMarketsForDesk(markets, cap, exploreFeed) {
  const sorted = sortMarketsByVolume(markets);
  const take = Math.max(1, Math.floor(Number(cap) || 1));
  if (
    exploreFeed !== "tradable" &&
    exploreFeed !== "volume" &&
    exploreFeed !== "liquidity"
  ) {
    return sorted.slice(0, take);
  }
  /** @type {Array<Record<string, unknown>>} */
  const kalshi = [];
  /** @type {Array<Record<string, unknown>>} */
  const polymarket = [];
  /** @type {Array<Record<string, unknown>>} */
  const other = [];
  for (const market of sorted) {
    if (market?.venue === "kalshi") kalshi.push(market);
    else if (market?.venue === "polymarket") polymarket.push(market);
    else other.push(market);
  }
  if (!kalshi.length || !polymarket.length) return sorted.slice(0, take);

  const reserved = Math.max(1, Math.floor(take / 2));
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  const seen = new Set();
  for (const market of [...kalshi.slice(0, reserved), ...polymarket.slice(0, reserved)]) {
    if (seen.has(market.id)) continue;
    seen.add(market.id);
    out.push(market);
  }
  for (const market of sorted) {
    if (out.length >= take) break;
    if (seen.has(market.id)) continue;
    seen.add(market.id);
    out.push(market);
  }
  return sortMarketsByVolume(out);
}

function signalsForMarket(bundle, marketId) {
  const ids = new Set(
    (bundle.links || [])
      .filter((link) => link.marketId === marketId)
      .map((link) => link.signalId),
  );
  return sortSignals((bundle.signals || []).filter((signal) => ids.has(signal.id) || signal.marketId === marketId));
}

function linkedSignal(bundle, market) {
  const signals = signalsForMarket(bundle, market.id);
  const preferred =
    signals.find((s) => s.kind === "observation") ||
    signals.find((s) => s.kind === "headline") ||
    signals.find((s) => s.kind === "forecast") ||
    signals.find((s) => s.kind === "fill") ||
    signals[0] ||
    (bundle.fixture ? fixtureLinkedSignal() : null);
  return preferred || null;
}

function storyFromMarket(bundle, market) {
  const quote = market.quote || null;
  const signal = linkedSignal(bundle, market);
  const desk = marketDesk(market);
  return {
    id: market.id,
    title: market.title,
    venue: market.venue,
    category: market.category,
    desk,
    status: market.status,
    region: market.region,
    href: warRoomHref({ desk: desk === "global" ? "all" : desk, market: market.id }),
    quote,
    signal: signal
      ? {
          id: signal.id,
          kind: signal.kind,
          summary: signal.summary,
          occurredAt: signal.occurredAt,
          source: signal.source,
        }
      : null,
    fixture: Boolean(bundle.fixture),
    weather: market.weather || null,
    geometry: market.geometry || null,
  };
}

function feedRow(bundle, market) {
  const quote = market.quote;
  const signal = linkedSignal(bundle, market);
  return {
    id: market.id,
    title: market.title,
    venue: market.venue,
    desk: marketDesk(market),
    category: market.category,
    tags: Array.isArray(market.tags) ? market.tags : [],
    region: market.region || "Global",
    status: market.status,
    price: quote?.price ?? null,
    move: quote?.move ?? null,
    moveWindow: quote?.moveWindow ?? null,
    volume24h: Number.isFinite(Number(market.volume24h)) ? Number(market.volume24h) : null,
    imageUrl:
      market.imageUrl ||
      (market.venue === "polymarket" ? "/polymarket.png" : market.venue === "kalshi" ? "/kalshi.png" : null),
    avatarUrl:
      market.avatarUrl ||
      market.imageUrl ||
      (market.venue === "polymarket" ? "/polymarket.png" : market.venue === "kalshi" ? "/kalshi.png" : null),
    slug: market.slug || null,
    venueMarketId: market.venueMarketId || null,
    // YES first so live charts don't flip between Yes (~8¢) and No (~98¢).
    tokenIds: (() => {
      const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
      const yes = outcomes.find((o) => String(o?.label || o?.id || "").toLowerCase().startsWith("yes"));
      const rest = outcomes.filter((o) => o !== yes);
      return [yes, ...rest].map((o) => o?.tokenId).filter(Boolean);
    })(),
    outcomes: Array.isArray(market.outcomes) ? market.outcomes : [],
    quoteAt: quote?.sourceTs || quote?.observedTs || null,
    signalSummary: signal?.summary || null,
    signalKind: signal?.kind || null,
    href: warRoomHref({ desk: marketDesk(market) === "global" ? "all" : marketDesk(market), market: market.id }),
    // Point for nav pick → globe focus when the market isn't already in `features`.
    geometry: market.geometry?.type === "Point" ? market.geometry : null,
  };
}

function activityRows(bundle) {
  const fromBundle = Array.isArray(bundle.activity) ? bundle.activity : [];
  if (fromBundle.length) {
    return fromBundle
      .slice()
      .sort((a, b) => Date.parse(String(b.occurredAt || 0)) - Date.parse(String(a.occurredAt || 0)))
      .slice(0, TRADE_ACTIVITY_CAP + NEWS_ACTIVITY_CAP)
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        venue: row.venue || row.source,
        marketId: row.marketId || null,
        title: row.title || row.summary,
        summary: row.summary || row.title,
        occurredAt: row.occurredAt || row.observedAt || null,
        region: row.region || null,
        geometry: row.geometry || null,
        sourceUrl: row.sourceUrl || null,
        data: row.data || null,
      }));
  }
  // Fixture / older bundles: derive from signals.
  return sortSignals(bundle.signals || [])
    .filter((s) => s.kind === "fill" || s.kind === "headline")
    .slice(0, TRADE_ACTIVITY_CAP + NEWS_ACTIVITY_CAP)
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      venue: row.source,
      marketId: row.marketId || null,
      title: row.title || row.summary,
      summary: row.summary || row.title,
      occurredAt: row.occurredAt || row.observedAt || null,
      region: null,
      geometry: row.geometry || null,
      sourceUrl: row.sourceUrl || null,
      data: row.data || null,
    }));
}

function featureFromMarket(market) {
  const geometry = market.geometry;
  if (!geometry || geometry.type !== "Point") return null;
  return {
    type: "Feature",
    id: market.id,
    geometry,
    properties: {
      id: market.id,
      title: market.title,
      venue: market.venue,
      desk: marketDesk(market),
      category: market.category,
      tags: Array.isArray(market.tags) ? market.tags : [],
      price: market.quote?.price ?? null,
      move: market.quote?.move ?? null,
      status: market.status,
      marker: market.category === "weather" ? "weather" : market.category === "geopolitics" ? "geopolitics" : "market",
    },
  };
}

function cursorFor(bundle, desk) {
  return encodeCursor({
    v: WAR_ROOM_MODEL_VERSION,
    asOf: bundle.asOf,
    desk,
    fixture: Boolean(bundle.fixture),
  });
}

export function isCursorExpired(cursor, bundle, desk) {
  const parsed = decodeCursor(cursor);
  if (!parsed) return true;
  if (parsed.desk && parsed.desk !== desk) return true;
  if (Boolean(parsed.fixture) !== Boolean(bundle.fixture)) return true;
  if (parsed.asOf !== bundle.asOf) return false;
  return false;
}

/**
 * @param {{ forceFixture?: boolean }} [opts]
 */
export async function getWarRoomPreview(opts = {}) {
  const bundle = await loadWarRoomBundle(opts);
  const stories = bundle.markets.slice(0, PREVIEW_STORY_CAP).map((market) => storyFromMarket(bundle, market));
  return {
    version: WAR_ROOM_MODEL_VERSION,
    asOf: bundle.asOf,
    fixture: bundle.fixture,
    fixtureLabel: bundle.fixtureLabel,
    stale: bundle.stale,
    transport: bundle.transport,
    pollIntervalMs: bundle.pollIntervalMs,
    freshness: bundle.freshness,
    stories,
    featured: stories[0] || null,
    href: stories[0]?.href || "/war-room",
    status: stories.length ? (bundle.stale ? "stale" : "ok") : "empty",
  };
}

/**
 * @param {{
 *   desk?: string;
 *   market?: string;
 *   category?: string;
 *   exploreFeed?: string;
 *   mobile?: boolean;
 *   cursor?: string;
 *   forceFixture?: boolean;
 *   shell?: boolean; // Skip Gamma boosts — fast paint from cached desk bundle.
 *   boostLimit?: number; // Progressive tier — cap venue boosts before the full desk.
 * }} [opts]
 */
export async function getWarRoomSnapshot(opts = {}) {
  const desk = normalizeDesk(opts.desk);
  const category = normalizeCategory(opts.category);
  // Category wins over feed (same as Holder Explore). Otherwise default to tradable.
  const exploreFeed = category ? "" : normalizeExploreFeed(opts.exploreFeed);
  const bundle = await loadWarRoomBundle(opts);
  const marketId = String(opts.market || "").trim();
  const existingIds = new Set(bundle.markets.map((market) => market.id));
  const shell = Boolean(opts.shell);
  const boostLimit = shell ? undefined : opts.boostLimit;

  // Shell skips the Gamma / Kalshi tradable round-trips so the client can paint from the
  // cached desk immediately, then replace with progressive / full boosted snapshots.
  const [polyFeedBoosted, kalshiFeedBoosted] =
    !shell && exploreFeed
      ? await Promise.all([
          exploreFeedPolymarketBoost(exploreFeed, bundle.asOf, existingIds, boostLimit),
          exploreFeedKalshiBoost(exploreFeed, bundle.asOf, existingIds, boostLimit),
        ])
      : [[], []];
  const feedBoosted = [...polyFeedBoosted, ...kalshiFeedBoosted];
  const [categoryPolyBoosted, categoryKalshiBoosted] = !shell && category
    ? await Promise.all([
        categoryPolymarketBoost(category, bundle.asOf, existingIds, boostLimit),
        categoryKalshiBoost(category, bundle.asOf, existingIds, boostLimit),
      ])
    : [[], []];
  const categoryBoosted = [...categoryPolyBoosted, ...categoryKalshiBoosted];

  /** @type {Array<Record<string, unknown>>} */
  let pool;
  if (category && shell) {
    // Fast path: filter the cached desk in-process (no Gamma / Kalshi series). Full fetch replaces this.
    pool = bundle.markets.filter((market) => matchesCategory(market, category));
  } else if (category) {
    // Category view: Gamma Polymarket + Kalshi series-category markets + desk matches.
    // Always prefer the boost when the chip is active — even if a venue returned 0 rows —
    // so we don't silently fall back to the unfiltered featured pool.
    const deskMatches = bundle.markets.filter((market) => matchesCategory(market, category));
    pool = [...categoryBoosted];
    const poolIds = new Set(pool.map((market) => market.id));
    for (const market of deskMatches) {
      if (poolIds.has(market.id)) continue;
      poolIds.add(market.id);
      pool.push(market);
    }
  } else if (feedBoosted.length) {
    // Feed view: Gamma + Kalshi tradable boosts, plus any remaining desk rows.
    pool = [...feedBoosted];
    const poolIds = new Set(pool.map((market) => market.id));
    for (const market of bundle.markets) {
      if (poolIds.has(market.id)) continue;
      poolIds.add(market.id);
      pool.push(market);
    }
  } else {
    pool = bundle.markets;
  }

  rememberMarkets(pool);

  const filtered = pool.filter(
    (market) =>
      matchesDesk(market, desk) && (!category || matchesCategory(market, category)),
  );
  const cap = opts.mobile ? MOBILE_POINT_CAP : DESKTOP_POINT_CAP;
  const ranked = rankMarketsForDesk(filtered, cap, exploreFeed);
  const marketById = new Map(pool.map((market) => [market.id, market]));
  const filteredIds = new Set(ranked.map((market) => market.id));
  let features = ranked.map(featureFromMarket).filter(Boolean).slice(0, cap);
  // Full map index (globe can show more points than the right-rail list).
  let mapMarkets = ranked.slice(0, cap).map((market) => feedRow(bundle, market));
  // Rail: keep volume order, but for dual-venue tradable reserve slots so a
  // Kalshi-only filter still has a real list (not ~3 survivors of mixed top-48).
  const feedRanked = rankMarketsForDesk(filtered, FEED_ROW_CAP, exploreFeed);
  let feed = feedRanked.slice(0, FEED_ROW_CAP).map((market) => feedRow(bundle, market));
  const activity = activityRows(bundle).filter((row) => {
    if (category) return activityMatchesCategory(row, category, marketById);
    // All tradable: keep the full activity stream.
    if (!exploreFeed || exploreFeed === "tradable") return true;
    if (row.marketId && filteredIds.has(row.marketId)) return true;
    if (row.kind !== "headline") return false;
    const related = Array.isArray(row.data?.markets) ? row.data.markets : [];
    for (const item of related) {
      const condition = String(item?.condition_id || item?.conditionId || "").trim();
      const ticker = String(item?.ticker || "").trim().toUpperCase();
      if (condition && filteredIds.has(`polymarket:${condition}`)) return true;
      if (ticker && filteredIds.has(`kalshi:${ticker}`)) return true;
    }
    return false;
  });
  const newsPings = activity
    .filter((row) => row.kind === "headline" && row.geometry?.type === "Point")
    .slice(0, NEWS_ACTIVITY_CAP)
    .map((row) => ({
      type: "Feature",
      id: row.id,
      geometry: row.geometry,
      properties: {
        id: row.id,
        kind: "headline",
        title: row.title,
        marker: "news",
      },
    }));
  let selected = marketId
    ? ranked.find((m) => m.id === marketId) ||
      pool.find(
        (m) =>
          m.id === marketId &&
          matchesDesk(m, desk) &&
          (!category || matchesCategory(m, category)),
      )
    : null;

  // Nav / deep-link picks often aren't in the tradable top-N. Look the contract up
  // and inject it so the client can pin, zoom, and open detail immediately.
  if (marketId && !selected) {
    const parsed = parseWarRoomMarketId(marketId);
    let found = findKnownMarket(marketId, bundle) || null;
    if (!found && parsed && !shell) {
      found = await lookupVenueMarket(parsed);
    }
    if (found) {
      rememberMarkets([found]);
      selected = found;
      marketById.set(found.id, found);
      const row = feedRow(bundle, found);
      let feat = featureFromMarket(found);
      // Nav picks must always land a map pin — synthesize geometry if lookup had none.
      if (!feat && found.id) {
        const fallback = found.geometry?.type === "Point"
          ? found.geometry
          : { type: "Point", coordinates: [-77.0365, 38.8977] };
        feat = {
          type: "Feature",
          id: found.id,
          geometry: fallback,
          properties: {
            id: found.id,
            title: found.title || found.id,
            venue: found.venue || "",
            price: found.quote?.price ?? null,
          },
        };
        if (!found.geometry) found.geometry = fallback;
      }
      if (feat && !features.some((f) => String(f?.properties?.id || f?.id) === found.id)) {
        features = [feat, ...features].slice(0, cap + 1);
      }
      if (!mapMarkets.some((m) => m.id === found.id)) {
        mapMarkets = [row, ...mapMarkets];
      }
      if (!feed.some((m) => m.id === found.id)) {
        feed = [row, ...feed].slice(0, FEED_ROW_CAP + 1);
      }
    }
  }

  const selectedValid = selected ? selected : marketId ? null : ranked[0] || null;
  const invalidMarket = Boolean(marketId && parseWarRoomMarketId(marketId) && !selectedValid);
  const missingMarket = Boolean(marketId && !parseWarRoomMarketId(marketId));

  return {
    version: WAR_ROOM_MODEL_VERSION,
    asOf: bundle.asOf,
    fixture: bundle.fixture,
    fixtureLabel: bundle.fixtureLabel,
    stale: bundle.stale,
    transport: bundle.transport,
    pollIntervalMs: bundle.pollIntervalMs,
    freshness: bundle.freshness,
    desk,
    category: category || null,
    exploreFeed: exploreFeed || null,
    cursor: cursorFor(bundle, desk),
    features: { type: "FeatureCollection", features },
    pings: { type: "FeatureCollection", features: newsPings },
    mapMarkets,
    feed,
    activity,
    selectedMarketId: selectedValid?.id || null,
    emptyReason: !filtered.length
      ? pool.length
        ? category
          ? "no_markets_in_category"
          : exploreFeed
            ? "no_markets_in_feed"
            : "no_markets_in_desk"
        : "no_snapshot"
      : invalidMarket || missingMarket
        ? "invalid_market"
        : null,
    globalCount: pool.filter((m) => marketDesk(m) === "global").length,
    status: filtered.length || selectedValid ? (bundle.stale ? "stale" : "ok") : "empty",
  };
}

function researchLinks(market) {
  const links = [];
  if (market.venue === "polymarket") {
    links.push({
      label: "Research Holders",
      href: holderTerminalHref({
        kind: "market",
        conditionId: market.venueMarketId,
        title: market.title,
      }),
      stub: false,
    });
    if (market.slug || market.marketUrl) {
      links.push({ label: "Polymarket", href: market.marketUrl, stub: false });
    }
  }
  if (market.venue === "kalshi") {
    links.push({ label: "Kalshi contract", href: market.marketUrl || market.rulesUrl, stub: false });
    links.push({ label: "Kalshi Live hub", href: "/kalshi-live-data", stub: false });
  }
  links.push({
    label: "Ask Jarvis",
    href: "/jarvis",
    stub: true,
    reason: "Jarvis handoff is launch-gated; entry point is stubbed for this slice.",
  });
  return links;
}

function missingMarketPayload(bundle, parsed) {
  return {
    version: WAR_ROOM_MODEL_VERSION,
    asOf: bundle?.asOf || nowIso(),
    fixture: Boolean(bundle?.fixture),
    fixtureLabel: bundle?.fixtureLabel || null,
    status: parsed ? "not_found" : "invalid_id",
    market: null,
    quote: null,
    timeline: [],
    links: [],
    freshness: bundle?.freshness || {},
  };
}

function marketDetailPayload(bundle, market) {
  const timeline = signalsForMarket(bundle, market.id);
  const resolved = market.status === "resolved" || market.status === "closed";
  return {
    version: WAR_ROOM_MODEL_VERSION,
    asOf: bundle.asOf,
    fixture: bundle.fixture,
    fixtureLabel: bundle.fixtureLabel,
    stale: bundle.stale,
    status: resolved ? "resolved" : "ok",
    market,
    quote: market.quote || null,
    rules: {
      primary: market.rulesPrimary || market.weather?.rulesPrimary || null,
      secondary: market.rulesSecondary || null,
      url: market.rulesUrl || null,
      settlementSource: market.settlementSource || market.weather?.settlementSource || null,
      settlementStation: market.settlementStation || market.weather?.station || null,
    },
    weather: market.weather || null,
    timeline,
    links: researchLinks(market),
    freshness: bundle.freshness,
  };
}

async function lookupVenueMarket(parsed) {
  try {
    if (parsed.venue === "polymarket") {
      const row = await withTimeout(
        fetchPolymarketMarketByConditionId(parsed.venueMarketId),
        MARKET_LOOKUP_TIMEOUT_MS,
        "polymarket-market",
      );
      if (!row) return null;
      return fromPolymarketFeatured(row, nowIso())?.market || null;
    }
    if (parsed.venue === "kalshi") {
      const row = await withTimeout(
        fetchKalshiLiveMarketByTicker(parsed.venueMarketId),
        MARKET_LOOKUP_TIMEOUT_MS,
        "kalshi-market",
      );
      if (!row) return null;
      return fromKalshiFeatured(row, nowIso())?.market || null;
    }
  } catch {
    return null;
  }
  return null;
}

function findKnownMarket(id, bundle) {
  return bundle?.markets?.find((row) => row.id === id) || rememberedMarket(id) || null;
}

/**
 * @param {string} id
 * @param {{ forceFixture?: boolean }} [opts]
 */
export async function getWarRoomMarket(id, opts = {}) {
  const parsed = parseWarRoomMarketId(id);

  if (opts.forceFixture || isWarRoomFixtureForced()) {
    const bundle = await loadWarRoomBundle(opts);
    const market = bundle.markets.find((row) => row.id === id) || null;
    if (!market) return missingMarketPayload(bundle, parsed);
    return marketDetailPayload(bundle, market);
  }

  if (!parsed) {
    return missingMarketPayload(peekLiveBundle() || emptyBundleFor(null), parsed);
  }

  const cachedBundle = peekLiveBundle();
  let market = findKnownMarket(id, cachedBundle);
  if (market) {
    rememberMarkets([market]);
    return marketDetailPayload(cachedBundle || emptyBundleFor(market), market);
  }

  // Globe markers come from Gamma/explore boosts, not the small featured pool.
  // Look the contract up directly instead of waiting ~12s on the full live bundle
  // and then 404ing.
  market = await lookupVenueMarket(parsed);
  if (market) {
    rememberMarkets([market]);
    return marketDetailPayload(cachedBundle || emptyBundleFor(market), market);
  }

  if (cachedBundle) {
    return missingMarketPayload(cachedBundle, parsed);
  }

  // Cold process with no snapshot yet: wait once for the featured pool.
  const bundle = await loadWarRoomBundle(opts);
  market = bundle.markets.find((row) => row.id === id) || null;
  if (!market) return missingMarketPayload(bundle, parsed);
  rememberMarkets([market]);
  return marketDetailPayload(bundle, market);
}

export function previewCacheControl() {
  const ttl = Math.round(PREVIEW_CACHE_TTL_MS / 1000);
  return `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`;
}

export function snapshotCacheControl() {
  const ttl = Math.round(SNAPSHOT_CACHE_TTL_MS / 1000);
  return `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`;
}

/** Test helper: drop in-memory live cache. */
export function resetWarRoomCache() {
  liveMemo = { at: 0, bundle: null, inflight: null };
  lastGoodLive = null;
  recentMarkets.clear();
  boostMemo.clear();
}
