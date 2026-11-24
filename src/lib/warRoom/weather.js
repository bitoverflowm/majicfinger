import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";
import {
  FEATURED_WEATHER_CLINYC,
  FEATURED_WEATHER_NWS_STATION,
  FEATURED_WEATHER_SERIES,
  NWS_USER_AGENT,
  NYC_COORDINATES,
  SOURCE_TIMEOUT_MS,
} from "./constants";
import { featuredWeatherPoint, pointGeometry } from "./geography";
import { warRoomMarketId, warRoomSignalId } from "./ids";

function toNum(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function cToF(c) {
  if (c == null) return null;
  return Math.round((c * 9) / 5 + 32);
}

async function fetchJson(url, headers = {}, timeoutMs = SOURCE_TIMEOUT_MS) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", ...headers },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body?.message === "string" ? body.message : `${res.status} ${url}`,
    );
  }
  return body;
}

function thresholdLabel(market) {
  const yes = String(market.yes_sub_title || "").trim();
  if (yes) return yes;
  const floor = toNum(market.floor_strike);
  const cap = toNum(market.cap_strike);
  if (floor != null && cap != null) return `${floor}° to ${cap}°`;
  if (floor != null) return `${floor + 1}° or above`;
  if (cap != null) return `${cap - 1}° or below`;
  return String(market.ticker || "");
}

function pickFeaturedThreshold(markets) {
  const scored = markets
    .map((m) => {
      const price = toNum(m.last_price_dollars) ?? toNum(m.yes_bid_dollars) ?? 0;
      return { m, dist: Math.abs(price - 0.5), price };
    })
    .sort((a, b) => a.dist - b.dist || (b.price || 0) - (a.price || 0));
  return scored[0]?.m || markets[0];
}

export async function fetchKalshiHighNySeries() {
  const [marketsBody, seriesBody] = await Promise.all([
    fetchJson(
      `${kalshiLiveUrl("markets")}?${new URLSearchParams({
        series_ticker: FEATURED_WEATHER_SERIES,
        status: "open",
        limit: "200",
      })}`,
    ),
    fetchJson(kalshiLiveUrl(`series/${FEATURED_WEATHER_SERIES}`)).catch(() => null),
  ]);
  const markets = Array.isArray(marketsBody?.markets) ? marketsBody.markets : [];
  if (!markets.length) throw new Error("No open KXHIGHNY markets");
  const series = seriesBody?.series || seriesBody || {};
  const settlement = Array.isArray(series.settlement_sources) ? series.settlement_sources[0] : null;
  return { markets, series, settlement };
}

export async function fetchNwsNyc() {
  const [obsBody, pointsBody] = await Promise.all([
    fetchJson(
      `https://api.weather.gov/stations/${FEATURED_WEATHER_NWS_STATION}/observations/latest`,
      { Accept: "application/geo+json", "User-Agent": NWS_USER_AGENT },
    ),
    fetchJson(
      `https://api.weather.gov/points/${NYC_COORDINATES[1]},${NYC_COORDINATES[0]}`,
      { Accept: "application/geo+json", "User-Agent": NWS_USER_AGENT },
    ),
  ]);
  const obs = obsBody?.properties || {};
  const tempC = toNum(obs.temperature?.value);
  const observedTempF = tempC != null ? cToF(tempC) : null;
  const observedAt = String(obs.timestamp || "").trim() || null;

  let forecastHighF = null;
  let forecastIssuedAt = null;
  let forecastName = null;
  let forecastUrl = String(pointsBody?.properties?.forecast || "").trim() || null;
  if (forecastUrl) {
    const fc = await fetchJson(forecastUrl, {
      Accept: "application/geo+json",
      "User-Agent": NWS_USER_AGENT,
    }).catch(() => null);
    const periods = Array.isArray(fc?.properties?.periods) ? fc.properties.periods : [];
    const daytime = periods.find((p) => p?.isDaytime) || periods[0];
    if (daytime) {
      forecastHighF = toNum(daytime.temperature);
      forecastIssuedAt = String(daytime.startTime || fc?.properties?.updateTime || "").trim() || null;
      forecastName = String(daytime.name || "").trim() || null;
    }
  }

  return {
    station: FEATURED_WEATHER_NWS_STATION,
    observedTempF,
    observedAt,
    forecastHighF,
    forecastIssuedAt,
    forecastName,
    forecastUrl,
    rawObservation: obs,
  };
}

function isoFromKalshi(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const n = Date.parse(raw);
  return Number.isFinite(n) ? new Date(n).toISOString() : raw;
}

/**
 * @param {{ markets: Record<string, unknown>[]; series: Record<string, unknown>; settlement: Record<string, unknown> | null }} series
 * @param {Awaited<ReturnType<typeof fetchNwsNyc>> | null} nws
 * @param {string} observedTs
 */
