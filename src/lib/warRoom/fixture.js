/**
 * Labeled lab fixture: NYC daily-high series plus geopolitics rows.
 * Includes a late arrival, reconnect duplicate, delayed wallet attribution,
 * and fills above/below the $5k holder-feed threshold.
 *
 * Visible in the UI as "Lab fixture" — never presented as live production data.
 */

import {
  FEATURED_WEATHER_CITY,
  FEATURED_WEATHER_CLINYC,
  FEATURED_WEATHER_NWS_STATION,
  FEATURED_WEATHER_SERIES,
  LARGE_FILL_USD,
  NYC_COORDINATES,
  WAR_ROOM_MODEL_VERSION,
} from "./constants";
import { warRoomMarketId, warRoomSignalId } from "./ids";
import { applyQuote, upsertSignal } from "./timeline";

export const FIXTURE_AS_OF = "2026-11-21T21:00:00.000Z";
export const FIXTURE_LABEL = "Lab fixture";

const NYC = {
  type: "Point",
  coordinates: NYC_COORDINATES,
};

const DC = {
  type: "Point",
  coordinates: [-77.0365, 38.8977],
};

const KYIV = {
  type: "Point",
  coordinates: [30.5234, 50.4501],
};

const WEATHER_MARKET_ID = warRoomMarketId("kalshi", "KXHIGHNY-26NOV21-B64.5");
const WEATHER_YES = "yes";
const POLY_MARKET_ID = warRoomMarketId(
  "polymarket",
  "0xfixtureceasfireukraine2026aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
);
const FED_MARKET_ID = warRoomMarketId("kalshi", "KXFED-26DEC-C325");

function iso(value) {
  return value;
}

export function fixtureWeatherMarket() {
  return {
    id: WEATHER_MARKET_ID,
    venue: "kalshi",
    venueMarketId: "KXHIGHNY-26NOV21-B64.5",
    eventTicker: "KXHIGHNY-26NOV21",
    seriesTicker: FEATURED_WEATHER_SERIES,
    title: "Highest temperature in NYC on Nov 21 — 64° to 65°",
    category: "weather",
    desk: "weather",
    status: "open",
    region: FEATURED_WEATHER_CITY,
    geometry: NYC,
    precision: "station",
    rulesUrl: "https://kalshi.com/markets/kxhighny/highest-temperature-in-nyc",
    settlementSource: "The Weather Company",
    settlementStation: FEATURED_WEATHER_CLINYC,
    marketUrl: "https://kalshi.com/markets/kxhighny/highest-temperature-in-nyc",
    outcomes: [
      { id: WEATHER_YES, label: "Yes" },
      { id: "no", label: "No" },
    ],
    featured: true,
    volume24h: 184_000,
    matchConfidence: 1,
    quote: {
      marketId: WEATHER_MARKET_ID,
      outcomeId: WEATHER_YES,
      quoteType: "last",
      price: 0.5,
      sourceTs: iso("2026-11-21T18:10:00.000Z"),
      observedTs: iso("2026-11-21T18:10:04.000Z"),
      move: 0.08,
      moveWindow: "since 14:00 UTC",
    },
    thresholds: [
      { ticker: "KXHIGHNY-26NOV21-T58", label: "57° or below", price: 0.01 },
      { ticker: "KXHIGHNY-26NOV21-B58.5", label: "58° to 59°", price: 0.01 },
      { ticker: "KXHIGHNY-26NOV21-B60.5", label: "60° to 61°", price: 0.05 },
      { ticker: "KXHIGHNY-26NOV21-B62.5", label: "62° to 63°", price: 0.42 },
      { ticker: "KXHIGHNY-26NOV21-B64.5", label: "64° to 65°", price: 0.5 },
      { ticker: "KXHIGHNY-26NOV21-T65", label: "66° or above", price: 0.06 },
    ],
    weather: {
      station: FEATURED_WEATHER_CLINYC,
      stationName: "New York City (CLINYC)",
      nwsStation: FEATURED_WEATHER_NWS_STATION,
      settlementDate: "2026-11-21",
      timeConvention: "local calendar day, Eastern Time",
      observedTempF: 54,
      observedAt: iso("2026-11-21T16:51:00.000Z"),
      forecastHighF: 64,
      forecastIssuedAt: iso("2026-11-21T11:30:00.000Z"),
      forecastName: "Saturday",
      settlementSource: "The Weather Company",
      settlementSourceUrl: "https://weather.com/kalshi",
      rulesPrimary:
        "If the maximum temperature recorded at New York City (CLINYC) for Nov 21, 2026, is 64° or 65° Fahrenheit according to The Weather Company, then the market resolves to Yes.",
    },
  };
}

