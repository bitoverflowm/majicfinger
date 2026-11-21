"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { useCompactScreen } from "@/lib/desktopOnly";
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
 * Shared War Room: left globe, right compact dual pane (markets by volume / live activity).
 * Used by both `/war-room` and the homepage explore tab — no demo vs live split.
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
  const [mobileView, setMobileView] = useState<"globe" | "panel">("globe");
  const [activityId, setActivityId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const [detail, setDetail] = useState<WarRoomDetailTarget | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  const market = controlledMarket ?? localMarket;

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
    fixture,
    mobile: compact,
  });

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
        if (compact) setMobileView("globe");
      }
      setDetail({ kind: "market", market: row });
      setDetailOpen(true);
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
          if (compact) setMobileView("globe");
        }
        setDetail({ kind: "news", activity: row, relatedMarkets: related });
        setDetailOpen(true);
        return;
      }

      // Trade → same market card surface, zoomed to the trade ping.
      if (row.marketId) setMarket(row.marketId);
      const coords = row.geometry?.coordinates || (row.marketId ? coordsForMarket(row.marketId) : null);
      if (coords) {
        setFocusTarget(deepFocus(coords, `trade:${row.id}:${Date.now()}`));
        if (compact) setMobileView("globe");
      }
      setDetail({
        kind: "trade",
        activity: row,
        market: row.marketId ? marketById.get(row.marketId) || null : null,
      });
      setDetailOpen(true);
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

  const globe = (
    <GlobeStage
      enhance={embedded ? "auto" : compact ? "never" : "always"}
      features={features}
      pings={pings}
      selectedMarketId={selectedId}
      focusTarget={focusTarget}
      onAnchorChange={setAnchor}
      keepGlobe={embedded}
      interactive
      onSelect={openMarketDetail}
      onTapPoster={compact && !embedded ? () => setMobileView("globe") : undefined}
      className="h-full w-full"
    />
  );

  const panel = (
    <aside className="flex h-full min-h-0 w-full flex-col bg-[#07090f] text-slate-100">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-2.5 py-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Markets</p>
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

  return (
    <div
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
            {compact ? (
              <div className="flex rounded-full border border-white/10 p-0.5">
                <button
                  type="button"
                  className={cn("rounded-full px-2 py-0.5", mobileView === "globe" && "bg-white text-slate-950")}
                  onClick={() => setMobileView("globe")}
                >
                  Globe
                </button>
                <button
                  type="button"
                  className={cn("rounded-full px-2 py-0.5", mobileView === "panel" && "bg-white text-slate-950")}
                  onClick={() => setMobileView("panel")}
                >
                  Feed
                </button>
              </div>
            ) : null}
          </div>
        </header>
      ) : compact ? (
        <div className="absolute right-3 top-3 z-20 flex rounded-full border border-white/10 bg-black/70 p-0.5 text-[11px] backdrop-blur">
          <button
            type="button"
            className={cn(
              "rounded-full px-2 py-0.5",
              mobileView === "globe" ? "bg-white text-slate-950" : "text-slate-300",
            )}
            onClick={() => setMobileView("globe")}
          >
            Globe
          </button>
          <button
            type="button"
            className={cn(
              "rounded-full px-2 py-0.5",
              mobileView === "panel" ? "bg-white text-slate-950" : "text-slate-300",
            )}
            onClick={() => setMobileView("panel")}
          >
            Feed
          </button>
        </div>
      ) : null}

      <div className={cn("relative flex min-h-0 flex-1", embedded && "overflow-hidden")}>
        <div
          className={cn(
            "relative min-h-0",
            compact ? (mobileView === "globe" ? "flex-1" : "hidden") : "min-w-0 flex-1",
          )}
        >
          {globe}
          <WarRoomDetailCard
            open={detailOpen}
            target={detail}
            anchor={anchor}
            onOpenChange={(next) => {
              setDetailOpen(next);
              if (!next) setAnchor(null);
            }}
            onNavigate={handleNavigate}
            onSelectRelatedMarket={(row) => {
              if (marketById.has(row.id)) {
                openMarketDetail(row.id);
                return;
              }
              // Pulse-only cousin — stay on the pin, open that market card with pulse quotes.
              setMarket(row.id);
              setDetail({ kind: "market", market: row });
              setDetailOpen(true);
            }}
          />
        </div>
        <div
          className={cn(
            "min-h-0 border-l border-white/10",
            compact
              ? mobileView === "panel"
                ? "flex w-full flex-col"
                : "hidden"
              : "flex w-[min(100%,22rem)] shrink-0 flex-col",
          )}
        >
          {panel}
        </div>
      </div>
    </div>
  );
}

export type { WarRoomNavigateRequest };
