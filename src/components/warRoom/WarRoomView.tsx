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
import { cn } from "@/lib/utils";

import { ActivityPane, type ActivityRow } from "./ActivityPane";
import { formatVolume } from "./format";
import { GlobeStage } from "./GlobeStage";
import { MarketsPane, type MarketRow } from "./MarketsPane";
import {
  WarRoomDetailCard,
  type WarRoomDetailTarget,
  type WarRoomNavigateRequest,
} from "./WarRoomDetailCard";
import { DashboardLoadingProgress } from "@/components/publicEmbed/DashboardLoadingProgress";
import { WarRoomLayersRail } from "./WarRoomLayersRail";
import { WAR_ROOM_LOAD_STEPS, WarRoomRailSkeleton } from "./WarRoomLoadingProgress";
import { relatedMarketsForHeadline } from "./relatedMarkets";
import { useWarRoomData } from "./useWarRoomData";

function formatCount(n: number) {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(n));
}

type VenueFilter = "both" | "kalshi" | "polymarket";

const VENUE_FILTERS: Array<{ id: VenueFilter; label: string }> = [
  { id: "both", label: "Both" },
  { id: "kalshi", label: "Kalshi" },
  { id: "polymarket", label: "Polymarket" },
];

function venueMatches(filter: VenueFilter, venue: string | null | undefined) {
  if (filter === "both") return true;
  return String(venue || "").toLowerCase() === filter;
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
  className,
}: {
  fixture?: boolean;
  /** Homepage embed: fill the parent, lighter chrome. */
  embedded?: boolean;
  market?: string;
  onMarketChange?: (id: string | null) => void;
  onNavigate?: (request: WarRoomNavigateRequest) => void;
  className?: string;
}) {
  const compactScreen = useCompactScreen();
  /** Until the breakpoint is known, treat as desktop so we don't thrash mobile snapshot fetches. */
  const compact = compactScreen === true;
  const [localMarket, setLocalMarket] = useState("");
  const [mobileView, setMobileView] = useState<"globe" | "feed" | "detail">("globe");
  const [activityId, setActivityId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const [detail, setDetail] = useState<WarRoomDetailTarget | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [feedRevealed, setFeedRevealed] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [exploreFeedId, setExploreFeedId] = useState("tradable");
  const [venueFilter, setVenueFilter] = useState<VenueFilter>("both");
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

  const { snapshot, error, loading, transport } = useWarRoomData({
    desk: "all",
    market,
    category: categoryId,
    exploreFeed: categoryId ? undefined : exploreFeedId || "tradable",
    fixture,
    mobile: compact,
  });

  /** Cold start only — never blank rails/globe once we have a snapshot. */
  const coldStart = loading && !snapshot;

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
    const raw = snapshot?.pings as { type?: string; features?: unknown } | null | undefined;
    if (raw?.type === "FeatureCollection" && Array.isArray(raw.features)) {
      return raw as { type: "FeatureCollection"; features: never[] };
    }
    return emptyCollection;
  }, [snapshot?.pings, emptyCollection]);
  const allMarkets = (Array.isArray(snapshot?.feed) ? snapshot.feed : []) as MarketRow[];
  /** All globe points — feed is a rail-sized slice; clicks must resolve against this. */
  const allMapMarkets = (
    Array.isArray(snapshot?.mapMarkets) && snapshot.mapMarkets.length
      ? snapshot.mapMarkets
      : allMarkets
  ) as MarketRow[];
  const allActivity = (Array.isArray(snapshot?.activity) ? snapshot.activity : []) as ActivityRow[];

  const features = useMemo(() => {
    if (venueFilter === "both") return allFeatures;
    return {
      type: "FeatureCollection" as const,
      features: allFeatures.features.filter((f) =>
        venueMatches(venueFilter, String((f as { properties?: { venue?: string } }).properties?.venue || "")),
      ),
    };
  }, [allFeatures, venueFilter]);

  const markets = useMemo(
    () => (venueFilter === "both" ? allMarkets : allMarkets.filter((row) => venueMatches(venueFilter, row.venue))),
    [allMarkets, venueFilter],
  );
  const mapMarkets = useMemo(
    () =>
      venueFilter === "both" ? allMapMarkets : allMapMarkets.filter((row) => venueMatches(venueFilter, row.venue)),
    [allMapMarkets, venueFilter],
  );
  const activity = useMemo(
    () =>
      venueFilter === "both"
        ? allActivity
        : allActivity.filter((row) => row.kind === "headline" || venueMatches(venueFilter, row.venue)),
    [allActivity, venueFilter],
  );

  const selectedId = useMemo(() => {
    const id = market || snapshot?.selectedMarketId || null;
    if (!id || venueFilter === "both") return id;
    const row = allMapMarkets.find((item) => item.id === id);
    if (row && !venueMatches(venueFilter, row.venue)) return null;
    return id;
  }, [market, snapshot?.selectedMarketId, venueFilter, allMapMarkets]);

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
    for (const row of allMapMarkets) map.set(row.id, row);
    return map;
  }, [allMapMarkets]);

  // Drop selection when it falls outside the active venue filter.
  useEffect(() => {
    if (venueFilter === "both" || !selectedId) return;
    const row = marketById.get(selectedId);
    if (row && !venueMatches(venueFilter, row.venue)) clearSelectionChrome();
  }, [venueFilter, selectedId, marketById, clearSelectionChrome]);

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
    (id: string) => {
      const match = features.features.find(
        (f) => String((f as { properties?: { id?: string } }).properties?.id) === id,
      ) as { geometry?: { coordinates?: [number, number] } } | undefined;
      return match?.geometry?.coordinates || null;
    },
    [features.features],
  );

  const openMarketDetail = useCallback(
    (id: string) => {
      const row = marketById.get(id);
      if (!row) return;
      setMarket(id);
      setActivityId(null);
      const coords = coordsForMarket(id);
      if (coords) {
        setFocusTarget(deepFocus(coords, `market:${id}:${Date.now()}`));
      }
      setDetail({ kind: "market", market: row });
      setDetailOpen(true);
      if (compact) setMobileView("detail");
    },
    [compact, coordsForMarket, marketById, setMarket],
  );

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
        if (compact) setMobileView("detail");
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
      if (compact) setMobileView("detail");
    },
    [compact, coordsForMarket, marketById, markets, setMarket],
  );

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
      if (compact) setMobileView("detail");
    },
    [compact, marketById, openMarketDetail, setMarket],
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
    <div className="flex rounded-full border border-white/10 bg-black/70 p-0.5 text-[11px] backdrop-blur">
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
            mobileView === id ? "bg-white text-slate-950" : "text-slate-300",
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
        ? "bg-white font-medium text-slate-950"
        : "text-slate-300 hover:bg-white/10 hover:text-white",
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
    <div className="pointer-events-auto absolute left-1/2 top-3 z-20 flex max-w-[min(100%,56rem)] -translate-x-1/2 flex-col gap-1 rounded-2xl border border-white/10 bg-black/70 px-1.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <div
        role="tablist"
        aria-label="Markets to show"
        className="flex max-w-full items-end gap-1 overflow-x-auto"
      >
        {exploreFeedGroups.map((group) =>
          group.label ? (
            <div key={group.label} role="group" aria-label={group.label} className="flex shrink-0 flex-col gap-0.5">
              <span className="px-1 text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
                {group.label}
              </span>
              <div className="flex items-center gap-1">
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
      <div className="flex max-w-full items-center gap-2 overflow-x-auto border-t border-white/10 pt-1">
        <div
          role="tablist"
          aria-label="Categories"
          className="flex min-w-0 flex-1 items-center gap-1"
        >
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={categoryId === category.id}
              onClick={() => pickCategory(categoryId === category.id ? "" : category.id)}
              className={chipClass(categoryId === category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>
        <div
          role="radiogroup"
          aria-label="Venues"
          className="flex shrink-0 items-center rounded-full border border-white/10 bg-black/50 p-0.5"
        >
          {VENUE_FILTERS.map((option) => {
            const selected = venueFilter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setVenueFilter(option.id)}
                className={cn(
                  "rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] transition-colors",
                  selected
                    ? option.id === "kalshi"
                      ? "bg-[#28CC95] text-slate-950"
                      : option.id === "polymarket"
                        ? "bg-[#2E5CFF] text-white"
                        : "bg-white text-slate-950"
                    : "text-slate-400 hover:text-white",
                )}
              >
                {option.label}
              </button>
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
          { key: "markets", label: "markets", value: formatCount(viewStats.markets), color: "text-sky-300" },
          { key: "news", label: "breaking news", value: formatCount(viewStats.news), color: "text-rose-300" },
          { key: "trades", label: "trades this session", value: formatCount(viewStats.trades), color: "text-amber-300" },
          { key: "volume", label: "volume tracked", value: formatVolume(viewStats.volume), color: "text-emerald-300" },
          { key: "traders", label: "traders", value: formatCount(viewStats.traders), color: "text-violet-300" },
        ] as const
      ).map((stat) => (
        <div key={stat.key} className="leading-none">
          <span className={cn("font-mono text-[11px] tabular-nums", stat.color)}>{stat.value}</span>
          <span className="ml-1.5 text-[9px] uppercase tracking-[0.12em] text-slate-500">{stat.label}</span>
        </div>
      ))}
    </div>
  );

  const globe = (
    <div className="relative h-full w-full">
      {categoryBar}
      {viewStatsOverlay}
      {!compact ? (
        <WarRoomLayersRail lockKind={embedded ? "pro" : "coming-soon"} />
      ) : null}
      {loading ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-3">
          <DashboardLoadingProgress tone="dark" steps={WAR_ROOM_LOAD_STEPS} />
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
        features={features}
        pings={pings}
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
    <aside className="flex h-full min-h-0 w-full flex-col bg-[#07090f] text-slate-100">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-2.5 py-1.5">
        <p className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {marketsRailLabel}
        </p>
        <span className="shrink-0 text-[10px] text-slate-500">
          {loading && snapshot ? "Updating…" : coldStart ? "Loading…" : statusLabel}
        </span>
      </div>
      {error ? <p className="px-2.5 py-1 text-[11px] text-rose-300">{error}</p> : null}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-b border-white/10">
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
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-2.5 py-1.5">
            <p className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {activityRailLabel}
            </p>
            <span className="shrink-0 text-[10px] text-slate-500">
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
        if (!next && compact) setMobileView("globe");
      }}
      onNavigate={handleNavigate}
      onSelectRelatedMarket={onSelectRelatedMarket}
      onSelectActivity={selectActivity}
    />
  );

  const showLeft = detailOpen;
  const showRight = compact ? mobileView === "feed" : feedRevealed;

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative flex min-h-0 flex-col bg-black text-slate-100",
        embedded ? "h-full w-full" : "h-[100svh] min-h-[100svh]",
        className,
      )}
    >
      {!embedded ? (
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-1.5">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="font-medium text-white">
              Lychee
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300">War Room</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>{statusLabel}</span>
            {compact ? mobileTabs : null}
          </div>
        </header>
      ) : compact ? (
        <div className="absolute right-3 top-3 z-20">{mobileTabs}</div>
      ) : null}

      <div className={cn("relative flex min-h-0 flex-1", embedded && "overflow-hidden")}>
        {/* Left: only when a selection needs the detail rail */}
        <div
          className={cn(
            "min-h-0 overflow-hidden transition-[width,opacity,border-color] duration-300 ease-out",
            compact
              ? mobileView === "detail"
                ? "flex w-full flex-col border-r border-white/10"
                : "hidden w-0"
              : showLeft
                ? "flex w-[min(100%,26rem)] shrink-0 flex-col border-r border-white/10 opacity-100"
                : "w-0 border-r-0 opacity-0",
          )}
        >
          {showLeft || (compact && mobileView === "detail") ? detailPane : null}
        </div>

        {/* Center: globe */}
        <div
          className={cn(
            "relative min-h-0",
            compact ? (mobileView === "globe" ? "flex-1" : "hidden") : "min-w-0 flex-1",
          )}
        >
          {globe}
        </div>

        {/* Right: slides in once the War Room is in view */}
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
      </div>
    </div>
  );
}

export type { WarRoomNavigateRequest };