export function fixtureGeopoliticsMarkets() {
  return [
    {
      id: POLY_MARKET_ID,
      venue: "polymarket",
      venueMarketId: "0xfixtureceasfireukraine2026aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      title: "Russia-Ukraine ceasefire by March 31, 2026?",
      category: "geopolitics",
      desk: "geopolitics",
      status: "open",
      region: "Kyiv",
      geometry: KYIV,
      precision: "city",
      rulesUrl: "https://polymarket.com/event/russia-ukraine-ceasefire-2026",
      marketUrl: "https://polymarket.com/event/russia-ukraine-ceasefire-2026",
      outcomes: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
      featured: true,
      volume24h: 2_400_000,
      matchConfidence: 0.86,
      quote: {
        marketId: POLY_MARKET_ID,
        outcomeId: "yes",
        quoteType: "last",
        price: 0.18,
        sourceTs: iso("2026-11-21T19:40:00.000Z"),
        observedTs: iso("2026-11-21T19:40:02.000Z"),
        move: 0.025,
        moveWindow: "last 6h",
      },
    },
    {
      id: FED_MARKET_ID,
      venue: "kalshi",
      venueMarketId: "KXFED-26DEC-C325",
      seriesTicker: "KXFED",
      title: "Fed funds rate after December 2026 meeting — 325-350 bps",
      category: "geopolitics",
      desk: "geopolitics",
      status: "open",
      region: "Washington, D.C.",
      geometry: DC,
      precision: "city",
      rulesUrl: "https://kalshi.com/markets/kxfed",
      marketUrl: "https://kalshi.com/markets/kxfed",
      outcomes: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
      volume24h: 890_000,
      matchConfidence: 0.7,
      quote: {
        marketId: FED_MARKET_ID,
        outcomeId: "yes",
        quoteType: "last",
        price: 0.38,
        sourceTs: iso("2026-11-21T18:00:00.000Z"),
        observedTs: iso("2026-11-21T18:00:03.000Z"),
        move: 0.02,
        moveWindow: "last 6h",
      },
    },
  ];
}

