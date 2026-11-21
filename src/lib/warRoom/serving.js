import { holderTerminalHref } from "@/lib/holderLanding/pages";
import { fetchLiveWarRoomSources } from "./adapters";
import {
  DESKTOP_POINT_CAP,
  MOBILE_POINT_CAP,
  POLL_INTERVAL_MS,
  PREVIEW_CACHE_TTL_MS,
  PREVIEW_STORY_CAP,
  SNAPSHOT_CACHE_TTL_MS,
  WAR_ROOM_MODEL_VERSION,
} from "./constants";
import { allowFixtureFallback, isWarRoomFixtureForced } from "./flags";
import { buildFixtureBundle, fixtureLinkedSignal } from "./fixture";
import { normalizeDesk, warRoomHref } from "./href";
import { decodeCursor, encodeCursor, parseWarRoomMarketId } from "./ids";
import { isFeaturedWeatherMarket, rankMarkets } from "./ranking";
import { sortSignals } from "./timeline";

/** @typedef {"poll"} WarRoomTransport */

let liveMemo = { at: 0, bundle: null, inflight: null };
let lastGoodLive = /** @type {ReturnType<typeof normalizeBundle> | null} */ (null);

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
    featuredMarketId: raw.featuredMarketId || ranked.find(isFeaturedWeatherMarket)?.id || ranked[0]?.id || null,
  };
}

async function loadLiveBundle() {
  const now = Date.now();
  if (liveMemo.bundle && now - liveMemo.at < SNAPSHOT_CACHE_TTL_MS) {
    return liveMemo.bundle;
  }
  if (liveMemo.inflight) return liveMemo.inflight;

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
        featuredMarketId: live.featuredMarketId,
        pollIntervalMs: POLL_INTERVAL_MS,
      });
      liveMemo = { at: Date.now(), bundle, inflight: null };
      lastGoodLive = bundle;
      return bundle;
    })
    .catch((err) => {
      liveMemo.inflight = null;
      throw err;
    });

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
    region: market.region || "Global",
    status: market.status,
    price: quote?.price ?? null,
    move: quote?.move ?? null,
    moveWindow: quote?.moveWindow ?? null,
    quoteAt: quote?.sourceTs || quote?.observedTs || null,
    signalSummary: signal?.summary || null,
    signalKind: signal?.kind || null,
    href: warRoomHref({ desk: marketDesk(market) === "global" ? "all" : marketDesk(market), market: market.id }),
  };
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
 *   mobile?: boolean;
 *   cursor?: string;
 *   forceFixture?: boolean;
 * }} [opts]
 */
export async function getWarRoomSnapshot(opts = {}) {
  const desk = normalizeDesk(opts.desk);
  const bundle = await loadWarRoomBundle(opts);
  const marketId = String(opts.market || "").trim();
  const filtered = bundle.markets.filter((market) => matchesDesk(market, desk));
  const cap = opts.mobile ? MOBILE_POINT_CAP : DESKTOP_POINT_CAP;
  const features = filtered.map(featureFromMarket).filter(Boolean).slice(0, cap);
  const feed = filtered.map((market) => feedRow(bundle, market));
  const selected = marketId ? filtered.find((m) => m.id === marketId) || bundle.markets.find((m) => m.id === marketId) : null;
  const selectedValid = selected && matchesDesk(selected, desk) ? selected : marketId ? null : filtered[0] || null;
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
    cursor: cursorFor(bundle, desk),
    features: { type: "FeatureCollection", features },
    feed,
    selectedMarketId: selectedValid?.id || null,
    emptyReason: !filtered.length
      ? bundle.markets.length
        ? "no_markets_in_desk"
        : "no_snapshot"
      : invalidMarket || missingMarket
        ? "invalid_market"
        : null,
    globalCount: bundle.markets.filter((m) => marketDesk(m) === "global").length,
    status: filtered.length ? (bundle.stale ? "stale" : "ok") : "empty",
  };
}

function researchLinks(market) {
  const links = [];
  if (market.venue === "polymarket") {
    links.push({
      label: "Holder Terminal",
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

/**
 * @param {string} id
 * @param {{ forceFixture?: boolean }} [opts]
 */
export async function getWarRoomMarket(id, opts = {}) {
  const bundle = await loadWarRoomBundle(opts);
  const parsed = parseWarRoomMarketId(id);
  const market = bundle.markets.find((row) => row.id === id) || null;
  if (!market) {
    return {
      version: WAR_ROOM_MODEL_VERSION,
      asOf: bundle.asOf,
      fixture: bundle.fixture,
      fixtureLabel: bundle.fixtureLabel,
      status: parsed ? "not_found" : "invalid_id",
      market: null,
      quote: null,
      timeline: [],
      links: [],
      freshness: bundle.freshness,
    };
  }
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
}
