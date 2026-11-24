import { FEATURED_WEATHER_SERIES, LARGE_FILL_USD } from "./constants";

function num(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function ts(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Date.parse(String(value || ""));
  return Number.isFinite(n) ? n : 0;
}

export function isFeaturedWeatherMarket(market) {
  return String(market?.seriesTicker || "").toUpperCase() === FEATURED_WEATHER_SERIES;
}

/**
 * Explicit featured list first (NYC daily high), then type, freshness, magnitude, confidence.
 *
 * @param {Array<Record<string, unknown>>} markets
 * @param {{ now?: number }} [opts]
 */
export function rankMarkets(markets, opts = {}) {
  const now = opts.now || Date.now();
  const list = Array.isArray(markets) ? markets : [];
  return [...list]
    .map((market, index) => ({ market, index, score: scoreMarket(market, now) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    })
    .map((row) => row.market);
}

function scoreMarket(market, now) {
  let score = 0;
  if (isFeaturedWeatherMarket(market)) score += 1_000_000;
  if (market?.featured === true) score += 80_000;
  const category = String(market?.category || "");
  if (category === "weather") score += 40_000;
  if (category === "geopolitics") score += 30_000;

  const quoteTs = ts(market?.quote?.sourceTs || market?.quote?.observedTs);
  if (quoteTs) {
    const ageMin = Math.max(0, (now - quoteTs) / 60_000);
    score += Math.max(0, 20_000 - ageMin * 40);
  }

  const move = Math.abs(num(market?.quote?.move));
  score += move * 100_000;

  const volume = num(market?.volume24h);
  score += Math.min(15_000, Math.log10(volume + 1) * 3_000);

  const confidence = num(market?.matchConfidence);
  score += confidence * 5_000;
  return score;
}

/**
 * @param {Record<string, unknown>} signal
 */
export function isLargeFill(signal) {
  const notional = num(signal?.data?.notionalUsd ?? signal?.notionalUsd);
  return String(signal?.kind) === "fill" && notional >= LARGE_FILL_USD;
}

export function fillDisplayState(signal) {
  if (String(signal?.kind) !== "fill") return null;
  const attributed = Boolean(signal?.data?.attributed && signal?.data?.wallet);
  if (attributed) return "attributed_fill";
  return isLargeFill(signal) ? "large_fill" : "fill";
}
