import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

const FEATURED_LIMIT_DEFAULT = 5;
const FEATURED_CACHE_TTL_MS = 5 * 60_000;

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
 *   raw: Record<string, unknown>;
 * }} FeaturedKalshiMarket
 */

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
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function fetchTopOpenMarketForSeries(seriesTicker) {
  const body = await kalshiGet("markets", {
    series_ticker: seriesTicker,
    status: "open",
    mve_filter: "exclude",
    limit: 100,
  });
  const markets = Array.isArray(body?.markets) ? body.markets : [];
  if (!markets.length) return null;

  let best = null;
  let bestVol = -1;
  for (const m of markets) {
    if (!m || typeof m !== "object") continue;
    const vol = toNum(m.volume_24h_fp) ?? toNum(m.volume_fp) ?? 0;
    if (vol > bestVol) {
      bestVol = vol;
      best = /** @type {Record<string, unknown>} */ (m);
    }
  }
  return best;
}

/**
 * @param {string} eventTicker
 * @param {string} marketTicker
 */
async function fetchEventImage(eventTicker, marketTicker) {
  if (!eventTicker) return "";
  try {
    const body = await kalshiGet(`events/${encodeURIComponent(eventTicker)}/metadata`);
    const details = Array.isArray(body?.market_details) ? body.market_details : [];
    const match = details.find(
      (d) =>
        String(d?.market_ticker || "")
          .trim()
          .toUpperCase() === marketTicker,
    );
    return (
      String(match?.image_url || "").trim() ||
      String(body?.featured_image_url || "").trim() ||
      String(body?.image_url || "").trim() ||
      ""
    );
  } catch {
    return "";
  }
}

/**
 * @param {Record<string, unknown>} market
 * @param {{ seriesTicker?: string; imageUrl?: string }} extra
 * @returns {FeaturedKalshiMarket}
 */
function toFeaturedMarket(market, extra = {}) {
  const ticker = String(market.ticker || "").trim().toUpperCase();
  return {
    ticker,
    eventTicker: String(market.event_ticker || "").trim().toUpperCase(),
    seriesTicker: String(extra.seriesTicker || "").trim().toUpperCase(),
    title: String(market.title || market.yes_sub_title || ticker).trim() || ticker,
    subtitle: String(market.yes_sub_title || "").trim() || undefined,
    status: String(market.status || "").trim() || "open",
    lastPriceDollars: toNum(market.last_price_dollars),
    volume24h: toNum(market.volume_24h_fp),
    volume: toNum(market.volume_fp),
    openInterest: toNum(market.open_interest_fp),
    imageUrl: extra.imageUrl || undefined,
    raw: market,
  };
}

/**
 * Highest-volume live Kalshi markets for hub demo initial state.
 * Cached in-process (~5 min).
 *
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<FeaturedKalshiMarket[]>}
 */
export async function fetchKalshiLiveFeaturedMarkets(opts = {}) {
  const limit = Math.max(1, Math.min(12, Math.floor(Number(opts.limit) || FEATURED_LIMIT_DEFAULT)));

  if (featuredCache && Date.now() - featuredCache.at < FEATURED_CACHE_TTL_MS) {
    return featuredCache.markets.slice(0, limit);
  }

  const marketHits = await Promise.all(
    SEED_SERIES.map(async (seriesTicker) => {
      try {
        const market = await fetchTopOpenMarketForSeries(seriesTicker);
        if (!market) return null;
        return { seriesTicker, market };
      } catch {
        return null;
      }
    }),
  );

  const scored = marketHits
    .filter(Boolean)
    .map((hit) => {
      const vol =
        toNum(hit.market.volume_24h_fp) ?? toNum(hit.market.volume_fp) ?? 0;
      return { ...hit, vol };
    })
    .sort((a, b) => b.vol - a.vol)
    .slice(0, limit);

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
