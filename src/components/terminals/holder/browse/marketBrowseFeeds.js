import { polymarketGet } from "@/components/dashboardComposer/recipes/polymarketTradeHistorySource";

/**
 * @typedef {{
 *   conditionId: string;
 *   question: string;
 *   slug: string;
 *   eventTitle: string;
 *   icon: string;
 *   tags: string[];
 *   tokenIds: string[];
 *   outcomes: string[];
 *   prices: number[];
 *   createdAt: number | null;
 *   endAt: number | null;
 *   gameAt: number | null;
 *   closedAt: number | null;
 *   volume24h: number | null;
 *   volume: number | null;
 *   liquidity: number | null;
 *   change24h: number | null;
 *   bestBid: number | null;
 *   bestAsk: number | null;
 *   acceptingOrders: boolean | null;
 *   closed: boolean;
 *   winner: string;
 * }} BrowseMarket
 */

const TRADABLE_TTL_MS = 5 * 60_000;
const GAMMA_TTL_MS = 2 * 60_000;
const GAMMA_LIST_LIMIT = 300;
/** Gamma returns at most 100 markets a request. */
const GAMMA_PAGE = 100;
const TRENDING_POOL = 500;
const TRENDING_MIN_VOLUME = 5_000;
const STAT_BATCH = 50;
/** Gamma refuses offsets past this; deeper pages go through the keyset endpoint. */
const GAMMA_MAX_OFFSET = 2000;
const GAMMA_CONCURRENCY = 7;
/** Safety stop for the keyset walk (about 3,300 open markets trade $1k a day). */
const KEYSET_MAX_PAGES = 80;

/** What makes a market competitive. Starter thresholds, meant to be tuned. */
export const COMPETITIVE = {
  /** Widest bid/ask gap allowed, in dollars per share (0.03 = 3¢). */
  maxSpread: 0.03,
  minVolume24h: 1_000,
};

/** Tags Polymarket uses for its own plumbing, never shown as a category chip. */
const NOISE_TAG = /^(hide from new|recurring|earn \d|hfc|parent for derivative|pre-market|pyth|season stats|all)/i;

export const FEEDS = [
  { id: "tradable", label: "All tradable markets" },
  { id: "new", label: "Just listed" },
  { id: "closed", label: "Recently closed" },
  { id: "volume", label: "By volume" },
  { id: "liquidity", label: "By liquidity" },
  { id: "competitive", label: "Competitive" },
  { id: "trending", label: "Trending" },
];

/** Category chips filter the tradable list by the tags Polymarket puts on each market. */
export const CATEGORIES = [
  { id: "politics", label: "Politics", tags: ["politics"] },
  { id: "sports", label: "Sports", tags: ["sports"] },
  { id: "crypto", label: "Crypto", tags: ["crypto"] },
  { id: "economics", label: "Economics", tags: ["economy", "economics", "fed", "fed rates", "inflation", "macro"] },
  { id: "finance", label: "Finance", tags: ["finance", "stocks", "equities"] },
  { id: "tech", label: "Tech", tags: ["tech", "ai", "big tech"] },
  { id: "geopolitics", label: "Geopolitics", tags: ["geopolitics", "world", "world affairs"] },
  { id: "elections", label: "Elections", tags: ["elections", "global elections"] },
  { id: "culture", label: "Culture", tags: ["culture", "movies", "music", "awards"] },
  { id: "weather", label: "Weather", tags: ["weather"] },
];

const CATEGORY_TAGS = new Map(CATEGORIES.map((category) => [category.id, new Set(category.tags)]));

export function inCategory(market, categoryId) {
  const wanted = CATEGORY_TAGS.get(categoryId);
  if (!wanted) return false;
  return market.tags.some((tag) => wanted.has(tag.toLowerCase()));
}

export function displayTags(market, max = 2) {
  return market.tags.filter((tag) => !NOISE_TAG.test(tag)).slice(0, max);
}

