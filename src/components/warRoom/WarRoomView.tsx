"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCompactScreen } from "@/lib/desktopOnly";
import { CATEGORIES, EXPLORE_FEEDS, EXPLORE_TOP_FEEDS } from "@/lib/markets/exploreCategories";
import { cn } from "@/lib/utils";

import { ActivityPane, type ActivityRow } from "./ActivityPane";
import { GlobeStage } from "./GlobeStage";
import { MarketsPane, type MarketRow } from "./MarketsPane";
import {
  WarRoomDetailCard,
  type WarRoomDetailTarget,
  type WarRoomNavigateRequest,
} from "./WarRoomDetailCard";
import { relatedMarketsForHeadline } from "./relatedMarkets";
import { useWarRoomData } from "./useWarRoomData";

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
  const compact = compactScreen !== false;
  const [localMarket, setLocalMarket] = useState("");
  const [mobileView, setMobileView] = useState<"globe" | "feed" | "detail">("globe");
  const [activityId, setActivityId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const [detail, setDetail] = useState<WarRoomDetailTarget | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [feedRevealed, setFeedRevealed] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [exploreFeedId, setExploreFeedId] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

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

  const { snapshot, error, transport } = useWarRoomData({
    desk: "all",
    market,
    category: categoryId,
    exploreFeed: exploreFeedId,
    fixture,
    mobile: compact,
  });

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
      setExploreFeedId(next === "tradable" ? "" : next);
      setCategoryId("");
      clearSelectionChrome();
    },
    [clearSelectionChrome],
  );

  const pickCategory = useCallback(
    (next: string) => {
      // Match Holder Explore: category chips clear feed rankings.
      setCategoryId(next);
      setExploreFeedId("");
      clearSelectionChrome();
    },
    [clearSelectionChrome],
  );

  const features = (snapshot?.features as { type: "FeatureCollection"; features: never[] }) || {
    type: "FeatureCollection",
    features: [],
  };
  const pings = (snapshot?.pings as { type: "FeatureCollection"; features: never[] }) || {
    type: "FeatureCollection",
    features: [],
  };
  const markets = (snapshot?.feed || []) as MarketRow[];
  const activity = (snapshot?.activity || []) as ActivityRow[];
  const selectedId = snapshot?.selectedMarketId || market || null;

  const marketById = useMemo(() => {
    const map = new Map<string, MarketRow>();
    for (const row of markets) map.set(row.id, row);
    return map;
  }, [markets]);

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
      const label = EXPLORE_TOP_FEEDS.has(item.id) ? "Top markets by" : "";
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
                  const selected = exploreFeedId
                    ? exploreFeedId === feed.id
                    : !categoryId && feed.id === "tradable";
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
              const selected = exploreFeedId
                ? exploreFeedId === feed.id
                : !categoryId && feed.id === "tradable";
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
        role="tablist"
        aria-label="Categories"
        className="flex max-w-full items-center gap-1 overflow-x-auto border-t border-white/10 pt-1"
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
    </div>
  );

  const globe = (
    <div className="relative h-full w-full">
      {categoryBar}
      <GlobeStage
        enhance={embedded ? "auto" : compact ? "never" : "always"}
        features={features}
        pings={pings}
        selectedMarketId={selectedId}
        focusTarget={focusTarget}
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
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Top Markets by Volume
        </p>
        <span className="text-[10px] text-slate-500">{statusLabel}</span>
      </div>
      {error ? <p className="px-2.5 py-1 text-[11px] text-rose-300">{error}</p> : null}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-b border-white/10">
          <MarketsPane
            rows={markets}
            selectedId={selectedId}
            onSelect={openMarketDetail}
            emptyReason={snapshot?.emptyReason}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-2.5 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Trades · News
            </p>
            <span className="text-[10px] text-slate-500">{activity.length}</span>
          </div>
          <ActivityPane rows={activity} selectedId={activityId} onSelect={selectActivity} />
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
