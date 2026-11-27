"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

import { useCompactScreen } from "@/lib/desktopOnly";
import {
  CATEGORIES,
  EXPLORE_FEEDS,
  EXPLORE_TOP_FEEDS,
  exploreActivityLabel,
  exploreMarketsByVolumeLabel,
} from "@/lib/markets/exploreCategories";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

import { ActivityPane, type ActivityRow } from "./ActivityPane";
import { formatVolume } from "./format";
import { GlobeStage } from "./GlobeStage";
import type { WarRoomGlobeProps } from "./WarRoomGlobe";
import { MarketsPane, type MarketRow } from "./MarketsPane";
import {
  WarRoomDetailCard,
  type WarRoomDetailTarget,
  type WarRoomNavigateRequest,
} from "./WarRoomDetailCard";
import { WarRoomLayersRail } from "./WarRoomLayersRail";
import { WarRoomAgentStepsLoader, WarRoomRailSkeleton } from "./WarRoomLoadingProgress";
import { WarRoomMobileDetailModal } from "./WarRoomMobileDetailModal";
import { WarRoomMobileEmailInterrupt } from "./WarRoomMobileEmailInterrupt";
import { relatedMarketsForHeadline } from "./relatedMarkets";
import {
  WAR_ROOM_MARKET_PICK_EVENT,
  WAR_ROOM_NEWS_PICK_EVENT,
  clearPendingSelectOnlyMarketPick,
  peekPendingSelectOnlyMarketPick,
} from "@/lib/warRoom/pickMarket";
import { useWarRoomData } from "./useWarRoomData";
import { useWarRoomTheme } from "./useWarRoomTheme";

/** DC fallback when a pick has no geometry yet — politics / Trump / impeach land here. */
const PICK_FALLBACK_COORDS: [number, number] = [-77.0365, 38.8977];
/** Taipei — optimistic pin for Taiwan / China-invade titles before market lookup returns. */
const TAIWAN_FALLBACK_COORDS: [number, number] = [121.5654, 25.033];
/** Helsinki — optimistic pin for Finland titles before market lookup returns. */
const FINLAND_FALLBACK_COORDS: [number, number] = [24.9384, 60.1699];

/** Wait for camera settle before streaming the rest of the desk. */
const POST_FOCUS_STREAM_MS = 1600;

function fallbackCoordsForPick(meta?: { title?: string; detail?: string } | null): [number, number] {
  const hay = `${meta?.title || ""} ${meta?.detail || ""}`.toLowerCase();
  if (/taiwan|taipei|invade taiwan|china invade/i.test(hay)) return TAIWAN_FALLBACK_COORDS;
  if (/finland|finnish|helsinki/i.test(hay)) return FINLAND_FALLBACK_COORDS;
  return PICK_FALLBACK_COORDS;
}