export function fixtureSignals() {
  const forecast = {
    id: warRoomSignalId("forecast", "nws", "OKX-2026-11-21-saturday"),
    kind: "forecast",
    source: "nws",
    sourceId: "OKX-2026-11-21-saturday",
    sourceUrl: "https://api.weather.gov/gridpoints/OKX/34,45/forecast",
    summary: "NWS forecast high 64°F for Saturday in New York City",
    occurredAt: iso("2026-11-21T11:30:00.000Z"),
    observedAt: iso("2026-11-21T11:31:00.000Z"),
    geometry: NYC,
    data: { tempF: 64, issueTime: iso("2026-11-21T11:30:00.000Z"), type: "forecast" },
  };
  const earlyQuote = {
    id: warRoomSignalId("quote", "kalshi", "KXHIGHNY-26NOV21-B64.5-14:00"),
    kind: "quote",
    source: "kalshi",
    sourceId: "KXHIGHNY-26NOV21-B64.5-14:00",
    summary: "Yes last 42¢",
    occurredAt: iso("2026-11-21T14:00:00.000Z"),
    observedAt: iso("2026-11-21T14:00:02.000Z"),
    data: { price: 0.42, outcomeId: WEATHER_YES },
  };
  const smallFill = {
    id: warRoomSignalId("fill", "polymarket", "tx-small-2400"),
    kind: "fill",
    source: "polymarket",
    sourceId: "tx-small-2400",
    summary: "Buy Yes $2,400",
    occurredAt: iso("2026-11-21T15:12:00.000Z"),
    observedAt: iso("2026-11-21T15:12:01.000Z"),
    data: { notionalUsd: 2_400, side: "buy", outcome: "Yes", size: 6000, price: 0.4 },
  };
  const largeFill = {
    id: warRoomSignalId("fill", "polymarket", "tx-large-8200"),
    kind: "fill",
    source: "polymarket",
    sourceId: "tx-large-8200",
    summary: "Buy Yes $8,200",
    occurredAt: iso("2026-11-21T16:40:00.000Z"),
    observedAt: iso("2026-11-21T16:40:01.000Z"),
    data: {
      notionalUsd: 8_200,
      side: "buy",
      outcome: "Yes",
      size: 16400,
      price: 0.5,
      attributed: false,
    },
  };
  const observation = {
    id: warRoomSignalId("observation", "nws", "KNYC-2026-11-21T16:51"),
    kind: "observation",
    source: "nws",
    sourceId: "KNYC-2026-11-21T16:51",
    sourceUrl: "https://api.weather.gov/stations/KNYC/observations/latest",
    summary: "NWS Central Park observation 54°F",
    occurredAt: iso("2026-11-21T16:51:00.000Z"),
    observedAt: iso("2026-11-21T16:52:00.000Z"),
    geometry: NYC,
    data: { tempF: 54, station: FEATURED_WEATHER_NWS_STATION, type: "observation" },
  };
  const laterQuote = {
    id: warRoomSignalId("quote", "kalshi", "KXHIGHNY-26NOV21-B64.5-18:10"),
    kind: "quote",
    source: "kalshi",
    sourceId: "KXHIGHNY-26NOV21-B64.5-18:10",
    summary: "Yes last 50¢ (+8¢ since 14:00 UTC)",
    occurredAt: iso("2026-11-21T18:10:00.000Z"),
    observedAt: iso("2026-11-21T18:10:04.000Z"),
    data: { price: 0.5, outcomeId: WEATHER_YES, move: 0.08 },
  };
  const attribution = {
    id: warRoomSignalId("attribution", "polymarket", "tx-large-8200-wallet"),
    kind: "attribution",
    source: "polymarket",
    sourceId: "tx-large-8200-wallet",
    enrichesId: largeFill.id,
    summary: "Fill attributed to 0x5668…5839",
    occurredAt: iso("2026-11-21T16:40:00.000Z"),
    observedAt: iso("2026-11-21T19:05:00.000Z"),
    data: {
      enrichesId: largeFill.id,
      wallet: "0x56687bf447db6ffa42ffe2204a05edaa20f55839",
      attributed: true,
      notionalUsd: 8_200,
    },
  };
  const reconnectQuote = {
    ...laterQuote,
    observedAt: iso("2026-11-21T19:20:00.000Z"),
  };
  const lateObservation = {
    id: warRoomSignalId("observation", "nws", "KNYC-2026-11-21T12:51"),
    kind: "observation",
    source: "nws",
    sourceId: "KNYC-2026-11-21T12:51",
    summary: "NWS Central Park observation 54°F (late arrival)",
    occurredAt: iso("2026-11-21T12:51:00.000Z"),
    observedAt: iso("2026-11-21T20:00:00.000Z"),
    geometry: NYC,
    data: { tempF: 54, station: FEATURED_WEATHER_NWS_STATION, type: "observation", lateArrival: true },
  };
  const headline = {
    id: warRoomSignalId("headline", "news", "fixture-ukraine-talks"),
    kind: "headline",
    source: "reuters",
    sourceId: "fixture-ukraine-talks",
    sourceUrl: "https://www.reuters.com/",
    summary: "Negotiators float a limited ceasefire window as winter fighting slows",
    occurredAt: iso("2026-11-21T19:10:00.000Z"),
    observedAt: iso("2026-11-21T19:12:00.000Z"),
    geometry: KYIV,
    data: { publisher: "Reuters" },
  };
  const staleQuoteAttempt = {
    id: warRoomSignalId("quote", "kalshi", "KXHIGHNY-26NOV21-B64.5-13:00"),
    kind: "quote",
    source: "kalshi",
    sourceId: "KXHIGHNY-26NOV21-B64.5-13:00",
    summary: "Yes last 40¢",
    occurredAt: iso("2026-11-21T13:00:00.000Z"),
    observedAt: iso("2026-11-21T20:30:00.000Z"),
    data: { price: 0.4, outcomeId: WEATHER_YES },
  };

  return {
    forecast,
    earlyQuote,
    smallFill,
    largeFill,
    observation,
    laterQuote,
    attribution,
    reconnectQuote,
    lateObservation,
    headline,
    staleQuoteAttempt,
    weatherMarketId: WEATHER_MARKET_ID,
    polyMarketId: POLY_MARKET_ID,
    largeFillThreshold: LARGE_FILL_USD,
  };
}

