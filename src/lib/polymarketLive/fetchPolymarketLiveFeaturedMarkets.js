import {
  parseOutcomeList,
  parseTokenIdList,
} from "@/lib/polymarketLive/orderbooksCompose";

const FEATURED_LIMIT_DEFAULT = 8;
const FEATURED_POOL_SIZE = 16;
const FEATURED_CACHE_TTL_MS = 5 * 60_000;

function polymarketApiBase(envVar, fallback) {
  const v = process.env[envVar];
  if (typeof v !== "string" || !v.trim()) return fallback;
  return v.trim().replace(/\/$/, "");
}

const GAMMA_BASE = polymarketApiBase(
  "POLYMARKET_GAMMA_API_URL",
  "https://gamma-api.polymarket.com",
);

/** @type {{ at: number; markets: FeaturedPolymarketMarket[] } | null} */
let featuredCache = null;

/**
 * @typedef {{
 *   tokenId: string;
 *   outcome: string;
 *   lastPrice: number | null;
 * }} FeaturedPolymarketOutcome
 */

/**
 * @typedef {{
 *   id: string;
 *   slug: string;
 *   conditionId: string;
 *   title: string;
 *   volume24h: number | null;
 *   featured: boolean;
 *   outcomes: FeaturedPolymarketOutcome[];
 * }} FeaturedPolymarketMarket
 */

function toNum(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parsePriceList(value) {
  if (Array.isArray(value)) return value.map((v) => toNum(v));
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => toNum(v));
    } catch {
      /* csv */
    }
    return value.split(",").map((part) => toNum(part.trim()));
  }
  return [];
}

/**
 * @param {string} path
 * @param {Record<string, string | number | boolean | undefined | null>} [query]
 */
async function gammaGet(path, query = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v == null || v === "") continue;
    qs.set(k, String(v));
  }
  const url = `${GAMMA_BASE}${path}${qs.toString() ? `?${qs}` : ""}`;
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
          : res.statusText || `Polymarket ${path} failed`,
    );
  }
  return body;
}

/**
 * @param {unknown} raw
 * @param {{ featured?: boolean }} [extra]
 * @returns {FeaturedPolymarketMarket | null}
 */
export function normalizePolymarketFeaturedMarket(raw, extra = {}) {
  if (!raw || typeof raw !== "object") return null;
  const market = /** @type {Record<string, unknown>} */ (raw);
  const tokenIds = parseTokenIdList(
    market.clobTokenIds || market.clob_token_ids || market.tokenIds,
  );
  const outcomes = parseOutcomeList(market.outcomes || market.outcome);
  const prices = parsePriceList(market.outcomePrices || market.outcome_prices);
  if (tokenIds.length < 2) return null;

  const paired = tokenIds.slice(0, Math.max(2, outcomes.length || 2)).map((tokenId, index) => ({
    tokenId,
    outcome: outcomes[index] || (index === 0 ? "Yes" : index === 1 ? "No" : `Outcome ${index + 1}`),
    lastPrice: prices[index] ?? null,
  }));
  if (paired.length < 2) return null;

  const id = String(market.id || market.conditionId || market.condition_id || "").trim();
  const conditionId = String(market.conditionId || market.condition_id || id).trim();
  const slug = String(market.slug || "").trim();
  const title =
    String(market.question || market.title || market.groupItemTitle || slug || id).trim() ||
    slug ||
    id;
  if (!title || (!id && !conditionId && !slug)) return null;

  return {
    id: id || conditionId || slug,
    slug,
    conditionId: conditionId || id,
    title,
    volume24h: toNum(market.volume24hr ?? market.volume24hrClob ?? market.volume),
    featured: extra.featured === true || market.featured === true,
    outcomes: paired,
  };
}

/**
 * @param {unknown} payload
 * @param {{ featured?: boolean }} [extra]
 * @returns {FeaturedPolymarketMarket[]}
 */