function normalizeNewsQuery(raw: string) {
  return String(raw || "")
    .trim()
    .replace(/^news\s+for\s+[“"']?/i, "")
    .replace(/[”"']$/g, "")
    .trim()
    .toLowerCase();
}

function matchHeadlineActivity(rows: ActivityRow[], query: string, title?: string): ActivityRow | null {
  const headlines = rows.filter((row) => row.kind === "headline");
  if (!headlines.length) return null;
  const needles = [normalizeNewsQuery(title || ""), normalizeNewsQuery(query)].filter(Boolean);
  for (const needle of needles) {
    const exact = headlines.find((row) => row.title.toLowerCase() === needle);
    if (exact) return exact;
  }
  for (const needle of needles) {
    const partial = headlines.find((row) => row.title.toLowerCase().includes(needle));
    if (partial) return partial;
  }
  const tokens = needles
    .flatMap((n) => n.split(/\s+/))
    .filter((t) => t.length >= 4);
  if (tokens.length) {
    let best: ActivityRow | null = null;
    let bestScore = 0;
    for (const row of headlines) {
      const hay = row.title.toLowerCase();
      let score = 0;
      for (const t of tokens) if (hay.includes(t)) score += 1;
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }
    if (best && bestScore >= Math.min(2, tokens.length)) return best;
  }
  return null;
}

function stubNewsActivity(query: string, title?: string): ActivityRow {
  const label = String(title || query || "News").trim() || "News";
  const id = `jarvis-news:${normalizeNewsQuery(label).slice(0, 48) || "pick"}`;
  return {
    id,
    kind: "headline",
    venue: "news",
    title: label.replace(/^News for [“"']?/i, "").replace(/[”"']$/g, "").trim() || label,
    summary: label,
    geometry: { type: "Point", coordinates: PICK_FALLBACK_COORDS },
    region: "Global",
    data: { publisher: "News", markets: [], snippet: null },
  };
}

function coordsFromGeometry(
  geometry: { type?: string; coordinates?: [number, number] | number[] } | null | undefined,
): [number, number] | null {
  if (!geometry || geometry.type !== "Point") return null;
  const c = geometry.coordinates;
  if (!Array.isArray(c) || c.length < 2) return null;
  const lon = Number(c[0]);
  const lat = Number(c[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return [lon, lat];
}

function formatCount(n: number) {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(n));
}

type VenueId = "kalshi" | "polymarket";

type VenueToggles = Record<VenueId, boolean>;

const VENUE_OPTIONS: Array<{ id: VenueId; label: string }> = [
  { id: "kalshi", label: "Kalshi" },
  { id: "polymarket", label: "Polymarket" },
];

/**
 * Empty selection (none on) matches prior BOTH — show every venue.
 * Both on also shows every venue; a single on filters to that venue.
 */
function showsBothVenues(toggles: VenueToggles) {
  return (!toggles.kalshi && !toggles.polymarket) || (toggles.kalshi && toggles.polymarket);
}

function venueMatches(toggles: VenueToggles, venue: string | null | undefined) {
  if (showsBothVenues(toggles)) return true;
  const v = String(venue || "").toLowerCase();
  if (toggles.kalshi) return v === "kalshi";
  if (toggles.polymarket) return v === "polymarket";
  return true;
}

type FocusTarget = {
  center: [number, number];
  zoom?: number;
  pitch?: number;
  bearing?: number;
  key?: string | number;
} | null;

function deepFocus(center: [number, number], key: string): FocusTarget {
  return {
    center,
    zoom: 4.85,
    pitch: 52,
    bearing: undefined,
    key,
  };
}

/**
 * War Room shell: left detail (chart + trades), center globe, right markets/activity.
 */
export function WarRoomView({
  fixture = false,
  embedded = false,
  market: controlledMarket,
  onMarketChange,
  onNavigate,
  pickNonce = 0,
  className,
}: {
  fixture?: boolean;
  /** Homepage embed: fill the parent, lighter chrome. */
  embedded?: boolean;
  market?: string;
  onMarketChange?: (id: string | null) => void;
  onNavigate?: (request: WarRoomNavigateRequest) => void;
  /** Bumps on each nav pick so the same marketId still re-reveals. */
  pickNonce?: number;
  className?: string;
}) {
  const compactScreen = useCompactScreen();
  /**
   * Lock the first known compact value so hydration (`null` → bool) cannot flip
   * `mobile` in useWarRoomData's filterKey and restart progressive load mid-stream.
   */
  const compactLockedRef = useRef<boolean | null>(null);
  if (compactLockedRef.current == null && compactScreen != null) {
    compactLockedRef.current = compactScreen;
  }
  /** Until the breakpoint is known, treat as desktop so we don't thrash mobile snapshot fetches. */
  const compact = (compactLockedRef.current ?? false) === true;
  /**
   * Homepage `#demo` on phones/tablets: live globe + pings only. Detail opens as a
   * modal; feed/detail tab chrome stays off. Standalone `/war-room` compact is unchanged.
   */
  const mobileLanding = compact && embedded;
  const { dark, loadTone } = useWarRoomTheme();
  const [localMarket, setLocalMarket] = useState("");
  const [mobileView, setMobileView] = useState<"globe" | "feed" | "detail">("globe");
  const [emailArmed, setEmailArmed] = useState(false);
  const emailArmedRef = useRef(false);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const [detail, setDetail] = useState<WarRoomDetailTarget | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [feedRevealed, setFeedRevealed] = useState(false);
  /**
   * Nav / Jarvis pick path: render only the selected market pin(s) + left detail.
   * Do not paint the full tradable desk, news pings, or right-rail flood.
   * Seed from pending pick so `/war-room` remounts after `?market=` still open select-only.
   */
  const [selectOnly, setSelectOnly] = useState(() => {
    const pending = peekPendingSelectOnlyMarketPick();
    return Boolean(pending?.selectOnly);
  });
  const [pickRow, setPickRow] = useState<MarketRow | null>(null);
  const [pickBusy, setPickBusy] = useState(false);
  /** After focus settles, allow desk stream while keeping the left panel open. */
  const focusStreamArmedRef = useRef(false);
  /** Jarvis news pick — keep a synthetic ping when the desk feed has no match yet. */
  const [newsPickRow, setNewsPickRow] = useState<ActivityRow | null>(null);
  const pendingNewsPickRef = useRef<{ query: string; title?: string } | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [exploreFeedId, setExploreFeedId] = useState("tradable");
  const [venueToggles, setVenueToggles] = useState<VenueToggles>({
    kalshi: true,
    polymarket: true,
  });
  const [mapResetNonce, setMapResetNonce] = useState(0);
  const [sessionTrades, setSessionTrades] = useState(0);
  const [sessionTraders, setSessionTraders] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const seenTradeIdsRef = useRef<Set<string>>(new Set());
  const seenTraderIdsRef = useRef<Set<string>>(new Set());
  const sessionPrimedRef = useRef(false);

  const market = controlledMarket ?? localMarket;

  // Slide the right rail in once the War Room stage is on screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setFeedRevealed(true);
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const setMarket = useCallback(
    (id: string | null) => {
      if (onMarketChange) onMarketChange(id);
      else setLocalMarket(id || "");
    },
    [onMarketChange],
  );

  /** First spin / ping on mobile landing arms the newsletter interrupt timer. */
  const noteMobileInteraction = useCallback(() => {
    if (!mobileLanding || emailArmedRef.current) return;
    emailArmedRef.current = true;
    setEmailArmed(true);
  }, [mobileLanding]);

  const { snapshot, error, loading, transport } = useWarRoomData({
    desk: "all",
    market: selectOnly ? "" : market,
    category: categoryId,
    exploreFeed: categoryId ? undefined : exploreFeedId || "tradable",
    fixture,
    mobile: compact,
    selectOnly,
  });

  /** Cold start only — never blank rails/globe once we have a snapshot or an active pick lens. */
  const coldStart = loading && !snapshot && !pickRow && !detailOpen;

  const marketsRailLabel = useMemo(
    () => exploreMarketsByVolumeLabel({ exploreFeed: exploreFeedId, category: categoryId }),
    [exploreFeedId, categoryId],
  );
  const activityRailLabel = useMemo(
    () => exploreActivityLabel({ exploreFeed: exploreFeedId, category: categoryId }),
    [exploreFeedId, categoryId],
  );

  const clearSelectionChrome = useCallback(() => {
    setActivityId(null);
    setDetail(null);
    setDetailOpen(false);
    setFocusTarget(null);
    setSelectOnly(false);
    setPickRow(null);
    setPickBusy(false);
    focusStreamArmedRef.current = false;
    clearPendingSelectOnlyMarketPick();
    setMarket(null);
  }, [setMarket]);

  const pickExploreFeed = useCallback(
    (next: string) => {
      // Match Holder Explore: feed chips clear category filters.
      setExploreFeedId(next || "tradable");
      setCategoryId("");
      clearSelectionChrome();
    },
    [clearSelectionChrome],
  );

  const pickCategory = useCallback(
    (next: string) => {
      // Match Holder Explore: category chips clear feed rankings.
      setCategoryId(next);
      setExploreFeedId(next ? "" : "tradable");
      clearSelectionChrome();
    },
    [clearSelectionChrome],
  );

  const resetMapView = useCallback(() => {
    setFocusTarget(null);
    setMapResetNonce((n) => n + 1);
  }, []);

  const emptyCollection = useMemo(
    () => ({ type: "FeatureCollection" as const, features: [] as never[] }),
    [],
  );
  const allFeatures = useMemo(() => {
    const raw = snapshot?.features as { type?: string; features?: unknown } | null | undefined;
    if (raw?.type === "FeatureCollection" && Array.isArray(raw.features)) {
      return raw as { type: "FeatureCollection"; features: Array<Record<string, unknown>> };
    }
    return emptyCollection as { type: "FeatureCollection"; features: Array<Record<string, unknown>> };
  }, [snapshot?.features, emptyCollection]);
  const pings = useMemo(() => {
    // Select-only market pick: no news ping flood.
    if (selectOnly) return emptyCollection;
    const raw = snapshot?.pings as { type?: string; features?: unknown } | null | undefined;
    const base =
      raw?.type === "FeatureCollection" && Array.isArray(raw.features)
        ? (raw as { type: "FeatureCollection"; features: Array<Record<string, unknown>> })
        : emptyCollection;
    if (!newsPickRow?.geometry?.coordinates) return base as { type: "FeatureCollection"; features: never[] };
    const pickId = newsPickRow.id;
    const already = base.features.some(
      (f) => String((f as { properties?: { id?: string } }).properties?.id) === pickId,
    );
    if (already) return base as { type: "FeatureCollection"; features: never[] };
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          id: pickId,
          geometry: newsPickRow.geometry,
          properties: {
            id: pickId,
            kind: "headline",
            title: newsPickRow.title,
          },
        },
        ...base.features,
      ],
    } as { type: "FeatureCollection"; features: never[] };
  }, [snapshot?.pings, emptyCollection, selectOnly, newsPickRow]);
  const allMarkets = (Array.isArray(snapshot?.feed) ? snapshot.feed : []) as MarketRow[];
  /** All globe points — feed is a rail-sized slice; clicks must resolve against this. */
  const allMapMarkets = (
    Array.isArray(snapshot?.mapMarkets) && snapshot.mapMarkets.length
      ? snapshot.mapMarkets
      : allMarkets
  ) as MarketRow[];
  const allActivity = (Array.isArray(snapshot?.activity) ? snapshot.activity : []) as ActivityRow[];

  const features = useMemo(() => {
    const pickId = String(market || pickRow?.id || "").trim();
    const pickCenter =
      focusTarget?.center ||
      coordsFromGeometry(pickRow?.geometry) ||
      (selectOnly ? PICK_FALLBACK_COORDS : null);

    // Select-only pick: one pin (or series pins later) — never the full tradable desk.
    if (selectOnly && pickId) {
      const fromDesk = allFeatures.features.filter(
        (f) => String((f as { properties?: { id?: string } }).properties?.id) === pickId,
      );
      if (fromDesk.length) {
        return { type: "FeatureCollection" as const, features: fromDesk };
      }
      const center = pickCenter || PICK_FALLBACK_COORDS;
      return {
        type: "FeatureCollection" as const,
        features: [
          {
            type: "Feature" as const,
            id: pickId,
            geometry: { type: "Point" as const, coordinates: center },
            properties: {
              id: pickId,
              title: pickRow?.title || pickId,
              venue: pickRow?.venue || "",
              price: pickRow?.price ?? null,
            },
          },
        ],
      };
    }

    const base = showsBothVenues(venueToggles)
      ? allFeatures
      : {
          type: "FeatureCollection" as const,
          features: allFeatures.features.filter((f) =>
            venueMatches(
              venueToggles,
              String((f as { properties?: { venue?: string } }).properties?.venue || ""),
            ),
          ),
        };
    if (!pickId || !pickCenter) return base;
    const already = base.features.some(
      (f) => String((f as { properties?: { id?: string } }).properties?.id) === pickId,
    );
    if (already) return base;
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          id: pickId,
          geometry: { type: "Point" as const, coordinates: pickCenter },
          properties: {
            id: pickId,
            title: pickRow?.title || pickId,
            venue: pickRow?.venue || "",
            price: pickRow?.price ?? null,
          },
        },
        ...base.features,
      ],
    };
  }, [
    allFeatures,
    venueToggles,
    market,
    focusTarget?.center,
    selectOnly,
    pickRow,
  ]);

  const markets = useMemo(() => {
    if (selectOnly) {
      if (pickRow) return [pickRow];
      const id = String(market || "").trim();
      const hit = allMarkets.find((row) => row.id === id) || allMapMarkets.find((row) => row.id === id);
      return hit ? [hit] : [];
    }
    if (showsBothVenues(venueToggles)) return allMarkets;
    // Venue filter: prefer the denser map index so Kalshi/Poly-only isn't stuck
    // on whatever survived the mixed top-N rail slice.
    const source = allMapMarkets.length ? allMapMarkets : allMarkets;
    return source.filter((row) => venueMatches(venueToggles, row.venue));
  }, [allMarkets, allMapMarkets, venueToggles, selectOnly, pickRow, market]);
  const mapMarkets = useMemo(() => {
    if (selectOnly) return markets;
    return showsBothVenues(venueToggles)
      ? allMapMarkets
      : allMapMarkets.filter((row) => venueMatches(venueToggles, row.venue));
  }, [allMapMarkets, venueToggles, selectOnly, markets]);
  const activity = useMemo(() => {
    if (selectOnly) return [] as ActivityRow[];
    const base = showsBothVenues(venueToggles)
      ? allActivity
      : allActivity.filter((row) => row.kind === "headline" || venueMatches(venueToggles, row.venue));
    if (!newsPickRow) return base;
    if (base.some((row) => row.id === newsPickRow.id)) return base;
    return [newsPickRow, ...base];
  }, [allActivity, venueToggles, selectOnly, newsPickRow]);

  const selectedId = useMemo(() => {
    const id = market || snapshot?.selectedMarketId || null;
    if (!id || showsBothVenues(venueToggles)) return id;
    const row = allMapMarkets.find((item) => item.id === id);
    if (row && !venueMatches(venueToggles, row.venue)) return null;
    return id;
  }, [market, snapshot?.selectedMarketId, venueToggles, allMapMarkets]);

  // Count fills (and unique traders) that arrive after the first snapshot while viewing.
  useEffect(() => {
    if (!activity.length) return;
    if (!sessionPrimedRef.current) {
      for (const row of activity) {
        if (row.kind === "headline") continue;
        seenTradeIdsRef.current.add(row.id);
        const traderId = String(row.data?.traderId || "").trim();
        if (traderId) seenTraderIdsRef.current.add(traderId);
      }
      sessionPrimedRef.current = true;
      return;
    }
    let addedTrades = 0;
    let addedTraders = 0;
    for (const row of activity) {
      if (row.kind === "headline") continue;
      if (!seenTradeIdsRef.current.has(row.id)) {
        seenTradeIdsRef.current.add(row.id);
        addedTrades += 1;
      }
      const traderId = String(row.data?.traderId || "").trim();
      if (traderId && !seenTraderIdsRef.current.has(traderId)) {
        seenTraderIdsRef.current.add(traderId);
        addedTraders += 1;
      }
    }
    if (addedTrades) setSessionTrades((n) => n + addedTrades);
    if (addedTraders) setSessionTraders((n) => n + addedTraders);
  }, [activity]);

  const viewStats = useMemo(() => {
    const mapMarkets = features.features?.length || 0;
    const news = (pings.features?.length || 0) || activity.filter((row) => row.kind === "headline").length;
    const volume = markets.reduce((sum, row) => sum + (Number(row.volume24h) || 0), 0);
    const tradersInView = new Set<string>();
    const marketIds = new Set(markets.map((row) => row.id));
    for (const row of activity) {
      if (row.kind === "headline") continue;
      if (row.marketId && !marketIds.has(row.marketId)) continue;
      const traderId = String(row.data?.traderId || "").trim();
      if (traderId) tradersInView.add(traderId);
    }
    return {
      markets: mapMarkets || markets.length,
      news,
      trades: sessionTrades,
      volume,
      traders: Math.max(sessionTraders, tradersInView.size),
    };
  }, [features.features, pings.features, markets, activity, sessionTrades, sessionTraders]);

  const marketById = useMemo(() => {
    const map = new Map<string, MarketRow>();
    // Keep full index so a selected market stays resolvable while the venue filter changes.
    // Prefer denser map index, then rail feed (nav picks may land in feed before map).
    for (const row of allMapMarkets) map.set(row.id, row);
    for (const row of allMarkets) if (!map.has(row.id)) map.set(row.id, row);
    return map;
  }, [allMapMarkets, allMarkets]);

  // Drop selection when it falls outside the active venue filter.
  useEffect(() => {
    if (showsBothVenues(venueToggles) || !selectedId) return;
    const row = marketById.get(selectedId);
    if (row && !venueMatches(venueToggles, row.venue)) clearSelectionChrome();
  }, [venueToggles, selectedId, marketById, clearSelectionChrome]);

  // Keep open market detail in sync with polled feed quotes.
  const liveDetail = useMemo(() => {
    if (!detail || detail.kind === "news") return detail;
    if (detail.kind === "market") {
      const next = marketById.get(detail.market.id);
      return next ? { kind: "market" as const, market: next } : detail;
    }
    if (detail.kind === "trade" && detail.market) {
      const next = marketById.get(detail.market.id);
      return next ? { ...detail, market: next } : detail;
    }
    return detail;
  }, [detail, marketById]);

  const statusLabel = useMemo(() => {
    if (snapshot?.fixture) return snapshot.fixtureLabel || "Fixture";
    if (snapshot?.stale) return "Stale";
    return transport === "poll" ? "Live · 8s" : "Live";
  }, [snapshot?.fixture, snapshot?.fixtureLabel, snapshot?.stale, transport]);

  const coordsForMarket = useCallback(
    (id: string, row?: MarketRow | null) => {
      // Prefer the row (fresh `/api/war-room/market` geometry) over a stale select-only stub pin.
      const fromRow = coordsFromGeometry(row?.geometry);
      if (fromRow) return fromRow;
      const match = features.features.find(
        (f) => String((f as { properties?: { id?: string } }).properties?.id) === id,
      ) as { geometry?: { type?: string; coordinates?: [number, number] } } | undefined;
      const fromFeature = coordsFromGeometry(match?.geometry);
      if (fromFeature) return fromFeature;
      // Always land somewhere — nav picks must ping/zoom even before snapshot inject.
      return PICK_FALLBACK_COORDS;
    },
    [features.features],
  );

  const focusMarketPing = useCallback(
    (id: string, coords: [number, number], nonce = pickNonce) => {
      setFocusTarget(deepFocus(coords, `market:${id}:${nonce}:${Date.now()}`));
    },
    [pickNonce],
  );

  const stubPickRow = useCallback(
    (
      id: string,
      seed?: MarketRow | null,
      meta?: { title?: string; venue?: string; detail?: string },
    ): MarketRow => {
      if (seed && seed.id === id && seed.title && seed.title !== "Loading market…") return seed;
      const venueFromId = id.startsWith("polymarket:")
        ? "polymarket"
        : id.startsWith("kalshi:")
          ? "kalshi"
          : "";
      const venueRaw = String(meta?.venue || seed?.venue || venueFromId || "").toLowerCase();
      const venue = venueRaw.includes("poly")
        ? "polymarket"
        : venueRaw.includes("kalshi")
          ? "kalshi"
          : venueFromId;
      const title = String(meta?.title || seed?.title || "Selected market");
      return {
        id,
        title,
        venue,
        region: seed?.region || "Global",
        price: seed?.price ?? null,
        move: seed?.move ?? null,
        volume24h: seed?.volume24h ?? null,
        imageUrl: seed?.imageUrl ?? null,
        avatarUrl: seed?.avatarUrl ?? null,
        slug: seed?.slug ?? null,
        venueMarketId: seed?.venueMarketId ?? null,
        tokenIds: seed?.tokenIds,
        outcomes: seed?.outcomes,
        geometry:
          seed?.geometry || {
            type: "Point",
            coordinates: fallbackCoordsForPick({ title, detail: meta?.detail }),
          },
      };
    },
    [],
  );

  const openMarketDetail = useCallback(
    (id: string, rowOverride?: MarketRow | null, opts?: { focus?: boolean; selectOnly?: boolean }) => {
      const row = rowOverride || marketById.get(id) || (opts?.selectOnly ? stubPickRow(id) : null);
      if (!row) return false;
      setMarket(id);
      setActivityId(null);
      if (opts?.selectOnly) {
        setSelectOnly(true);
        setPickRow(row);
        setNewsPickRow(null);
        pendingNewsPickRef.current = null;
        focusStreamArmedRef.current = false;
      } else {
        // Desk / in-map selection exits the nav select-only lens.
        setSelectOnly(false);
        setPickRow(null);
        setPickBusy(false);
        focusStreamArmedRef.current = false;
        clearPendingSelectOnlyMarketPick();
      }
      const coords = coordsForMarket(id, row);
      if (opts?.focus !== false && coords) {
        focusMarketPing(id, coords);
      }
      setDetail({ kind: "market", market: row });
      setDetailOpen(true);
      setFeedRevealed(true);
      noteMobileInteraction();
      if (compact && !mobileLanding) setMobileView("detail");
      return true;
    },
    [compact, coordsForMarket, focusMarketPing, marketById, mobileLanding, noteMobileInteraction, setMarket, stubPickRow],
  );

  // After camera/focus settles on a Jarvis pick: stream right rail + other pins (keep left panel).
  useEffect(() => {
    if (!selectOnly || !focusTarget || pickBusy) return;
    if (focusStreamArmedRef.current) return;
    focusStreamArmedRef.current = true;
    const timer = window.setTimeout(() => {
      // Exit hard solo lens so desk fetch may start; keep detail/pickRow painted.
      clearPendingSelectOnlyMarketPick();
      setSelectOnly(false);
      setPickBusy(false);
    }, POST_FOCUS_STREAM_MS);
    return () => window.clearTimeout(timer);
  }, [selectOnly, focusTarget, pickBusy]);

  // Nav select-only: fetch market detail only (never full desk). Event handler opens UI immediately.
  const revealedKeyRef = useRef<string | null>(null);
  const openMarketDetailRef = useRef(openMarketDetail);
  openMarketDetailRef.current = openMarketDetail;
  useEffect(() => {
    const id = String(market || "").trim();
    if (!id || !selectOnly) return;
    const key = `${id}#${pickNonce}#so`;
    if (revealedKeyRef.current === key) return;
    revealedKeyRef.current = key;

    let cancelled = false;
    setPickBusy(true);
    // Never leave Agent Steps stuck if the market lookup hangs.
    const busyCap = window.setTimeout(() => {
      if (!cancelled) setPickBusy(false);
    }, 2400);
    (async () => {
      try {
        const res = await fetch(
          `/api/war-room/market?${new URLSearchParams({
            id,
            ...(fixture ? { fixture: "1" } : {}),
          })}`,
          { credentials: "same-origin" },
        );
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !body?.market) {
          setPickBusy(false);
          return;
        }
        const m = body.market as {
          id?: string;
          title?: string;
          venue?: string;
          region?: string;
          slug?: string | null;
          venueMarketId?: string | null;
          quote?: { price?: number | null; move?: number | null } | null;
          volume24h?: number | null;
          imageUrl?: string | null;
          avatarUrl?: string | null;
          geometry?: { type: string; coordinates: [number, number] } | null;
          outcomes?: MarketRow["outcomes"];
          tokenIds?: string[];
        };
        const geom =
          m.geometry?.type === "Point"
            ? m.geometry
            : { type: "Point" as const, coordinates: PICK_FALLBACK_COORDS };
        const row: MarketRow = {
          id: String(m.id || id),
          title: String(m.title || id),
          venue: String(m.venue || ""),
          region: String(m.region || "Global"),
          price: m.quote?.price ?? null,
          move: m.quote?.move ?? null,
          volume24h: m.volume24h ?? null,
          imageUrl: m.imageUrl ?? null,
          avatarUrl: m.avatarUrl ?? null,
          slug: m.slug ?? null,
          venueMarketId: m.venueMarketId ?? null,
          tokenIds: m.tokenIds,
          outcomes: m.outcomes,
          geometry: geom,
        };
        openMarketDetailRef.current(row.id, row, { focus: true, selectOnly: true });
      } catch {
        /* keep optimistic stub from the pick event */
      } finally {
        window.clearTimeout(busyCap);
        setPickBusy(false);
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(busyCap);
    };
  }, [market, pickNonce, selectOnly, fixture]);

  const applySelectOnlyPick = useCallback(
    (detail: {
      marketId?: string;
      selectOnly?: boolean;
      title?: string;
      venue?: string;
      detail?: string;
    }) => {
      const id = String(detail?.marketId || "").trim();
      if (!id) return false;
      const only = detail?.selectOnly !== false;
      revealedKeyRef.current = null;
      const seed = marketById.get(id) || null;
      const optimistic = stubPickRow(id, seed, {
        title: detail?.title,
        venue: detail?.venue,
        detail: detail?.detail,
      });
      // Left panel + pin/zoom in the same turn — do not wait for desk snapshot.
      openMarketDetail(id, optimistic, { focus: true, selectOnly: only });
      if (only) setPickBusy(true);
      return true;
    },
    [marketById, openMarketDetail, stubPickRow],
  );

  // Accept the pick event: enter select-only immediately (scroll already started).
  useEffect(() => {
    const onPick = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          marketId?: string;
          selectOnly?: boolean;
          title?: string;
          venue?: string;
          detail?: string;
        }>
      ).detail;
      applySelectOnlyPick(detail || {});
    };
    window.addEventListener(WAR_ROOM_MARKET_PICK_EVENT, onPick as EventListener);
    return () => window.removeEventListener(WAR_ROOM_MARKET_PICK_EVENT, onPick as EventListener);
  }, [applySelectOnlyPick]);

  // `/war-room` soft-nav / HMR remount: re-apply sticky Jarvis pick as select-only (no desk flood).
  useEffect(() => {
    const pending = peekPendingSelectOnlyMarketPick();
    if (!pending?.selectOnly || !pending.marketId) return;
    // Prefer pending id; controlled `market` may lag one frame behind replaceState/router.
    if (market && market !== pending.marketId) return;
    if (selectOnly && pickRow?.id === pending.marketId) return;
    applySelectOnlyPick(pending);
  }, [market, pickNonce, selectOnly, pickRow?.id, applySelectOnlyPick]);

  const selectActivity = useCallback(
    (row: ActivityRow) => {
      setActivityId(row.id);
      if (row.kind === "headline") {
        const related = relatedMarketsForHeadline({
          pulseMarkets: row.data?.markets || [],
          linkedMarketId: row.marketId,
          headline: row.title,
          deskById: marketById,
          deskRows: markets,
          limit: 6,
        });
        if (row.geometry?.coordinates) {
          setFocusTarget(deepFocus(row.geometry.coordinates, `news:${row.id}:${Date.now()}`));
        }
        setDetail({ kind: "news", activity: row, relatedMarkets: related });
        setDetailOpen(true);
        noteMobileInteraction();
        if (compact && !mobileLanding) setMobileView("detail");
        return;
      }

      if (row.marketId) setMarket(row.marketId);
      const coords = row.geometry?.coordinates || (row.marketId ? coordsForMarket(row.marketId) : null);
      if (coords) {
        setFocusTarget(deepFocus(coords, `trade:${row.id}:${Date.now()}`));
      }
      setDetail({
        kind: "trade",
        activity: row,
        market: row.marketId ? marketById.get(row.marketId) || null : null,
      });
      setDetailOpen(true);
      noteMobileInteraction();
      if (compact && !mobileLanding) setMobileView("detail");
    },
    [compact, coordsForMarket, marketById, markets, mobileLanding, noteMobileInteraction, setMarket],
  );

  const selectActivityRef = useRef(selectActivity);
  selectActivityRef.current = selectActivity;

  const applyNewsPick = useCallback(
    (query: string, title?: string, allowStub = false) => {
      const hit = matchHeadlineActivity(allActivity, query, title);
      if (hit) {
        pendingNewsPickRef.current = null;
        setNewsPickRow(null);
        setSelectOnly(false);
        setPickRow(null);
        setPickBusy(false);
        selectActivityRef.current(hit);
        return true;
      }
      if (!allowStub) return false;
      const stub = stubNewsActivity(query, title);
      // Keep pending so a later desk/activity load can upgrade stub → real headline.
      pendingNewsPickRef.current = { query, title };
      setSelectOnly(false);
      setPickRow(null);
      setPickBusy(false);
      setNewsPickRow(stub);
      selectActivityRef.current(stub);
      return true;
    },
    [allActivity],
  );

  // Jarvis news → same as right-rail headline click (not /news-archive).
  useEffect(() => {
    const onNews = (event: Event) => {
      const detail = (event as CustomEvent<{ query?: string; title?: string }>).detail;
      const query = String(detail?.query || detail?.title || "").trim();
      if (!query) return;
      const title = detail?.title ? String(detail.title) : undefined;
      pendingNewsPickRef.current = { query, title };
      setSelectOnly(false);
      setPickRow(null);
      setPickBusy(false);
      // Clear market select-only lens so the desk/activity can paint again.
      setMarket(null);
      if (!applyNewsPick(query, title, false)) {
        // Desk may still be loading — stub immediately so left panel + ping show now.
        applyNewsPick(query, title, true);
      }
    };
    window.addEventListener(WAR_ROOM_NEWS_PICK_EVENT, onNews as EventListener);
    return () => window.removeEventListener(WAR_ROOM_NEWS_PICK_EVENT, onNews as EventListener);
  }, [applyNewsPick, setMarket]);

  // When activity arrives after a news pick, upgrade stub → real headline if possible.
  useEffect(() => {
    const pending = pendingNewsPickRef.current;
    if (!pending) return;
    applyNewsPick(pending.query, pending.title, false);
  }, [allActivity, applyNewsPick]);

  const handleNavigate = useCallback(
    (request: WarRoomNavigateRequest) => {
      setDetailOpen(false);
      onNavigate?.(request);
    },
    [onNavigate],
  );

  const onSelectRelatedMarket = useCallback(
    (row: MarketRow) => {
      if (marketById.has(row.id)) {
        openMarketDetail(row.id);
        return;
      }
      setMarket(row.id);
      setDetail({ kind: "market", market: row });
      setDetailOpen(true);
      noteMobileInteraction();
      if (compact && !mobileLanding) setMobileView("detail");
    },
    [compact, marketById, mobileLanding, noteMobileInteraction, openMarketDetail, setMarket],
  );

  const onSelectGlobe = useCallback(
    (selection: { id: string; kind: "market" | "news" }) => {
      if (selection.kind === "news") {
        const row = activity.find((item) => item.id === selection.id);
        if (row) selectActivity(row);
        return;
      }
      openMarketDetail(selection.id);
    },
    [activity, openMarketDetail, selectActivity],
  );

  const mobileTabs = (
    <div
      className={cn(
        "flex rounded-full border p-0.5 text-[11px] backdrop-blur",
        dark ? "border-white/10 bg-black/70" : "border-border/70 bg-background/90",
      )}
    >
      {(
        [
          ["globe", "Globe"],
          ["detail", "Detail"],
          ["feed", "Feed"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={cn(
            "rounded-full px-2 py-0.5",
            mobileView === id
              ? dark
                ? "bg-white text-slate-950"
                : "bg-foreground text-background"
              : dark
                ? "text-slate-300"
                : "text-muted-foreground",
          )}
          onClick={() => setMobileView(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const chipClass = (selected: boolean) =>
    cn(
      "shrink-0 rounded-full px-2.5 py-1 text-[11px] transition-colors",
      selected
        ? dark
          ? "bg-white font-medium text-slate-950"
          : "bg-slate-900 font-medium text-white"
        : dark
          ? "text-slate-300 hover:bg-white/10 hover:text-white"
          : "text-slate-600 hover:bg-black/[0.06] hover:text-slate-900",
    );

  /** Compact strip Toggle — same density as the feed chips above. */
  const stripToggleClass = (selected: boolean) =>
    cn(
      "h-auto min-h-0 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium shadow-none ring-offset-0",
      "hover:bg-transparent focus-visible:ring-1 focus-visible:ring-offset-0",
      "data-[state=on]:bg-transparent",
      selected
        ? dark
          ? "bg-white text-slate-950 hover:bg-white hover:text-slate-950 data-[state=on]:bg-white data-[state=on]:text-slate-950"
          : "bg-slate-900 text-white hover:bg-slate-900 hover:text-white data-[state=on]:bg-slate-900 data-[state=on]:text-white"
        : dark
          ? "text-slate-300 hover:bg-white/10 hover:text-white"
          : "text-slate-600 hover:bg-black/[0.06] hover:text-slate-900",
    );

  /** Venue toggles: VenueTag brand fills when on; same blank chip as categories when off. */
  const venueStripToggleClass = (id: VenueId, selected: boolean) =>
    cn(
      "h-auto min-h-0 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium shadow-none ring-offset-0",
      "focus-visible:ring-1 focus-visible:ring-offset-0",
      selected
        ? id === "kalshi"
          ? "bg-[#28CC95] text-slate-950 hover:bg-[#28CC95] hover:text-slate-950 data-[state=on]:bg-[#28CC95] data-[state=on]:text-slate-950"
          : "bg-[#2E5CFF] text-white hover:bg-[#2E5CFF] hover:text-white data-[state=on]:bg-[#2E5CFF] data-[state=on]:text-white"
        : dark
          ? "bg-transparent text-slate-300 hover:bg-white/10 hover:text-white data-[state=on]:bg-transparent"
          : "bg-transparent text-slate-600 hover:bg-black/[0.06] hover:text-slate-900 data-[state=on]:bg-transparent",
    );

  const exploreFeedGroups = useMemo(() => {
    const groups: Array<{ label: string; feeds: typeof EXPLORE_FEEDS }> = [];
    for (const item of EXPLORE_FEEDS) {
      const label = EXPLORE_TOP_FEEDS.has(item.id) ? "Sort markets by" : "";
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.feeds.push(item);
      else groups.push({ label, feeds: [item] });
    }
    return groups;
  }, []);

  const categoryBar = (
    <div
      className={cn(
        "pointer-events-auto absolute left-1/2 top-3 z-20 flex max-w-[min(100%,56rem)] -translate-x-1/2 flex-col gap-1 rounded-2xl border px-1.5 py-1.5 backdrop-blur-md",
        dark
          ? "border-white/10 bg-black/70 shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
          : "border-black/10 bg-[#f3f2f1] shadow-[0_8px_28px_rgba(15,23,42,0.12)]",
      )}
    >
      <div
        role="tablist"
        aria-label="Markets to show"
        className="flex max-w-full items-center gap-1 overflow-x-auto"
      >
        {exploreFeedGroups.map((group) =>
          group.label ? (
            <div
              key={group.label}
              role="group"
              aria-label={group.label}
              className="flex shrink-0 items-center gap-1"
            >
              {group.feeds.map((feed) => {
                const selected = !categoryId && exploreFeedId === feed.id;
                return (
                  <button
                    key={feed.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => pickExploreFeed(feed.id)}
                    className={chipClass(selected)}
                  >
                    {feed.label}
                  </button>
                );
              })}
            </div>
          ) : (
            group.feeds.map((feed) => {
              const selected = !categoryId && exploreFeedId === feed.id;
              return (
                <button
                  key={feed.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => pickExploreFeed(feed.id)}
                  className={chipClass(selected)}
                >
                  {feed.label}
                </button>
              );
            })
          ),
        )}
      </div>
      <div
        className={cn(
          "flex max-w-full items-center gap-1 overflow-x-auto border-t pt-1",
          dark ? "border-white/10" : "border-black/10",
        )}
      >
        <div aria-label="Venues" className="flex shrink-0 items-center gap-1">
          {VENUE_OPTIONS.map((option) => {
            const selected = venueToggles[option.id];
            return (
              <Toggle
                key={option.id}
                size="sm"
                pressed={selected}
                aria-label={option.label}
                onPressedChange={(next) =>
                  setVenueToggles((prev) => ({ ...prev, [option.id]: next }))
                }
                className={venueStripToggleClass(option.id, selected)}
              >
                {option.label}
              </Toggle>
            );
          })}
        </div>
        <div aria-label="Categories" className="flex min-w-0 flex-1 items-center gap-1">
          {CATEGORIES.map((category) => {
            const selected = categoryId === category.id;
            return (
              <Toggle
                key={category.id}
                size="sm"
                pressed={selected}
                aria-label={category.label}
                onPressedChange={(next) => pickCategory(next ? category.id : "")}
                className={stripToggleClass(selected)}
              >
                {category.label}
              </Toggle>
            );
          })}
        </div>
      </div>
    </div>
  );

  const viewStatsOverlay = (
    <div
      aria-label="World view stats"
      className="pointer-events-none absolute right-3 top-3 z-20 flex flex-col items-end gap-1 text-right"
    >
      {(
        [
          {
            key: "markets",
            label: "markets",
            value: formatCount(viewStats.markets),
            color: dark ? "text-sky-300" : "text-sky-700",
          },
          {
            key: "news",
            label: "breaking news",
            value: formatCount(viewStats.news),
            color: dark ? "text-rose-300" : "text-rose-700",
          },
          {
            key: "trades",
            label: "trades this session",
            value: formatCount(viewStats.trades),
            color: dark ? "text-amber-300" : "text-amber-800",
          },
          {
            key: "volume",
            label: "volume tracked",
            value: formatVolume(viewStats.volume),
            color: dark ? "text-emerald-300" : "text-emerald-700",
          },
          {
            key: "traders",
            label: "traders",
            value: formatCount(viewStats.traders),
            color: dark ? "text-violet-300" : "text-violet-700",
          },
        ] as const
      ).map((stat) => (
        <div key={stat.key} className="leading-none">
          <span className={cn("font-mono text-[11px] font-semibold tabular-nums", stat.color)}>
            {stat.value}
          </span>
          <span
            className={cn(
              "ml-1.5 text-[9px] font-medium uppercase tracking-[0.12em]",
              dark ? "text-slate-500" : "text-slate-700",
            )}
          >
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );

  const globe = (
    <div className="relative h-full w-full">
      {selectOnly ? null : categoryBar}
      {selectOnly ? null : viewStatsOverlay}
      {!compact ? (
        <WarRoomLayersRail lockKind={embedded ? "pro" : "coming-soon"} />
      ) : null}
      {/* Cold/pick: centered. Progressive desk stream: docked so pins/rails stay visible. Never over open pick panel. */}
      {(coldStart || pickBusy || (loading && !!snapshot && !selectOnly)) && !detailOpen ? (
        <div
          className={
            coldStart || pickBusy
              ? "pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-3"
              : "pointer-events-none absolute bottom-14 left-1/2 z-30 w-[min(22rem,calc(100%-1.5rem))] -translate-x-1/2"
          }
        >
          <WarRoomAgentStepsLoader tone={loadTone === "dark" ? "dark" : "default"} />
        </div>
      ) : null}
      {!compact ? (
        <button
          type="button"
          onClick={resetMapView}
          className="pointer-events-auto absolute bottom-3 left-2 z-20 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/70 px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-300 shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur hover:bg-black/85 hover:text-white"
          title="Reset map view"
          aria-label="Reset map to opening view"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </button>
      ) : null}
      <GlobeStage
        enhance={embedded ? "auto" : compact ? "never" : "always"}
        allowCompact={embedded}
        features={features as WarRoomGlobeProps["features"]}
        pings={pings as WarRoomGlobeProps["pings"]}
        selectedMarketId={selectedId}
        focusTarget={focusTarget}
        resetNonce={mapResetNonce}
        keepGlobe={embedded}
        interactive
        onSelect={onSelectGlobe}
        onTapPoster={compact && !embedded ? () => setMobileView("globe") : undefined}
        className="h-full w-full"
      />
    </div>
  );

  const feed = (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col",
        dark ? "bg-[#07090f] text-slate-100" : "bg-background text-foreground",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b px-2.5 py-1.5",
          dark ? "border-white/10" : "border-border/70",
        )}
      >
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[0.14em]",
            dark ? "text-slate-400" : "text-muted-foreground",
          )}
        >
          {marketsRailLabel}
        </p>
        <span className={cn("shrink-0 text-[10px]", dark ? "text-slate-500" : "text-muted-foreground")}>
          {loading && snapshot ? "Updating…" : coldStart ? "Loading…" : statusLabel}
        </span>
      </div>
      {error ? (
        <p className={cn("px-2.5 py-1 text-[11px]", dark ? "text-rose-300" : "text-rose-600")}>{error}</p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className={cn("flex min-h-0 flex-1 flex-col border-b", dark ? "border-white/10" : "border-border/70")}>
          {coldStart ? (
            <WarRoomRailSkeleton rows={9} />
          ) : (
            <MarketsPane
              rows={markets}
              selectedId={selectedId}
              onSelect={openMarketDetail}
              emptyReason={
                !markets.length && allMarkets.length
                  ? "no_markets_in_venue"
                  : snapshot?.emptyReason
              }
            />
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            className={cn(
              "flex items-center justify-between gap-2 border-b px-2.5 py-1.5",
              dark ? "border-white/10" : "border-border/70",
            )}
          >
            <p
              className={cn(
                "min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[0.14em]",
                dark ? "text-slate-400" : "text-muted-foreground",
              )}
            >
              {activityRailLabel}
            </p>
            <span className={cn("shrink-0 text-[10px]", dark ? "text-slate-500" : "text-muted-foreground")}>
              {coldStart ? "…" : activity.length}
            </span>
          </div>
          {coldStart ? (
            <WarRoomRailSkeleton rows={7} />
          ) : (
            <ActivityPane rows={activity} selectedId={activityId} onSelect={selectActivity} />
          )}
        </div>
      </div>
    </aside>
  );

  const detailPane = (
    <WarRoomDetailCard
      open={detailOpen}
      target={liveDetail}
      activityFeed={activity}
      onOpenChange={(next) => {
        setDetailOpen(next);
        if (!next && compact && !mobileLanding) setMobileView("globe");
      }}
      onNavigate={handleNavigate}
      onSelectRelatedMarket={onSelectRelatedMarket}
      onSelectActivity={selectActivity}
    />
  );

  const showLeft = mobileLanding ? false : detailOpen;
  // Select-only nav picks hide the “all tradable” right rail entirely.
  // Mobile landing: globe only — no feed tab.
  const showRight = mobileLanding
    ? false
    : selectOnly
      ? false
      : compact
        ? mobileView === "feed"
        : feedRevealed;

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative flex min-h-0 flex-col",
        dark ? "bg-black text-slate-100" : "bg-background text-foreground",
        embedded ? "h-full w-full" : "h-[100svh] min-h-[100svh]",
        className,
      )}
      data-war-room-theme={dark ? "dark" : "light"}
    >
      {!embedded ? (
        <header
          className={cn(
            "flex items-center justify-between gap-3 border-b px-3 py-1.5",
            dark ? "border-white/10" : "border-border/70",
          )}
        >
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className={cn("font-medium", dark ? "text-white" : "text-foreground")}>
              Lychee
            </Link>
            <span className={dark ? "text-slate-600" : "text-muted-foreground"}>/</span>
            <span className={dark ? "text-slate-300" : "text-muted-foreground"}>War Room</span>
          </div>
          <div className={cn("flex items-center gap-2 text-[11px]", dark ? "text-slate-500" : "text-muted-foreground")}>
            <span>{statusLabel}</span>
            {compact ? mobileTabs : null}
          </div>
        </header>
      ) : compact && !mobileLanding ? (
        <div className="absolute right-3 top-3 z-20">{mobileTabs}</div>
      ) : null}

      <div className={cn("relative flex min-h-0 flex-1", embedded && "overflow-hidden")}>
        {/* Left: only when a selection needs the detail rail (desktop / standalone compact) */}
        {mobileLanding ? null : (
          <div
            className={cn(
              "min-h-0 overflow-hidden transition-[width,opacity,border-color] duration-300 ease-out",
              compact
                ? mobileView === "detail"
                  ? cn(
                      "flex w-full flex-col border-r",
                      dark ? "border-white/10" : "border-border/70",
                    )
                  : "hidden w-0"
                : showLeft
                  ? cn(
                      "flex w-[min(100%,26rem)] shrink-0 flex-col border-r opacity-100",
                      dark ? "border-white/10" : "border-border/70",
                    )
                  : "w-0 border-r-0 opacity-0",
            )}
          >
            {showLeft || (compact && mobileView === "detail") ? detailPane : null}
          </div>
        )}

        {/* Center: globe */}
        <div
          className={cn(
            "relative min-h-0",
            mobileLanding
              ? "min-w-0 flex-1"
              : compact
                ? mobileView === "globe"
                  ? "flex-1"
                  : "hidden"
                : "min-w-0 flex-1",
          )}
          onPointerDown={mobileLanding ? noteMobileInteraction : undefined}
        >
          {globe}
        </div>

        {/* Right: slides in once the War Room is in view */}
        {mobileLanding ? null : (
          <div
            className={cn(
              "min-h-0 overflow-hidden transition-[width,transform,opacity] duration-500 ease-out",
              compact
                ? mobileView === "feed"
                  ? "flex w-full flex-col border-l border-white/10"
                  : "hidden w-0"
                : showRight
                  ? "flex w-[min(100%,22rem)] shrink-0 translate-x-0 flex-col border-l border-white/10 opacity-100"
                  : "w-0 translate-x-8 border-l-0 opacity-0",
            )}
          >
            {showRight || (compact && mobileView === "feed") ? feed : null}
          </div>
        )}
      </div>

      {mobileLanding ? (
        <>
          <WarRoomMobileDetailModal
            open={detailOpen}
            target={liveDetail}
            activityFeed={activity}
            onOpenChange={setDetailOpen}
            onNavigate={handleNavigate}
            onSelectRelatedMarket={onSelectRelatedMarket}
            onSelectActivity={selectActivity}
          />
          <WarRoomMobileEmailInterrupt armed={emailArmed} />
        </>
      ) : null}
    </div>
  );
}

export type { WarRoomNavigateRequest };