/** Accepts ISO strings, Postgres timestamps ("2026-11-08 11:39:33.968+00") and epoch seconds or ms. */
export function toMs(value) {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    return n < 1e12 ? n * 1000 : n;
  }
  const iso = raw
    .replace(" ", "T")
    .replace(/(\.\d{3})\d+/, "$1")
    .replace(/\+00(:00)?$/, "Z");
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function num(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function jsonList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** The day a market sits on in the calendar: when it resolved, else its game, else its end date. */
export function closeAt(market) {
  return market.closedAt ?? market.gameAt ?? market.endAt;
}

/** @returns {BrowseMarket} */
function blank(conditionId) {
  return {
    conditionId,
    question: "",
    slug: "",
    eventTitle: "",
    icon: "",
    tags: [],
    tokenIds: [],
    outcomes: [],
    prices: [],
    createdAt: null,
    endAt: null,
    gameAt: null,
    closedAt: null,
    volume24h: null,
    volume: null,
    liquidity: null,
    change24h: null,
    bestBid: null,
    bestAsk: null,
    acceptingOrders: null,
    closed: false,
    winner: "",
  };
}

/** A CLOB tradable-market record. It has prices and tags but no volume or liquidity. */
export function fromClob(raw) {
  const market = blank(String(raw?.condition_id || "").trim());
  const tokens = Array.isArray(raw?.tokens) ? raw.tokens.filter((token) => token && typeof token === "object") : [];
  market.question = String(raw?.question || "").trim();
  market.slug = String(raw?.market_slug || "").trim();
  market.icon = String(raw?.icon || raw?.image || "").trim();
  market.tags = (Array.isArray(raw?.tags) ? raw.tags : []).map((tag) => String(tag || "").trim()).filter(Boolean);
  market.tokenIds = tokens.map((token) => String(token.token_id || ""));
  market.outcomes = tokens.map((token) => String(token.outcome || ""));
  market.prices = tokens.map((token) => num(token.price) ?? NaN);
  market.winner = String(tokens.find((token) => token.winner === true)?.outcome || "");
  market.createdAt = toMs(raw?.accepting_order_timestamp);
  market.endAt = toMs(raw?.end_date_iso);
  market.gameAt = toMs(raw?.game_start_time);
  market.closed = raw?.closed === true;
  return market;
}

/** A Gamma market record, with stats. */
export function fromGamma(raw) {
  const market = blank(String(raw?.conditionId || "").trim());
  const event = Array.isArray(raw?.events) ? raw.events[0] : null;
  market.question = String(raw?.question || "").trim();
  market.slug = String(raw?.slug || "").trim();
  market.eventTitle = String(event?.title || "").trim();
  market.icon = String(raw?.icon || raw?.image || event?.icon || "").trim();
  market.tags = (Array.isArray(raw?.tags) ? raw.tags : [])
    .map((tag) => String(tag?.label || "").trim())
    .filter(Boolean);
  market.tokenIds = jsonList(raw?.clobTokenIds).map(String);
  market.outcomes = jsonList(raw?.outcomes).map(String);
  market.prices = jsonList(raw?.outcomePrices).map((price) => num(price) ?? NaN);
  market.createdAt = toMs(raw?.acceptingOrdersTimestamp) ?? toMs(raw?.startDate) ?? toMs(raw?.createdAt);
  market.endAt = toMs(raw?.endDate);
  market.gameAt = toMs(raw?.gameStartTime);
  market.closedAt = raw?.closed ? toMs(raw?.closedTime) : null;
  market.volume24h = num(raw?.volume24hr);
  market.volume = num(raw?.volumeNum ?? raw?.volume);
  market.liquidity = num(raw?.liquidityNum ?? raw?.liquidity);
  market.change24h = num(raw?.oneDayPriceChange);
  market.bestBid = num(raw?.bestBid);
  market.bestAsk = num(raw?.bestAsk);
  market.acceptingOrders = typeof raw?.acceptingOrders === "boolean" ? raw.acceptingOrders : null;
  market.closed = raw?.closed === true;
  if (market.closed) {
    const won = market.prices.findIndex((price) => price >= 0.99);
    market.winner = won >= 0 ? market.outcomes[won] || "" : "";
  }
  return market;
}

/** A `new_market` socket message. Gamma fills in the end date, icon and prices once it has the market. */
export function fromSocket(msg) {
  const market = blank(String(msg?.market || msg?.condition_id || "").trim());
  const event = msg?.event_message && typeof msg.event_message === "object" ? msg.event_message : null;
  market.question = String(msg?.question || "").trim();
  market.slug = String(msg?.slug || "").trim();
  market.eventTitle = String(event?.title || "").trim();
  market.tags = (Array.isArray(msg?.tags) ? msg.tags : []).map((tag) => String(tag?.label ?? tag ?? "").trim()).filter(Boolean);
  market.tokenIds = (Array.isArray(msg?.assets_ids) ? msg.assets_ids : []).map(String);
  market.outcomes = (Array.isArray(msg?.outcomes) ? msg.outcomes : []).map(String);
  market.createdAt = toMs(msg?.timestamp) ?? Date.now();
  market.gameAt = toMs(msg?.game_start_time);
  return market;
}

/** Stats and dates from Gamma laid over what the CLOB or the socket gave. */
export function withStats(market, stats) {
  if (!stats) return market;
  return {
    ...market,
    eventTitle: market.eventTitle || stats.eventTitle,
    icon: market.icon || stats.icon,
    tags: market.tags.length ? market.tags : stats.tags,
    tokenIds: market.tokenIds.length ? market.tokenIds : stats.tokenIds,
    outcomes: market.outcomes.length ? market.outcomes : stats.outcomes,
    prices: market.prices.some(Number.isFinite) ? market.prices : stats.prices,
    endAt: market.endAt ?? stats.endAt,
    gameAt: market.gameAt ?? stats.gameAt,
    volume24h: stats.volume24h,
    volume: stats.volume,
    liquidity: stats.liquidity,
    change24h: stats.change24h,
  };
}

/* ------------------------------------------------------------------ */
/* Tradable markets: every CLOB page, cached for a few minutes.        */
/* ------------------------------------------------------------------ */

let tradableCache = { at: 0, markets: /** @type {BrowseMarket[]} */ ([]) };

export function cachedTradable() {
  return Date.now() - tradableCache.at < TRADABLE_TTL_MS ? tradableCache.markets : null;
}

/**
 * Walk the CLOB's tradable-market pages (1,000 a page, about 13 pages).
 * @param {{ signal: AbortSignal, onPage: (markets: BrowseMarket[]) => void }} opts
 */
export async function loadTradable({ signal, onPage }) {
  const seen = new Set();
  const markets = [];
  let cursor = "";
  for (let page = 0; page < 40; page += 1) {
    const body = await polymarketGet("getSamplingMarkets", cursor ? { next_cursor: cursor } : {}, signal, { retries: 3 });
    const root = Array.isArray(body) ? body[0] : body;
    const data = Array.isArray(root?.data) ? root.data : [];
    for (const raw of data) {
      const market = fromClob(raw);
      if (!/^0x[a-fA-F0-9]{64}$/.test(market.conditionId) || seen.has(market.conditionId)) continue;
      if (market.closed || raw?.accepting_orders === false) continue;
      seen.add(market.conditionId);
      markets.push(market);
    }
    onPage(markets.slice());
    cursor = String(root?.next_cursor || "").trim();
    if (!cursor || cursor === "LTE=" || !data.length) break;
  }
  tradableCache = { at: Date.now(), markets };
  return markets;
}

/* ------------------------------------------------------------------ */
/* Gamma lists for the other feeds.                                    */
/* ------------------------------------------------------------------ */

const gammaCache = new Map();

const GAMMA_QUERIES = {
  closed: { closed: "true", order: "closedTime", ascending: "false" },
  volume: { closed: "false", order: "volume24hr", ascending: "false" },
  liquidity: { closed: "false", order: "liquidityNum", ascending: "false" },
  trending: { closed: "false", order: "volume24hr", ascending: "false" },
  competitive: { closed: "false", order: "volume24hr", ascending: "false" },
};

export function cachedFeed(feedId) {
  const hit = gammaCache.get(feedId);
  return hit && Date.now() - hit.at < GAMMA_TTL_MS ? hit.markets : null;
}

/** Trending is the open markets with real 24h volume that moved the most in the last day. */
function trending(markets) {
  return markets
    .filter((market) => (market.volume24h ?? 0) >= TRENDING_MIN_VOLUME && market.change24h != null)
    .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
}

/**
 * The quote a market is ranked on, or null when it isn't competitive: a binary market taking
 * orders, with a bid and an ask on both sides, a tight spread and real volume today.
 */
export function competitiveQuote(market) {
  const { bestBid: bid, bestAsk: ask } = market;
  if (market.outcomes.length !== 2 || market.acceptingOrders !== true) return null;
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask >= 1 || ask <= bid) return null;
  // Rounded to a tenth of a cent so 0.43 − 0.40 counts as exactly 3¢.
  const spread = Math.round((ask - bid) * 1000) / 1000;
  if (spread > COMPETITIVE.maxSpread) return null;
  if ((market.volume24h ?? 0) < COMPETITIVE.minVolume24h) return null;
  const mid = (bid + ask) / 2;
  return { bid, ask, mid, spread, distance: Math.round(Math.abs(mid - 0.5) * 10_000) };
}

