import { fetchKalshiLiveFeaturedMarkets } from "@/lib/kalshiLive/fetchKalshiLiveFeaturedMarkets";
import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";
import {
  featuredOutcomePriceDollars,
  fetchPolymarketLiveFeaturedMarkets,
} from "@/lib/polymarketLive/fetchPolymarketLiveFeaturedMarkets";
import { fetchWarRoomActivity } from "./activity";
import {
  GEOPOLITICS_SERIES,
  GEOPOLITICS_TITLE_RE,
  SOURCE_TIMEOUT_MS,
} from "./constants";
import { isWeatherSeries, locateMarket, pointGeometry, WEATHER_CITY_SERIES } from "./geography";
import { warRoomMarketId, warRoomSignalId } from "./ids";
import { fetchKalshiHighNySeries, fetchNwsNyc, weatherStoryFromLive } from "./weather";

function toNum(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]);
}

function isoNow() {
  return new Date().toISOString();
}

function isoMaybe(value) {
  const raw = String(value || "").trim();
  if (!raw) return isoNow();
  const n = Date.parse(raw);
  return Number.isFinite(n) ? new Date(n).toISOString() : raw;
}

function isGeopoliticsText(text) {
  return GEOPOLITICS_TITLE_RE.test(String(text || ""));
}

/**
 * @param {Record<string, unknown>} market
 * @param {string} observedTs
 */
export function fromKalshiFeatured(market, observedTs) {
  const ticker = String(market.ticker || "").trim().toUpperCase();
  if (!ticker) return null;
  const seriesTicker = String(market.seriesTicker || market.series_ticker || "").trim().toUpperCase();
  const title = String(market.title || ticker);
  const geo = locateMarket({
    seriesTicker,
    title: `${title} ${market.eventTitle || ""}`,
    tags: market.tags,
  });
  const last = toNum(market.lastPriceDollars ?? market.last_price_dollars);
  const prev = toNum(market.raw?.previous_price_dollars);
  const move = last != null && prev != null && prev > 0 ? Number((last - prev).toFixed(4)) : null;
  const weather = isWeatherSeries(seriesTicker);
  const geopolitics =
    !weather &&
    (isGeopoliticsText(`${title} ${(market.tags || []).join(" ")} ${seriesTicker}`) ||
      GEOPOLITICS_SERIES.includes(seriesTicker));
  const category = weather ? "weather" : geopolitics ? "geopolitics" : "other";
  const id = warRoomMarketId("kalshi", ticker);
  const sourceTs = isoMaybe(market.closeTime || market.raw?.updated_time);
  const quote =
    last != null
      ? {
          marketId: id,
          outcomeId: "yes",
          quoteType: "last",
          price: last,
          sourceTs,
          observedTs,
          move,
          moveWindow: prev != null ? "vs previous last" : null,
        }
      : null;
  return {
    market: {
      id,
      venue: "kalshi",
      venueMarketId: ticker,
      eventTicker: String(market.eventTicker || "").trim().toUpperCase(),
      seriesTicker,
      title,
      category,
      desk: weather ? (geo ? "weather" : "global") : geopolitics && geo ? "geopolitics" : geo ? "global" : "global",
      status: String(market.status || "open"),
      region: geo?.region || "Global",
      geometry: pointGeometry(geo, ticker),
      precision: geo?.precision || "global",
      rulesUrl: `https://kalshi.com/markets/${(seriesTicker || ticker).toLowerCase()}`,
      marketUrl: `https://kalshi.com/markets/${(seriesTicker || ticker).toLowerCase()}`,
      outcomes: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
      featured: Boolean(market.featured),
      volume24h: toNum(market.volume24h),
      imageUrl: String(market.imageUrl || market.image || "").trim() || "/kalshi.png",
      avatarUrl: String(market.imageUrl || market.image || "").trim() || "/kalshi.png",
      matchConfidence: weather ? 0.85 : geopolitics ? 0.7 : geo ? 0.55 : 0.4,
      quote,
    },
    quote,
    signal: quote
      ? {
          id: warRoomSignalId("quote", "kalshi", `${ticker}-${sourceTs}`),
          kind: "quote",
          source: "kalshi",
          sourceId: ticker,
          summary: `Yes last ${Math.round(quote.price * 100)}¢`,
          occurredAt: sourceTs,
          observedAt: observedTs,
          data: { price: quote.price, outcomeId: "yes", move },
        }
      : null,
  };
}

/**
 * @param {Record<string, unknown>} market
 * @param {string} observedTs
 */
