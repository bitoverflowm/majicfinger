import { fetchPolymarketLiveFeaturedMarkets } from "@/lib/polymarketLive/fetchPolymarketLiveFeaturedMarkets";

const DATA_API_BASE = (process.env.POLYMARKET_DATA_API_URL || "https://data-api.polymarket.com").trim().replace(/\/$/, "");

const DAY_MS = 86_400_000;
/** Markets about to close (games, daily crypto) make a poor walkthrough: they stop moving mid-read. */
const MIN_DAYS_OPEN = 3;
const SHORT_LIVED = /up or down|\bvs\.?\b|\bo\/u\b|spread|game \d|map \d|\d{1,2}(:\d\d)?\s?(am|pm)\b/i;
/** Topics with steady news coverage, so the price-and-news chart has headlines to show. */
const CURATED = /\bfed\b|interest rate|inflation|\bcpi\b|recession|tariff|election|nomination|president|senate|\bhouse\b|ceasefire|blockade|hormuz|shutdown/i;

/** Resolved, so it always loads; used only when Polymarket's live lists can't be read. */
const FALLBACK_MARKET = {
  kind: "market",
  conditionId: "0xd5d9fc47718bd553592d126b1fa5e87183d27f3936975b0c04cc0f2dec1f1bb4",
  title: "Will the Democratic Party control the House after the 2026 Midterm elections?",
  slug: "will-the-democratic-party-control-the-house-after-the-2026-midterm-elections",
};

const FALLBACK_TRADER = {
  kind: "trader",
  address: "0x56687bf447db6ffa42ffe2204a05edaa20f55839",
  title: "Theo4",
};

/** Wallets with this much volume load fast enough for a page someone is reading top to bottom. */
const TRADER_VOLUME_MIN = 100_000;
const TRADER_VOLUME_MAX = 50_000_000;

function isNamed(name) {
  const value = String(name || "").trim();
  return !!value && !/^0x[a-fA-F0-9]{40}(-\d+)?$/.test(value);
}

/** Live Polymarket markets that stay open a while, news-heavy topics first. */
export async function pickMarkets() {
  const markets = await fetchPolymarketLiveFeaturedMarkets({ limit: 12 });
  const now = Date.now();
  const usable = markets.filter((market) => {
    const end = Date.parse(market.endDate || "");
    if (Number.isFinite(end) && end - now < MIN_DAYS_OPEN * DAY_MS) return false;
    return market.conditionId && !SHORT_LIVED.test(market.title);
  });
  const curated = (market) => CURATED.test(`${market.title} ${market.eventTitle || ""} ${(market.tags || []).join(" ")}`);
  const ranked = [...usable.filter(curated), ...usable.filter((market) => !curated(market))];
  return ranked.map((market) => ({
    kind: "market",
    conditionId: market.conditionId,
    title: market.title,
    slug: market.slug,
    volume24h: market.volume24h,
  }));
}

async function pickTrader() {
  const params = new URLSearchParams({ time_period: "month", category: "overall", sort_by: "PNL", limit: "25" });
  const res = await fetch(`${DATA_API_BASE}/v2/leaderboard?${params}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Leaderboard ${res.status}`);
  const body = await res.json();
  const rows = Array.isArray(body?.data) ? body.data : [];
  const pick = rows.find((row) => {
    const volume = Number(row?.volume);
    return isNamed(row?.user_name) && Number(row?.pnl) > 0 && volume >= TRADER_VOLUME_MIN && volume <= TRADER_VOLUME_MAX;
  });
  if (!pick) return null;
  return { kind: "trader", address: String(pick.user_id).toLowerCase(), title: String(pick.user_name).trim() };
}

/**
 * The market and trader every landing page opens on, plus a few more live markets to suggest.
 * `example` is true when Polymarket's live lists couldn't be read and the saved fallbacks are in use.
 */
export async function loadHolderLandingSubjects() {
  const [markets, trader] = await Promise.allSettled([pickMarkets(), pickTrader()]);
  const list = markets.status === "fulfilled" ? markets.value : [];
  const market = list[0] || FALLBACK_MARKET;
  return {
    market: { kind: "market", conditionId: market.conditionId, title: market.title, slug: market.slug },
    suggestions: list.slice(0, 8).map(({ conditionId, title, slug }) => ({ kind: "market", conditionId, title, slug })),
    trader: (trader.status === "fulfilled" && trader.value) || FALLBACK_TRADER,
    marketIsFallback: !list.length,
  };
}