/** Closest to a coin flip first; ties go to the market that traded more today. */
function competitive(markets) {
  return markets
    .map((market) => ({ market, quote: competitiveQuote(market) }))
    .filter((entry) => entry.quote)
    .sort((a, b) => a.quote.distance - b.quote.distance || (b.market.volume24h ?? 0) - (a.market.volume24h ?? 0))
    .map((entry) => entry.market);
}

function keepNew(rows, seen, into) {
  for (const raw of rows) {
    const market = fromGamma(raw);
    if (!/^0x[a-fA-F0-9]{64}$/.test(market.conditionId) || seen.has(market.conditionId)) continue;
    seen.add(market.conditionId);
    into.push(market);
  }
}

/**
 * Every open market with $1k+ traded today. Gamma's offset pages stop at 2,100 markets, so those
 * load in parallel for a quick first ranking while a keyset walk reaches the rest.
 */
async function loadCompetitive(signal, onProgress) {
  const query = { ...GAMMA_QUERIES.competitive, limit: String(GAMMA_PAGE), include_tag: "true" };
  const seen = new Set();
  const pool = [];

  const offsets = [];
  for (let offset = 0; offset <= GAMMA_MAX_OFFSET; offset += GAMMA_PAGE) offsets.push(offset);
  const fromOffsets = async () => {
    const pages = [];
    let next = 0;
    const worker = async () => {
      while (next < offsets.length) {
        const index = next;
        next += 1;
        const body = await polymarketGet("listMarkets", { ...query, offset: String(offsets[index]) }, signal, { retries: 2 });
        pages[index] = Array.isArray(body) ? body : [];
      }
    };
    await Promise.all(Array.from({ length: GAMMA_CONCURRENCY }, worker));
    keepNew(pages.flat(), seen, pool);
    onProgress?.(competitive(pool));
  };

  const fromKeyset = async () => {
    let cursor = "";
    for (let page = 0; page < KEYSET_MAX_PAGES; page += 1) {
      const body = await polymarketGet("listMarketsKeyset", { ...query, ...(cursor ? { after_cursor: cursor } : {}) }, signal, { retries: 2 });
      const rows = Array.isArray(body?.markets) ? body.markets : [];
      keepNew(rows, seen, pool);
      cursor = String(body?.next_cursor || "").trim();
      const last = num(rows[rows.length - 1]?.volume24hr) ?? 0;
      if (!cursor || !rows.length || last < COMPETITIVE.minVolume24h) break;
    }
  };

  // The deep pages only add the quieter markets, so losing them keeps the first ranking.
  const tail = fromKeyset().catch(() => {});
  await fromOffsets();
  await tail;
  signal?.throwIfAborted();
  return competitive(pool);
}