export function fixtureLinks() {
  const signals = fixtureSignals();
  const weather = fixtureWeatherMarket();
  const [poly] = fixtureGeopoliticsMarkets();
  const now = FIXTURE_AS_OF;
  return [
    {
      marketId: weather.id,
      signalId: signals.forecast.id,
      matchMethod: "station_rule",
      reason: "NWS forecast for the CLINYC settlement city",
      confidence: 1,
      createdAt: now,
    },
    {
      marketId: weather.id,
      signalId: signals.observation.id,
      matchMethod: "station_rule",
      reason: "NWS KNYC observation for the NYC daily-high series",
      confidence: 0.9,
      createdAt: now,
    },
    {
      marketId: weather.id,
      signalId: signals.lateObservation.id,
      matchMethod: "station_rule",
      reason: "Late-arriving KNYC observation",
      confidence: 0.9,
      createdAt: now,
    },
    {
      marketId: weather.id,
      signalId: signals.earlyQuote.id,
      matchMethod: "venue_id",
      reason: "Kalshi ticker",
      confidence: 1,
      createdAt: now,
    },
    {
      marketId: weather.id,
      signalId: signals.laterQuote.id,
      matchMethod: "venue_id",
      reason: "Kalshi ticker",
      confidence: 1,
      createdAt: now,
    },
    {
      marketId: poly.id,
      signalId: signals.smallFill.id,
      matchMethod: "venue_id",
      reason: "Polymarket fill",
      confidence: 1,
      createdAt: now,
    },
    {
      marketId: poly.id,
      signalId: signals.largeFill.id,
      matchMethod: "venue_id",
      reason: "Polymarket fill",
      confidence: 1,
      createdAt: now,
    },
    {
      marketId: poly.id,
      signalId: signals.headline.id,
      matchMethod: "reviewed",
      reason: "Curated geopolitics headline",
      confidence: 0.8,
      createdAt: now,
    },
  ];
}

/**
 * Apply fixture events in the documented order (including late/reconnect/attribution).
 * Used by deterministic tests.
 */
export function replayFixtureEvents() {
  const s = fixtureSignals();
  /** @type {Array<Record<string, unknown>>} */
  let timeline = [];
  let quote = /** @type {Record<string, unknown> | null} */ (null);

  const quoteFrom = (signal) => ({
    marketId: s.weatherMarketId,
    outcomeId: WEATHER_YES,
    quoteType: "last",
    price: signal.data.price,
    sourceTs: signal.occurredAt,
    observedTs: signal.observedAt,
    move: signal.data.move ?? null,
    moveWindow: signal.data.move ? "since 14:00 UTC" : null,
  });

  timeline = upsertSignal(timeline, s.forecast);
  quote = applyQuote(quote, quoteFrom(s.earlyQuote));
  timeline = upsertSignal(timeline, s.earlyQuote);
  timeline = upsertSignal(timeline, s.smallFill);
  timeline = upsertSignal(timeline, s.largeFill);
  timeline = upsertSignal(timeline, s.observation);
  quote = applyQuote(quote, quoteFrom(s.laterQuote));
  timeline = upsertSignal(timeline, s.laterQuote);
  timeline = upsertSignal(timeline, s.attribution);
  timeline = upsertSignal(timeline, s.reconnectQuote);
  timeline = upsertSignal(timeline, s.lateObservation);
  timeline = upsertSignal(timeline, s.headline);
  quote = applyQuote(quote, quoteFrom(s.staleQuoteAttempt));
  timeline = upsertSignal(timeline, s.staleQuoteAttempt);

  return { timeline, quote };
}

export function buildFixtureBundle() {
  const weather = fixtureWeatherMarket();
  const geo = fixtureGeopoliticsMarkets();
  const signals = fixtureSignals();
  const { timeline } = replayFixtureEvents();
  const markets = [weather, ...geo];
  return {
    version: WAR_ROOM_MODEL_VERSION,
    asOf: FIXTURE_AS_OF,
    fixture: true,
    fixtureLabel: FIXTURE_LABEL,
    transport: "poll",
    freshness: {
      kalshi: { asOf: FIXTURE_AS_OF, status: "fixture", ageMs: 0 },
      polymarket: { asOf: FIXTURE_AS_OF, status: "fixture", ageMs: 0 },
      nws: { asOf: FIXTURE_AS_OF, status: "fixture", ageMs: 0 },
      news: { asOf: FIXTURE_AS_OF, status: "fixture", ageMs: 0 },
    },
    markets,
    signals: timeline,
    links: fixtureLinks(),
    featuredMarketId: weather.id,
    pollIntervalMs: 8_000,
  };
}

export function fixtureLinkedSignal() {
  const s = fixtureSignals();
  return s.observation;
}