function marketsFromPayload(payload, extra = {}) {
  const list = Array.isArray(payload) ? payload : [];
  /** @type {FeaturedPolymarketMarket[]} */
  const out = [];
  for (const raw of list) {
    const market = normalizePolymarketFeaturedMarket(raw, extra);
    if (market) out.push(market);
  }
  return out;
}

/**
 * @param {unknown} payload
 * @returns {FeaturedPolymarketMarket[]}
 */
function marketsFromEventsPayload(payload) {
  const events = Array.isArray(payload) ? payload : [];
  /** @type {FeaturedPolymarketMarket[]} */
  const out = [];
  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    const nested = Array.isArray(event.markets) ? event.markets : [];
    const featured = event.featured === true;
    for (const raw of nested) {
      const market = normalizePolymarketFeaturedMarket(raw, { featured });
      if (market) out.push(market);
    }
  }
  return out;
}

function marketKey(market) {
  return String(market.conditionId || market.id || market.slug).trim();
}

/**
 * @returns {Promise<FeaturedPolymarketMarket[]>}
 */
async function getFeaturedPool() {
  if (featuredCache && Date.now() - featuredCache.at < FEATURED_CACHE_TTL_MS) {
    return featuredCache.markets;
  }

  const [volumeResult, featuredResult] = await Promise.allSettled([
    gammaGet("/markets", {
      closed: false,
      order: "volume24hr",
      ascending: false,
      limit: 24,
    }),
    gammaGet("/events", {
      closed: false,
      featured: true,
      order: "volume",
      ascending: false,
      limit: 12,
    }),
  ]);

  /** @type {Map<string, FeaturedPolymarketMarket>} */
  const byKey = new Map();
  const ingest = (markets) => {
    for (const market of markets) {
      const key = marketKey(market);
      if (!key) continue;
      const prev = byKey.get(key);
      if (!prev || (market.volume24h || 0) > (prev.volume24h || 0)) {
        byKey.set(key, {
          ...market,
          featured: Boolean(prev?.featured || market.featured),
        });
      } else if (market.featured && prev) {
        byKey.set(key, { ...prev, featured: true });
      }
    }
  };

  if (volumeResult.status === "fulfilled") {
    ingest(marketsFromPayload(volumeResult.value));
  }
  if (featuredResult.status === "fulfilled") {
    ingest(marketsFromEventsPayload(featuredResult.value));
  }

  const ranked = [...byKey.values()]
    .filter((market) => market.outcomes.length >= 2)
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return (b.volume24h || 0) - (a.volume24h || 0);
    })
    .slice(0, FEATURED_POOL_SIZE);

  if (!ranked.length) {
    const errParts = [];
    if (volumeResult.status === "rejected") {
      errParts.push(
        volumeResult.reason instanceof Error
          ? volumeResult.reason.message
          : "volume markets failed",
      );
    }
    if (featuredResult.status === "rejected") {
      errParts.push(
        featuredResult.reason instanceof Error
          ? featuredResult.reason.message
          : "featured events failed",
      );
    }
    throw new Error(
      errParts.join("; ") || "No high-volume Polymarket markets available right now.",
    );
  }

  featuredCache = { at: Date.now(), markets: ranked };
  return ranked;
}

/**
 * Highest-volume / featured live Polymarket markets for hub hero charts.
 *
 * @param {{ limit?: number; excludeIds?: string[] }} [opts]
 * @returns {Promise<FeaturedPolymarketMarket[]>}
 */
export async function fetchPolymarketLiveFeaturedMarkets(opts = {}) {
  const limit = Math.max(
    1,
    Math.min(12, Math.floor(Number(opts.limit) || FEATURED_LIMIT_DEFAULT)),
  );
  const exclude = new Set(
    (Array.isArray(opts.excludeIds) ? opts.excludeIds : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  );

  const pool = await getFeaturedPool();
  if (!pool.length) return [];

  const preferred = exclude.size
    ? pool.filter((m) => !exclude.has(marketKey(m)))
    : pool;
  const source = preferred.length >= Math.min(limit, pool.length) ? preferred : pool;
  return source.slice(0, limit);
}