export function weatherStoryFromLive(seriesPack, nws, observedTs) {
  const { markets, series, settlement } = seriesPack;
  const featured = pickFeaturedThreshold(markets);
  const ticker = String(featured.ticker || "").trim().toUpperCase();
  const eventTicker = String(featured.event_ticker || "").trim().toUpperCase();
  const marketId = warRoomMarketId("kalshi", ticker);
  const last = toNum(featured.last_price_dollars);
  const prev = toNum(featured.previous_price_dollars);
  const move =
    last != null && prev != null && prev > 0 ? Number((last - prev).toFixed(4)) : last != null && prev === 0 ? last : null;
  const sourceTs =
    isoFromKalshi(featured.updated_time) ||
    isoFromKalshi(featured.close_time) ||
    observedTs;
  const geo = featuredWeatherPoint();
  const geometry = pointGeometry(geo);
  const settlementName = String(settlement?.name || series.settlement_sources?.[0]?.name || "The Weather Company").trim();
  const settlementUrl = String(settlement?.url || "https://weather.com/kalshi").trim();
  const rulesPrimary = String(featured.rules_primary || "").trim();
  const closeTime = isoFromKalshi(featured.close_time);

  const thresholds = markets
    .map((m) => ({
      ticker: String(m.ticker || "").trim().toUpperCase(),
      label: thresholdLabel(m),
      price: toNum(m.last_price_dollars),
      status: String(m.status || "open"),
    }))
    .filter((row) => row.ticker);

  const quote =
    last != null
      ? {
          marketId,
          outcomeId: "yes",
          quoteType: "last",
          price: last,
          sourceTs,
          observedTs,
          move,
          moveWindow: prev != null ? "vs previous last" : null,
        }
      : null;

  const weather = {
    station: FEATURED_WEATHER_CLINYC,
    stationName: "New York City (CLINYC)",
    nwsStation: FEATURED_WEATHER_NWS_STATION,
    settlementDate: eventTicker.replace(/^KXHIGHNY-/, ""),
    timeConvention: "local calendar day, Eastern Time; last trade 11:59 PM local",
    observedTempF: nws?.observedTempF ?? null,
    observedAt: nws?.observedAt ?? null,
    forecastHighF: nws?.forecastHighF ?? null,
    forecastIssuedAt: nws?.forecastIssuedAt ?? null,
    forecastName: nws?.forecastName ?? null,
    settlementSource: settlementName,
    settlementSourceUrl: settlementUrl,
    rulesPrimary:
      rulesPrimary ||
      `Highest temperature at New York City (${FEATURED_WEATHER_CLINYC}) per ${settlementName}.`,
  };

  /** @type {Array<Record<string, unknown>>} */
  const signals = [];
  if (nws?.forecastHighF != null) {
    signals.push({
      id: warRoomSignalId("forecast", "nws", `${nws.forecastIssuedAt || observedTs}`),
      kind: "forecast",
      source: "nws",
      sourceId: nws.forecastIssuedAt || "forecast",
      sourceUrl: nws.forecastUrl || "https://www.weather.gov/",
      summary: `NWS forecast high ${nws.forecastHighF}°F${nws.forecastName ? ` (${nws.forecastName})` : ""}`,
      occurredAt: nws.forecastIssuedAt || observedTs,
      observedAt: observedTs,
      geometry,
      data: { tempF: nws.forecastHighF, type: "forecast" },
    });
  }
  if (nws?.observedTempF != null) {
    signals.push({
      id: warRoomSignalId("observation", "nws", nws.observedAt || observedTs),
      kind: "observation",
      source: "nws",
      sourceId: nws.observedAt || "obs",
      sourceUrl: `https://api.weather.gov/stations/${FEATURED_WEATHER_NWS_STATION}/observations/latest`,
      summary: `NWS ${FEATURED_WEATHER_NWS_STATION} observation ${nws.observedTempF}°F`,
      occurredAt: nws.observedAt || observedTs,
      observedAt: observedTs,
      geometry,
      data: { tempF: nws.observedTempF, station: FEATURED_WEATHER_NWS_STATION, type: "observation" },
    });
  }
  if (quote) {
    signals.push({
      id: warRoomSignalId("quote", "kalshi", `${ticker}-${sourceTs}`),
      kind: "quote",
      source: "kalshi",
      sourceId: ticker,
      summary: `Yes last ${Math.round(quote.price * 100)}¢${
        quote.move != null ? ` (${quote.move >= 0 ? "+" : ""}${Math.round(quote.move * 100)}¢ vs previous)` : ""
      }`,
      occurredAt: sourceTs,
      observedAt: observedTs,
      data: { price: quote.price, outcomeId: "yes", move: quote.move },
    });
  }

  const market = {
    id: marketId,
    venue: "kalshi",
    venueMarketId: ticker,
    eventTicker,
    seriesTicker: FEATURED_WEATHER_SERIES,
    title: `${String(series.title || "Highest temperature in NYC").trim()} — ${thresholdLabel(featured)}`,
    category: "weather",
    tags: ["weather"],
    desk: "weather",
    status: String(featured.status || "open"),
    region: geo.region,
    geometry,
    precision: geo.precision,
    rulesUrl: `https://kalshi.com/markets/${FEATURED_WEATHER_SERIES.toLowerCase()}`,
    settlementSource: settlementName,
    settlementStation: FEATURED_WEATHER_CLINYC,
    marketUrl: `https://kalshi.com/markets/${FEATURED_WEATHER_SERIES.toLowerCase()}/${eventTicker.toLowerCase()}`,
    outcomes: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
    featured: true,
    volume24h: toNum(featured.volume_24h_fp) ?? toNum(featured.volume_fp),
    imageUrl:
      String(featured.image_url || featured.featured_image_url || "").trim() || "/kalshi.png",
    avatarUrl:
      String(featured.image_url || featured.featured_image_url || "").trim() || "/kalshi.png",
    matchConfidence: 1,
    quote,
    thresholds,
    weather,
    closeTime,
    rulesPrimary,
    rulesSecondary: String(featured.rules_secondary || "").trim() || null,
  };

  const links = signals.map((signal) => ({
    marketId,
    signalId: signal.id,
    matchMethod: signal.kind === "quote" ? "venue_id" : "station_rule",
    reason:
      signal.kind === "quote"
        ? "Kalshi ticker"
        : `NWS ${FEATURED_WEATHER_NWS_STATION} linked to CLINYC daily-high series`,
    confidence: signal.kind === "quote" ? 1 : 0.9,
    createdAt: observedTs,
  }));

  return { market, signals, links, quote };
}