export function fromPolymarketFeatured(market, observedTs) {
  const conditionId = String(market.conditionId || market.id || "").trim();
  if (!conditionId) return null;
  const title = String(market.title || market.eventTitle || conditionId);
  const geo = locateMarket({ title: `${title} ${market.eventTitle || ""}`, tags: market.tags });
  const yes = (market.outcomes || []).find((o) => String(o.outcome).toLowerCase() === "yes") || market.outcomes?.[0];
  const price = featuredOutcomePriceDollars(yes?.lastPrice);
  const geopolitics = isGeopoliticsText(`${title} ${(market.tags || []).join(" ")}`);
  const id = warRoomMarketId("polymarket", conditionId);
  const sourceTs = isoMaybe(market.endDate);
  const quote =
    price != null
      ? {
          marketId: id,
          outcomeId: String(yes?.outcome || "Yes").toLowerCase() === "yes" ? "yes" : String(yes?.tokenId || "yes"),
          quoteType: "last",
          price,
          sourceTs: observedTs,
          observedTs,
          move: null,
          moveWindow: null,
        }
      : null;
  const slug = String(market.slug || "").trim();
  return {
    market: {
      id,
      venue: "polymarket",
      venueMarketId: conditionId,
      title,
      category: geopolitics ? "geopolitics" : "other",
      desk: geopolitics ? "geopolitics" : "global",
      status: "open",
      region: geo?.region || "Global",
      geometry: pointGeometry(geo, conditionId),
      precision: geo?.precision || "global",
      rulesUrl: slug ? `https://polymarket.com/event/${slug}` : "https://polymarket.com",
      marketUrl: slug ? `https://polymarket.com/event/${slug}` : "https://polymarket.com",
      outcomes: (market.outcomes || []).map((o) => ({
        id: String(o.outcome || o.tokenId || "").toLowerCase(),
        label: String(o.outcome || "Outcome"),
        tokenId: o.tokenId,
      })),
      featured: Boolean(market.featured),
      volume24h: toNum(market.volume24h),
      imageUrl: String(market.imageUrl || "").trim() || "/polymarket.png",
      avatarUrl: String(market.imageUrl || "").trim() || "/polymarket.png",
      matchConfidence: geopolitics ? 0.75 : 0.4,
      quote,
      slug,
    },
    quote,
    signal: quote
      ? {
          id: warRoomSignalId("quote", "polymarket", `${conditionId}-${observedTs}`),
          kind: "quote",
          source: "polymarket",
          sourceId: conditionId,
          summary: `${yes?.outcome || "Yes"} last ${Math.round(quote.price * 100)}¢`,
          occurredAt: observedTs,
          observedAt: observedTs,
          data: { price: quote.price, outcomeId: quote.outcomeId },
        }
      : null,
  };
}

async function fetchKalshiSeriesOpen(seriesTicker) {
  const url = `${kalshiLiveUrl("markets")}?${new URLSearchParams({
    series_ticker: seriesTicker,
    status: "open",
    limit: "20",
  })}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Kalshi ${seriesTicker} ${res.status}`);
  return Array.isArray(body?.markets) ? body.markets : [];
}

/**
 * Live War Room sources. Failures are returned per-source so healthy adapters still serve.
 */