/** `onProgress` gets a usable list early for feeds that take a while to load completely. */
export async function loadFeed(feedId, signal, onProgress) {
  if (feedId === "competitive") {
    const markets = await loadCompetitive(signal, onProgress);
    gammaCache.set(feedId, { at: Date.now(), markets });
    return markets;
  }
  const query = GAMMA_QUERIES[feedId];
  if (!query) return [];
  const total = feedId === "trending" ? TRENDING_POOL : GAMMA_LIST_LIMIT;
  const offsets = Array.from({ length: Math.ceil(total / GAMMA_PAGE) }, (_, index) => index * GAMMA_PAGE);
  const pages = await Promise.all(
    offsets.map((offset) =>
      polymarketGet("listMarkets", { ...query, limit: String(GAMMA_PAGE), offset: String(offset), include_tag: "true" }, signal, { retries: 2 }),
    ),
  );
  const seen = new Set();
  let markets = pages
    .flatMap((body) => (Array.isArray(body) ? body : []))
    .map(fromGamma)
    .filter((market) => {
      if (!/^0x[a-fA-F0-9]{64}$/.test(market.conditionId) || seen.has(market.conditionId)) return false;
      seen.add(market.conditionId);
      return true;
    });
  if (feedId === "trending") markets = trending(markets);
  gammaCache.set(feedId, { at: Date.now(), markets });
  return markets;
}