export async function fetchLiveWarRoomSources() {
  const observedTs = isoNow();
  const weatherP = withTimeout(fetchKalshiHighNySeries(), SOURCE_TIMEOUT_MS, "kalshi-weather");
  const nwsP = withTimeout(fetchNwsNyc(), SOURCE_TIMEOUT_MS, "nws");
  const kalshiP = withTimeout(fetchKalshiLiveFeaturedMarkets({ limit: 12 }), SOURCE_TIMEOUT_MS, "kalshi-featured");
  const polyP = withTimeout(fetchPolymarketLiveFeaturedMarkets({ limit: 24 }), SOURCE_TIMEOUT_MS, "polymarket-featured");
  const extraSeries = [
    ...GEOPOLITICS_SERIES.filter((s) => s !== "KXFED" && s !== "KXPRES"),
    ...WEATHER_CITY_SERIES,
  ];
  const extraKalshiP = withTimeout(
    Promise.all(
      extraSeries.map((ticker) =>
        fetchKalshiSeriesOpen(ticker)
          .then((markets) => ({ ticker, markets }))
          .catch(() => ({ ticker, markets: [] })),
      ),
    ),
    12_000,
    "kalshi-located-series",
  );

  const [weatherR, nwsR, kalshiR, polyR, extraR] = await Promise.allSettled([
    weatherP,
    nwsP,
    kalshiP,
    polyP,
    extraKalshiP,
  ]);

  /** @type {Record<string, { asOf: string; status: string; ageMs: number; error?: string }>} */
  const freshness = {
    kalshi: { asOf: observedTs, status: "missing", ageMs: 0 },
    polymarket: { asOf: observedTs, status: "missing", ageMs: 0 },
    nws: { asOf: observedTs, status: "missing", ageMs: 0 },
    news: { asOf: observedTs, status: "idle", ageMs: 0 },
  };

  /** @type {Array<Record<string, unknown>>} */
  const markets = [];
  /** @type {Array<Record<string, unknown>>} */
  const signals = [];
  /** @type {Array<Record<string, unknown>>} */
  const links = [];
  let featuredMarketId = null;

  const nws = nwsR.status === "fulfilled" ? nwsR.value : null;
  if (nws) {
    freshness.nws = { asOf: nws.observedAt || observedTs, status: "ok", ageMs: 0 };
  } else {
    freshness.nws = {
      asOf: observedTs,
      status: "error",
      ageMs: 0,
      error: nwsR.status === "rejected" ? String(nwsR.reason?.message || nwsR.reason) : "missing",
    };
  }

  if (weatherR.status === "fulfilled") {
    freshness.kalshi = { asOf: observedTs, status: "ok", ageMs: 0 };
    const story = weatherStoryFromLive(weatherR.value, nws, observedTs);
    markets.push(story.market);
    signals.push(...story.signals);
    links.push(...story.links);
    featuredMarketId = story.market.id;
  } else {
    freshness.kalshi = {
      asOf: observedTs,
      status: "error",
      ageMs: 0,
      error: String(weatherR.reason?.message || weatherR.reason),
    };
  }

  if (kalshiR.status === "fulfilled") {
    if (freshness.kalshi.status !== "ok") {
      freshness.kalshi = { asOf: observedTs, status: "ok", ageMs: 0 };
    }
    for (const row of kalshiR.value || []) {
      const mapped = fromKalshiFeatured(row, observedTs);
      if (!mapped) continue;
      if (markets.some((m) => m.id === mapped.market.id)) continue;
      if (!mapped.market.geometry && mapped.market.category === "other") continue;
      markets.push(mapped.market);
      if (mapped.signal) {
        signals.push(mapped.signal);
        links.push({
          marketId: mapped.market.id,
          signalId: mapped.signal.id,
          matchMethod: "venue_id",
          reason: "Kalshi featured ticker",
          confidence: 1,
          createdAt: observedTs,
        });
      }
    }
  }

  if (extraR.status === "fulfilled") {
    const weatherSeries = new Set(WEATHER_CITY_SERIES);
    for (const batch of extraR.value || []) {
      const ticker = String(batch?.ticker || "");
      const rows = Array.isArray(batch?.markets) ? batch.markets : [];
      const take = weatherSeries.has(ticker) ? 1 : 2;
      const ranked = [...rows].sort((a, b) => (toNum(b.volume_24h_fp) || 0) - (toNum(a.volume_24h_fp) || 0));
      for (const raw of ranked.slice(0, take)) {
        const mapped = fromKalshiFeatured(
          {
            ticker: raw.ticker,
            seriesTicker: raw.series_ticker || ticker,
            title: raw.title || raw.yes_sub_title,
            lastPriceDollars: toNum(raw.last_price_dollars),
            raw,
            status: raw.status,
            volume24h: toNum(raw.volume_24h_fp),
          },
          observedTs,
        );
        if (!mapped) continue;
        if (markets.some((m) => m.id === mapped.market.id)) continue;
        if (!weatherSeries.has(ticker)) {
          mapped.market.category = "geopolitics";
          mapped.market.desk = mapped.market.geometry ? "geopolitics" : "global";
        }
        markets.push(mapped.market);
      }
    }
  }

  if (polyR.status === "fulfilled") {
    freshness.polymarket = { asOf: observedTs, status: "ok", ageMs: 0 };
    for (const row of polyR.value || []) {
      const mapped = fromPolymarketFeatured(row, observedTs);
      if (!mapped) continue;
      if (!mapped.market.geometry && mapped.market.category !== "geopolitics") continue;
      markets.push(mapped.market);
      if (mapped.signal) {
        signals.push(mapped.signal);
        links.push({
          marketId: mapped.market.id,
          signalId: mapped.signal.id,
          matchMethod: "venue_id",
          reason: "Polymarket featured market",
          confidence: 1,
          createdAt: observedTs,
        });
      }
    }
  } else {
    freshness.polymarket = {
      asOf: observedTs,
      status: "error",
      ageMs: 0,
      error: String(polyR.reason?.message || polyR.reason),
    };
  }

  let activity = [];
  try {
    const liveActivity = await fetchWarRoomActivity({ markets, observedTs });
    activity = liveActivity.activity || [];
    Object.assign(freshness, liveActivity.freshness || {});
    for (const item of activity) {
      if (item?.kind !== "headline" && item?.kind !== "fill") continue;
      signals.push(item);
      if (item.marketId) {
        links.push({
          marketId: item.marketId,
          signalId: item.id,
          matchMethod: item.kind === "headline" ? "news_title" : "venue_id",
          reason: item.kind === "headline" ? "News pulse" : "Live trade",
          confidence: item.kind === "headline" ? 0.55 : 1,
          createdAt: observedTs,
        });
      }
    }
  } catch {
    freshness.trades = { asOf: observedTs, status: "error", ageMs: 0 };
    freshness.news = { asOf: observedTs, status: "error", ageMs: 0 };
  }

  return {
    observedTs,
    freshness,
    markets,
    signals,
    links,
    activity,
    featuredMarketId,
    liveOk: markets.length > 0,
  };
}