/* ------------------------------------------------------------------ */
/* Stats for tradable rows, looked up as they scroll into view.        */
/* ------------------------------------------------------------------ */

/** conditionId → Gamma market, or null when Gamma doesn't know it (yet). */
const statsCache = new Map();

export function cachedStats(conditionId) {
  return statsCache.get(conditionId);
}

export function rememberStats(markets) {
  for (const market of markets) statsCache.set(market.conditionId, market);
}

/** Look up Gamma stats for condition ids not yet cached. Resolves with the ids it filled. */
export async function fetchStats(conditionIds, signal, batchSize = STAT_BATCH) {
  const missing = [...new Set(conditionIds)].filter((id) => id && !statsCache.has(id));
  const filled = [];
  for (let index = 0; index < missing.length; index += batchSize) {
    const batch = missing.slice(index, index + batchSize);
    const body = await polymarketGet(
      "listMarkets",
      { condition_ids: batch.join(","), limit: String(Math.min(batch.length, GAMMA_PAGE)), include_tag: "true" },
      signal,
      { retries: 2 },
    );
    const found = new Map(
      (Array.isArray(body) ? body : []).map((raw) => {
        const market = fromGamma(raw);
        return [market.conditionId.toLowerCase(), market];
      }),
    );
    for (const id of batch) {
      statsCache.set(id, found.get(id.toLowerCase()) || null);
      filled.push(id);
    }
  }
  return filled;
}

/**
 * Stats for a whole list (e.g. to sort every tradable market by volume): batches run a few at
 * a time, and a batch that keeps failing is skipped rather than stopping the rest.
 */
export async function fetchStatsBulk(conditionIds, signal, onProgress, concurrency = 10) {
  const missing = [...new Set(conditionIds)].filter((id) => id && !statsCache.has(id));
  const batches = [];
  for (let index = 0; index < missing.length; index += GAMMA_PAGE) batches.push(missing.slice(index, index + GAMMA_PAGE));
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < batches.length) {
      const batch = batches[next];
      next += 1;
      try {
        await fetchStats(batch, signal, GAMMA_PAGE);
      } catch (err) {
        if (signal?.aborted) throw err;
      }
      done += batch.length;
      onProgress?.(done, missing.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, batches.length) }, worker));
}

/** Gamma indexes a new market a little after the socket announces it, so a miss is retried later. */
export function forgetStats(conditionId) {
  if (statsCache.get(conditionId) === null) statsCache.delete(conditionId);
}
