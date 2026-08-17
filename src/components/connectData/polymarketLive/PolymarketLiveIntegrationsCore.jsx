"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Layers,
  Radio,
  Sparkles,
  Users,
  Vote,
  Medal,
} from "lucide-react";

import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";
import { PolymarketLiveEventsFields } from "@/components/connectData/polymarketLive/PolymarketLiveEventsFields";
import { PolymarketLiveMarketsFields } from "@/components/connectData/polymarketLive/PolymarketLiveMarketsFields";
import { PolymarketLiveHoldersByMarketsFields } from "@/components/connectData/polymarketLive/PolymarketLiveHoldersByMarketsFields";
import { PolymarketLiveOpenInterestFields } from "@/components/connectData/polymarketLive/PolymarketLiveOpenInterestFields";
import { PolymarketLiveSamplingMarketsFields } from "@/components/connectData/polymarketLive/PolymarketLiveSamplingMarketsFields";
import { PolymarketLiveOrderbooksFields } from "@/components/connectData/polymarketLive/PolymarketLiveOrderbooksFields";
import { PolymarketLiveMarketPricesFields } from "@/components/connectData/polymarketLive/PolymarketLiveMarketPricesFields";
import { PolymarketLivePricesHistoryFields } from "@/components/connectData/polymarketLive/PolymarketLivePricesHistoryFields";
import { PolymarketLivePublicProfilesFields } from "@/components/connectData/polymarketLive/PolymarketLivePublicProfilesFields";
import { PolymarketLiveCurrentPositionsFields } from "@/components/connectData/polymarketLive/PolymarketLiveCurrentPositionsFields";
import { PolymarketLiveClosedPositionsFields } from "@/components/connectData/polymarketLive/PolymarketLiveClosedPositionsFields";
import { PolymarketLiveUserActivityFields } from "@/components/connectData/polymarketLive/PolymarketLiveUserActivityFields";
import { PolymarketLiveHolderPositionValueFields } from "@/components/connectData/polymarketLive/PolymarketLiveHolderPositionValueFields";
import { PolymarketLiveHolderTradesFields } from "@/components/connectData/polymarketLive/PolymarketLiveHolderTradesFields";
import { PolymarketLiveHolderTradedMarketsFields } from "@/components/connectData/polymarketLive/PolymarketLiveHolderTradedMarketsFields";
import { PolymarketLiveTraderLeaderboardFields } from "@/components/connectData/polymarketLive/PolymarketLiveTraderLeaderboardFields";
import { PolymarketLiveConnectionWizard } from "@/components/connectData/polymarketLive/PolymarketLiveConnectionWizard";
import { PolymarketLiveRealtimeDashboard } from "@/components/connectData/polymarketLive/PolymarketLiveRealtimeDashboard";
import {
  ColumnPicker,
} from "@/components/connectData/ConnectHomeIntegrationWorkflow";
import { ConnectQueryComposeRunBar } from "@/components/connectData/ConnectQueryComposeRunBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  POLYMARKET_LIVE_DEFAULT_ENDPOINT_CATEGORY,
  POLYMARKET_LIVE_ENDPOINT_CATEGORIES,
  getPolymarketLiveColumnsForEndpoint,
  getPolymarketLiveEndpointsForCategory,
} from "@/config/polymarketLiveConnect";
import {
  emptyPolymarketEventsComposeState,
  normalizePolymarketEventsComposeState,
  POLYMARKET_EVENTS_COMPOSE_DEFAULT_COLUMNS,
  POLYMARKET_EVENTS_COMPOSE_ENDPOINT_ID,
} from "@/lib/polymarketLive/eventsCompose";
import {
  emptyPolymarketMarketsByEventsComposeState,
  normalizePolymarketMarketsByEventsComposeState,
  POLYMARKET_MARKETS_BY_EVENTS_DEFAULT_COLUMNS,
  POLYMARKET_MARKETS_BY_EVENTS_ENDPOINT_ID,
} from "@/lib/polymarketLive/marketsByEventsCompose";
import {
  emptyPolymarketMarketsComposeState,
  normalizePolymarketMarketsComposeState,
  POLYMARKET_MARKETS_COMPOSE_DEFAULT_COLUMNS,
  POLYMARKET_MARKETS_COMPOSE_ENDPOINT_ID,
} from "@/lib/polymarketLive/marketsCompose";
import {
  emptyPolymarketHoldersByMarketsComposeState,
  normalizePolymarketHoldersByMarketsComposeState,
  POLYMARKET_HOLDERS_BY_MARKETS_DEFAULT_COLUMNS,
  POLYMARKET_HOLDERS_BY_MARKETS_ENDPOINT_ID,
} from "@/lib/polymarketLive/holdersByMarketsCompose";
import {
  emptyPolymarketOpenInterestComposeState,
  normalizePolymarketOpenInterestComposeState,
  POLYMARKET_OPEN_INTEREST_DEFAULT_COLUMNS,
  POLYMARKET_OPEN_INTEREST_COMPOSE_ENDPOINT_ID,
} from "@/lib/polymarketLive/openInterestCompose";
import {
  emptyPolymarketLiveEventVolumeComposeState,
  normalizePolymarketLiveEventVolumeComposeState,
  POLYMARKET_LIVE_EVENT_VOLUME_DEFAULT_COLUMNS,
  POLYMARKET_LIVE_EVENT_VOLUME_ENDPOINT_ID,
} from "@/lib/polymarketLive/liveEventVolumeCompose";
import {
  emptyPolymarketSamplingMarketsComposeState,
  normalizePolymarketSamplingMarketsComposeState,
  POLYMARKET_SAMPLING_MARKETS_DEFAULT_COLUMNS,
  POLYMARKET_SAMPLING_MARKETS_ENDPOINT_ID,
} from "@/lib/polymarketLive/samplingMarketsCompose";
import {
  emptyPolymarketOrderbooksComposeState,
  normalizePolymarketOrderbooksComposeState,
  POLYMARKET_ORDERBOOKS_DEFAULT_COLUMNS,
  POLYMARKET_ORDERBOOKS_ENDPOINT_ID,
} from "@/lib/polymarketLive/orderbooksCompose";
import {
  emptyPolymarketMarketPricesComposeState,
  normalizePolymarketMarketPricesComposeState,
  POLYMARKET_MARKET_PRICES_DEFAULT_COLUMNS,
  POLYMARKET_MARKET_PRICES_ENDPOINT_ID,
} from "@/lib/polymarketLive/marketPricesCompose";
import {
  emptyPolymarketMidpointPricesComposeState,
  normalizePolymarketMidpointPricesComposeState,
  POLYMARKET_MIDPOINT_PRICES_DEFAULT_COLUMNS,
  POLYMARKET_MIDPOINT_PRICES_ENDPOINT_ID,
} from "@/lib/polymarketLive/midpointPricesCompose";
import {
  emptyPolymarketSpreadsComposeState,
  normalizePolymarketSpreadsComposeState,
  POLYMARKET_SPREADS_DEFAULT_COLUMNS,
  POLYMARKET_SPREADS_ENDPOINT_ID,
} from "@/lib/polymarketLive/spreadsCompose";
import {
  emptyPolymarketLastTradePricesComposeState,
  normalizePolymarketLastTradePricesComposeState,
  POLYMARKET_LAST_TRADE_PRICES_DEFAULT_COLUMNS,
  POLYMARKET_LAST_TRADE_PRICES_ENDPOINT_ID,
} from "@/lib/polymarketLive/lastTradePricesCompose";
import {
  emptyPolymarketPricesHistoryComposeState,
  normalizePolymarketPricesHistoryComposeState,
  POLYMARKET_PRICES_HISTORY_DEFAULT_COLUMNS,
  POLYMARKET_PRICES_HISTORY_ENDPOINT_ID,
} from "@/lib/polymarketLive/pricesHistoryCompose";
import {
  emptyPolymarketPublicProfilesComposeState,
  normalizePolymarketPublicProfilesComposeState,
  POLYMARKET_PUBLIC_PROFILES_DEFAULT_COLUMNS,
  POLYMARKET_PUBLIC_PROFILES_ENDPOINT_ID,
} from "@/lib/polymarketLive/publicProfilesCompose";
import {
  emptyPolymarketCurrentPositionsComposeState,
  normalizePolymarketCurrentPositionsComposeState,
  POLYMARKET_CURRENT_POSITIONS_DEFAULT_COLUMNS,
  POLYMARKET_CURRENT_POSITIONS_ENDPOINT_ID,
} from "@/lib/polymarketLive/currentPositionsCompose";
import {
  emptyPolymarketClosedPositionsComposeState,
  normalizePolymarketClosedPositionsComposeState,
  POLYMARKET_CLOSED_POSITIONS_DEFAULT_COLUMNS,
  POLYMARKET_CLOSED_POSITIONS_ENDPOINT_ID,
} from "@/lib/polymarketLive/closedPositionsCompose";
import {
  emptyPolymarketUserActivityComposeState,
  normalizePolymarketUserActivityComposeState,
  POLYMARKET_USER_ACTIVITY_DEFAULT_COLUMNS,
  POLYMARKET_USER_ACTIVITY_ENDPOINT_ID,
} from "@/lib/polymarketLive/userActivityCompose";
import {
  emptyPolymarketHolderPositionValueComposeState,
  normalizePolymarketHolderPositionValueComposeState,
  POLYMARKET_HOLDER_POSITION_VALUE_DEFAULT_COLUMNS,
  POLYMARKET_HOLDER_POSITION_VALUE_ENDPOINT_ID,
} from "@/lib/polymarketLive/holderPositionValueCompose";
import {
  emptyPolymarketHolderTradesComposeState,
  normalizePolymarketHolderTradesComposeState,
  POLYMARKET_HOLDER_TRADES_DEFAULT_COLUMNS,
  POLYMARKET_HOLDER_TRADES_ENDPOINT_ID,
} from "@/lib/polymarketLive/holderTradesCompose";
import {
  emptyPolymarketHolderTradedMarketsComposeState,
  normalizePolymarketHolderTradedMarketsComposeState,
  POLYMARKET_HOLDER_TRADED_MARKETS_DEFAULT_COLUMNS,
  POLYMARKET_HOLDER_TRADED_MARKETS_ENDPOINT_ID,
} from "@/lib/polymarketLive/holderTradedMarketsCompose";
import {
  emptyPolymarketTraderLeaderboardComposeState,
  normalizePolymarketTraderLeaderboardComposeState,
  POLYMARKET_TRADER_LEADERBOARD_DEFAULT_COLUMNS,
  POLYMARKET_TRADER_LEADERBOARD_ENDPOINT_ID,
} from "@/lib/polymarketLive/traderLeaderboardCompose";
import { POLYMARKET_REALTIME_FEED_OPTIONS } from "@/lib/polymarketLive/polymarketRealtimeCompose";
import { fetchPolymarketRealtimeSeedRows } from "@/lib/polymarketLive/polymarketRealtimeSeed";
import {
  applyPolymarketMarketsByEventsSearchAll,
  applyPolymarketMarketsByEventsSearchSelection,
} from "@/lib/polymarketLive/polymarketMarketsByEventsPull";
import { applyPolymarketHoldersByMarketsSearchAll } from "@/lib/polymarketLive/polymarketHoldersByMarketsPull";
import { applyPolymarketOpenInterestSearchAll } from "@/lib/polymarketLive/polymarketOpenInterestPull";
import { applyPolymarketLiveEventVolumeSearchAll } from "@/lib/polymarketLive/polymarketLiveEventVolumePull";
import { applyPolymarketOrderbooksSearchAll } from "@/lib/polymarketLive/polymarketOrderbooksPull";
import { applyPolymarketMarketPricesSearchAll } from "@/lib/polymarketLive/polymarketMarketPricesPull";
import { applyPolymarketMidpointPricesSearchAll } from "@/lib/polymarketLive/polymarketMidpointPricesPull";
import { applyPolymarketSpreadsSearchAll } from "@/lib/polymarketLive/polymarketSpreadsPull";
import { applyPolymarketLastTradePricesSearchAll } from "@/lib/polymarketLive/polymarketLastTradePricesPull";
import { applyPolymarketPricesHistorySearchAll } from "@/lib/polymarketLive/polymarketPricesHistoryPull";
import {
  applyPolymarketLiveSearchAll,
  applyPolymarketLiveSearchSelection,
} from "@/lib/polymarketLivePowerSearchPull";
import { useDemoProGate } from "@/hooks/useDemoProGate";
import { cn } from "@/lib/utils";

const ENDPOINT_PRESENTATION = {
  [POLYMARKET_MARKETS_COMPOSE_ENDPOINT_ID]: { icon: Layers, accent: "secondary" },
  [POLYMARKET_MARKETS_BY_EVENTS_ENDPOINT_ID]: { icon: Layers, accent: "secondary" },
  [POLYMARKET_EVENTS_COMPOSE_ENDPOINT_ID]: { icon: Vote, accent: "secondary" },
  [POLYMARKET_LIVE_EVENT_VOLUME_ENDPOINT_ID]: { icon: Vote, accent: "secondary" },
  [POLYMARKET_SAMPLING_MARKETS_ENDPOINT_ID]: { icon: Layers, accent: "secondary" },
  [POLYMARKET_HOLDERS_BY_MARKETS_ENDPOINT_ID]: { icon: Users, accent: "secondary" },
  [POLYMARKET_PUBLIC_PROFILES_ENDPOINT_ID]: { icon: Users, accent: "secondary" },
  [POLYMARKET_CURRENT_POSITIONS_ENDPOINT_ID]: { icon: Users, accent: "secondary" },
  [POLYMARKET_CLOSED_POSITIONS_ENDPOINT_ID]: { icon: Users, accent: "secondary" },
  [POLYMARKET_USER_ACTIVITY_ENDPOINT_ID]: { icon: Users, accent: "secondary" },
  [POLYMARKET_HOLDER_POSITION_VALUE_ENDPOINT_ID]: { icon: Users, accent: "secondary" },
  [POLYMARKET_HOLDER_TRADES_ENDPOINT_ID]: { icon: Users, accent: "secondary" },
  [POLYMARKET_HOLDER_TRADED_MARKETS_ENDPOINT_ID]: { icon: Users, accent: "secondary" },
  [POLYMARKET_TRADER_LEADERBOARD_ENDPOINT_ID]: { icon: Medal, accent: "secondary" },
  [POLYMARKET_OPEN_INTEREST_COMPOSE_ENDPOINT_ID]: { icon: Layers, accent: "secondary" },
  [POLYMARKET_ORDERBOOKS_ENDPOINT_ID]: { icon: BookOpen, accent: "secondary" },
  [POLYMARKET_MARKET_PRICES_ENDPOINT_ID]: { icon: Layers, accent: "secondary" },
  [POLYMARKET_MIDPOINT_PRICES_ENDPOINT_ID]: { icon: Layers, accent: "secondary" },
  [POLYMARKET_SPREADS_ENDPOINT_ID]: { icon: Layers, accent: "secondary" },
  [POLYMARKET_LAST_TRADE_PRICES_ENDPOINT_ID]: { icon: Layers, accent: "secondary" },
  [POLYMARKET_PRICES_HISTORY_ENDPOINT_ID]: { icon: Layers, accent: "emerald" },
  listMarkets: { icon: Layers, accent: "secondary" },
  getMarket: { icon: Layers, accent: "secondary" },
  getMarketBySlug: { icon: Layers, accent: "secondary" },
  getMarketTags: { icon: Layers, accent: "secondary" },
  getOpenInterest: { icon: Layers, accent: "secondary" },
  getLiveVolume: { icon: Layers, accent: "secondary" },
  getPricesHistory: { icon: Layers, accent: "emerald" },
  getBatchPricesHistory: { icon: Layers, accent: "emerald" },
  listEvents: { icon: Vote, accent: "secondary" },
  getEvent: { icon: Vote, accent: "secondary" },
  getEventBySlug: { icon: Vote, accent: "secondary" },
  getEventTags: { icon: Vote, accent: "secondary" },
  listSeries: { icon: Sparkles, accent: "secondary" },
  getSeries: { icon: Sparkles, accent: "secondary" },
  getTopHolders: { icon: Users, accent: "secondary" },
  getTradesByMarket: { icon: Users, accent: "secondary" },
  getTradesByUser: { icon: Users, accent: "secondary" },
  wsPrice: { icon: Radio, accent: "emerald" },
  wsLastTradePrice: { icon: Radio, accent: "emerald" },
  wsOrderbookSnapshot: { icon: Radio, accent: "emerald" },
  wsTickSizeChange: { icon: Radio, accent: "emerald" },
  wsBestBidAsk: { icon: Radio, accent: "emerald" },
  wsNewMarket: { icon: Radio, accent: "emerald" },
  wsMarketResolved: { icon: Radio, accent: "emerald" },
};

function hubSourceCardClasses({ isSelected, accent }) {
  if (isSelected) {
    return accent === "emerald"
      ? "border-emerald-500/60 bg-emerald-500/5 ring-2 ring-emerald-500/20"
      : "border-secondary/60 bg-secondary/5 ring-2 ring-secondary/25";
  }
  return "border-border/60 bg-background hover:border-border hover:bg-muted/20";
}

function hubSourceIconClasses({ accent }) {
  return accent === "emerald"
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    : "bg-secondary/15 text-secondary dark:text-secondary";
}

function HubStartingPointColumn({
  icon: Icon,
  title,
  badge,
  description,
  children,
  id,
  headerBelow = null,
  className,
}) {
  return (
    <div
      id={id}
      className={cn(
        "relative flex h-full flex-col rounded-xl border border-border/70 bg-muted/15 scroll-mt-28 p-3",
        className,
      )}
    >
      <div className="mb-3 space-y-2 border-b border-border/50 pb-3">
        <div className="flex items-start gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary dark:text-secondary">
            <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            {badge ? (
              <span className="mb-1 inline-flex rounded-full border border-secondary/25 bg-secondary/10 px-2 py-0.5 text-[0.625rem] font-medium leading-tight text-secondary dark:text-secondary">
                {badge}
              </span>
            ) : null}
            <h3 className="text-xs font-semibold leading-snug text-foreground">{title}</h3>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{description}</p>
          </div>
        </div>
        {headerBelow}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2">{children}</div>
    </div>
  );
}

function HubEndpointCategoryTags({ categories, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Endpoint category">
      {categories.map((cat) => {
        const selected = value === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(cat.id)}
            className={cn(
              "inline-flex rounded-full border px-2 py-0.5 text-[0.625rem] font-medium leading-tight transition-colors",
              selected
                ? "border-secondary/25 bg-secondary/10 text-secondary dark:text-secondary"
                : "border-border/60 bg-background/80 text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

function LiveSourceOption({ endpoint, isSelected, onSelect }) {
  const presentation = ENDPOINT_PRESENTATION[endpoint.id] || {
    icon: Layers,
    accent: "secondary",
  };
  const Icon = presentation.icon;
  const { accent } = presentation;
  const underConstruction = !!endpoint.underConstruction;

  return (
    <button
      type="button"
      disabled={underConstruction}
      onClick={() => {
        if (underConstruction) return;
        onSelect(endpoint.id);
      }}
      className={cn(
        "group flex w-full items-center gap-2 rounded-lg border p-2.5 text-left transition-all duration-200 ease-out",
        underConstruction
          ? "cursor-not-allowed border-border/40 bg-muted/20 opacity-60"
          : cn("hover:translate-x-1.5", hubSourceCardClasses({ isSelected, accent })),
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          underConstruction
            ? "bg-muted/40 text-muted-foreground/70"
            : hubSourceIconClasses({ accent }),
        )}
      >
        <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "text-xs font-medium",
              underConstruction ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {endpoint.title}
          </span>
          {underConstruction ? (
            <span className="rounded border border-border/60 bg-muted/70 px-1 py-px text-[8px] font-medium uppercase tracking-wide text-muted-foreground">
              Soon
            </span>
          ) : null}
        </span>
        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
          {endpoint.description}
        </p>
      </div>
    </button>
  );
}

function LiveConnectionStartingOption({ onStart }) {
  return (
    <button
      type="button"
      onClick={onStart}
      className="group flex w-full items-center gap-2.5 rounded-lg bg-secondary px-3 py-2.5 text-left text-white shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Radio className="size-3.5" strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold">Start a new real-time connection</span>
        <span className="mt-0.5 block text-[10px] leading-snug text-white/80">
          Then pick exactly what you want a live Polymarket feed of.
        </span>
      </span>
      <ArrowRight
        className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  );
}

/**
 * Polymarket Live compose UI — Kalshi Live–style hub (category tags + endpoints),
 * then column picker for Connect home pulls.
 */
export function PolymarketLiveIntegrationsCore({ onRunPull, className, stepBackRef }) {
  const ctx = useMyStateV2() ?? {};
  const { workspaceWriteLocked, requestProUpgrade, dialog: demoProDialog } = useDemoProGate();
  const {
    connectApiEndpointId = "",
    setConnectApiEndpointId,
    connectApiColumnSelections = {},
    setConnectApiColumnSelections,
    connectPolymarketLiveEventsCompose,
    setConnectPolymarketLiveEventsCompose,
    connectPolymarketLiveMarketsByEventsCompose,
    setConnectPolymarketLiveMarketsByEventsCompose,
    connectPolymarketLiveMarketsCompose,
    setConnectPolymarketLiveMarketsCompose,
    connectPolymarketLiveHoldersByMarketsCompose,
    setConnectPolymarketLiveHoldersByMarketsCompose,
    connectPolymarketLiveOpenInterestCompose,
    setConnectPolymarketLiveOpenInterestCompose,
    connectPolymarketLiveEventVolumeCompose,
    setConnectPolymarketLiveEventVolumeCompose,
    setConnectPolymarketLiveSamplingMarketsCompose,
    connectPolymarketLiveOrderbooksCompose,
    setConnectPolymarketLiveOrderbooksCompose,
    connectPolymarketLiveMarketPricesCompose,
    setConnectPolymarketLiveMarketPricesCompose,
    connectPolymarketLiveMidpointPricesCompose,
    setConnectPolymarketLiveMidpointPricesCompose,
    connectPolymarketLiveSpreadsCompose,
    setConnectPolymarketLiveSpreadsCompose,
    connectPolymarketLiveLastTradePricesCompose,
    setConnectPolymarketLiveLastTradePricesCompose,
    connectPolymarketLivePricesHistoryCompose,
    setConnectPolymarketLivePricesHistoryCompose,
    setConnectPolymarketLivePublicProfilesCompose,
  } = ctx;
  const setConnectPolymarketLiveCurrentPositionsCompose =
    ctx.providerValue?.setConnectPolymarketLiveCurrentPositionsCompose;
  const setConnectPolymarketLiveClosedPositionsCompose =
    ctx.providerValue?.setConnectPolymarketLiveClosedPositionsCompose;
  const setConnectPolymarketLiveUserActivityCompose =
    ctx.providerValue?.setConnectPolymarketLiveUserActivityCompose;
  const setConnectPolymarketLiveHolderPositionValueCompose =
    ctx.providerValue?.setConnectPolymarketLiveHolderPositionValueCompose;
  const setConnectPolymarketLiveHolderTradesCompose =
    ctx.providerValue?.setConnectPolymarketLiveHolderTradesCompose;
  const setConnectPolymarketLiveHolderTradedMarketsCompose =
    ctx.providerValue?.setConnectPolymarketLiveHolderTradedMarketsCompose;
  const setConnectPolymarketLiveTraderLeaderboardCompose =
    ctx.providerValue?.setConnectPolymarketLiveTraderLeaderboardCompose;

  const runPolymarketLiveAction = useCallback(
    (action) => {
      if (workspaceWriteLocked) {
        requestProUpgrade("Polymarket Live", {
          title: "Upgrade to unlock",
          description:
            "Saving, data pulls, uploads, and integrations require an active paid plan (or lifetime access).",
        });
        return;
      }
      if (typeof action === "function") action();
    },
    [workspaceWriteLocked, requestProUpgrade],
  );

  const selectedId = String(connectApiEndpointId || "").trim();

  const [endpointCategory, setEndpointCategory] = useState(
    POLYMARKET_LIVE_DEFAULT_ENDPOINT_CATEGORY,
  );
  const [liveRealtimeMode, setLiveRealtimeMode] = useState("hub");
  const [liveRealtimeSession, setLiveRealtimeSession] = useState(null);
  const [liveRealtimeConnecting, setLiveRealtimeConnecting] = useState(false);

  const categoryEndpoints = useMemo(
    () => getPolymarketLiveEndpointsForCategory(endpointCategory),
    [endpointCategory],
  );
  const hubEndpointCategories = useMemo(
    () => POLYMARKET_LIVE_ENDPOINT_CATEGORIES.filter((category) => category.id !== "live"),
    [],
  );

  const selectedEndpointMeta = useMemo(() => {
    if (!selectedId) return null;
    const all = POLYMARKET_LIVE_ENDPOINT_CATEGORIES.flatMap((cat) =>
      getPolymarketLiveEndpointsForCategory(cat.id),
    );
    return all.find((e) => e.id === selectedId) || null;
  }, [selectedId]);

  const endpointColumns = useMemo(
    () => (selectedId ? getPolymarketLiveColumnsForEndpoint(selectedId) : []),
    [selectedId],
  );

  const selectedColumns = connectApiColumnSelections?.[selectedId] || [];

  const eventsCompose = useMemo(
    () =>
      normalizePolymarketEventsComposeState(
        connectPolymarketLiveEventsCompose || emptyPolymarketEventsComposeState(),
      ),
    [connectPolymarketLiveEventsCompose],
  );

  const marketsByEventsCompose = useMemo(
    () =>
      normalizePolymarketMarketsByEventsComposeState(
        connectPolymarketLiveMarketsByEventsCompose ||
          emptyPolymarketMarketsByEventsComposeState(),
      ),
    [connectPolymarketLiveMarketsByEventsCompose],
  );

  const marketsCompose = useMemo(
    () =>
      normalizePolymarketMarketsComposeState(
        connectPolymarketLiveMarketsCompose || emptyPolymarketMarketsComposeState(),
      ),
    [connectPolymarketLiveMarketsCompose],
  );

  const holdersByMarketsCompose = useMemo(
    () =>
      normalizePolymarketHoldersByMarketsComposeState(
        connectPolymarketLiveHoldersByMarketsCompose || emptyPolymarketHoldersByMarketsComposeState(),
      ),
    [connectPolymarketLiveHoldersByMarketsCompose],
  );

  const openInterestCompose = useMemo(
    () =>
      normalizePolymarketOpenInterestComposeState(
        connectPolymarketLiveOpenInterestCompose || emptyPolymarketOpenInterestComposeState(),
      ),
    [connectPolymarketLiveOpenInterestCompose],
  );

  const liveEventVolumeCompose = useMemo(
    () =>
      normalizePolymarketLiveEventVolumeComposeState(
        connectPolymarketLiveEventVolumeCompose || emptyPolymarketLiveEventVolumeComposeState(),
      ),
    [connectPolymarketLiveEventVolumeCompose],
  );

  const orderbooksCompose = useMemo(
    () =>
      normalizePolymarketOrderbooksComposeState(
        connectPolymarketLiveOrderbooksCompose || emptyPolymarketOrderbooksComposeState(),
      ),
    [connectPolymarketLiveOrderbooksCompose],
  );

  const marketPricesCompose = useMemo(
    () =>
      normalizePolymarketMarketPricesComposeState(
        connectPolymarketLiveMarketPricesCompose ||
          emptyPolymarketMarketPricesComposeState(),
      ),
    [connectPolymarketLiveMarketPricesCompose],
  );

  const midpointPricesCompose = useMemo(
    () =>
      normalizePolymarketMidpointPricesComposeState(
        connectPolymarketLiveMidpointPricesCompose ||
          emptyPolymarketMidpointPricesComposeState(),
      ),
    [connectPolymarketLiveMidpointPricesCompose],
  );

  const spreadsCompose = useMemo(
    () =>
      normalizePolymarketSpreadsComposeState(
        connectPolymarketLiveSpreadsCompose || emptyPolymarketSpreadsComposeState(),
      ),
    [connectPolymarketLiveSpreadsCompose],
  );

  const lastTradePricesCompose = useMemo(
    () =>
      normalizePolymarketLastTradePricesComposeState(
        connectPolymarketLiveLastTradePricesCompose ||
          emptyPolymarketLastTradePricesComposeState(),
      ),
    [connectPolymarketLiveLastTradePricesCompose],
  );

  const pricesHistoryCompose = useMemo(
    () =>
      normalizePolymarketPricesHistoryComposeState(
        connectPolymarketLivePricesHistoryCompose ||
          emptyPolymarketPricesHistoryComposeState(),
      ),
    [connectPolymarketLivePricesHistoryCompose],
  );

  const isEventsCompose = selectedId === POLYMARKET_EVENTS_COMPOSE_ENDPOINT_ID;
  const isMarketsByEventsCompose = selectedId === POLYMARKET_MARKETS_BY_EVENTS_ENDPOINT_ID;
  const isMarketsCompose = selectedId === POLYMARKET_MARKETS_COMPOSE_ENDPOINT_ID;
  const isHoldersByMarketsCompose = selectedId === POLYMARKET_HOLDERS_BY_MARKETS_ENDPOINT_ID;
  const isOpenInterestCompose = selectedId === POLYMARKET_OPEN_INTEREST_COMPOSE_ENDPOINT_ID;
  const isLiveEventVolumeCompose = selectedId === POLYMARKET_LIVE_EVENT_VOLUME_ENDPOINT_ID;
  const isSamplingMarketsCompose = selectedId === POLYMARKET_SAMPLING_MARKETS_ENDPOINT_ID;
  const isOrderbooksCompose = selectedId === POLYMARKET_ORDERBOOKS_ENDPOINT_ID;
  const isMarketPricesCompose = selectedId === POLYMARKET_MARKET_PRICES_ENDPOINT_ID;
  const isMidpointPricesCompose = selectedId === POLYMARKET_MIDPOINT_PRICES_ENDPOINT_ID;
  const isSpreadsCompose = selectedId === POLYMARKET_SPREADS_ENDPOINT_ID;
  const isLastTradePricesCompose = selectedId === POLYMARKET_LAST_TRADE_PRICES_ENDPOINT_ID;
  const isPricesHistoryCompose = selectedId === POLYMARKET_PRICES_HISTORY_ENDPOINT_ID;
  const isPublicProfilesCompose = selectedId === POLYMARKET_PUBLIC_PROFILES_ENDPOINT_ID;
  const isCurrentPositionsCompose = selectedId === POLYMARKET_CURRENT_POSITIONS_ENDPOINT_ID;
  const isClosedPositionsCompose = selectedId === POLYMARKET_CLOSED_POSITIONS_ENDPOINT_ID;
  const isUserActivityCompose = selectedId === POLYMARKET_USER_ACTIVITY_ENDPOINT_ID;
  const isHolderPositionValueCompose =
    selectedId === POLYMARKET_HOLDER_POSITION_VALUE_ENDPOINT_ID;
  const isHolderTradesCompose = selectedId === POLYMARKET_HOLDER_TRADES_ENDPOINT_ID;
  const isHolderTradedMarketsCompose =
    selectedId === POLYMARKET_HOLDER_TRADED_MARKETS_ENDPOINT_ID;
  const isTraderLeaderboardCompose =
    selectedId === POLYMARKET_TRADER_LEADERBOARD_ENDPOINT_ID;
  const isEventsStyleCompose = isEventsCompose || isMarketsByEventsCompose || isLiveEventVolumeCompose;
  const isComposeEndpoint =
    isEventsStyleCompose ||
    isMarketsCompose ||
    isHoldersByMarketsCompose ||
    isOpenInterestCompose ||
    isSamplingMarketsCompose ||
    isOrderbooksCompose ||
    isMarketPricesCompose ||
    isMidpointPricesCompose ||
    isSpreadsCompose ||
    isLastTradePricesCompose ||
    isPricesHistoryCompose ||
    isPublicProfilesCompose ||
    isCurrentPositionsCompose ||
    isClosedPositionsCompose ||
    isUserActivityCompose ||
    isHolderPositionValueCompose ||
    isHolderTradesCompose ||
    isHolderTradedMarketsCompose ||
    isTraderLeaderboardCompose;
  const showAdvancedPullUi =
    !isComposeEndpoint ||
    (isEventsCompose
      ? eventsCompose.mode === "advanced"
      : isMarketsByEventsCompose
        ? marketsByEventsCompose.mode === "advanced"
        : isLiveEventVolumeCompose
          ? liveEventVolumeCompose.mode === "advanced"
          : isMarketsCompose
            ? marketsCompose.mode === "advanced"
            : isHoldersByMarketsCompose
              ? holdersByMarketsCompose.mode === "advanced"
              : isOpenInterestCompose
                ? openInterestCompose.mode === "advanced"
                : isOrderbooksCompose
                  ? orderbooksCompose.mode === "advanced"
                  : isMarketPricesCompose
                    ? marketPricesCompose.mode === "advanced"
                    : isMidpointPricesCompose
                      ? midpointPricesCompose.mode === "advanced"
                      : isSpreadsCompose
                        ? spreadsCompose.mode === "advanced"
                        : isLastTradePricesCompose
                          ? lastTradePricesCompose.mode === "advanced"
                          : isPricesHistoryCompose
                            ? pricesHistoryCompose.mode === "advanced"
                  : true);

  const handleSelectEndpoint = useCallback(
    (id) => {
      setConnectApiEndpointId?.(id);
      const cols = getPolymarketLiveColumnsForEndpoint(id);
      const defaultCols =
        id === POLYMARKET_EVENTS_COMPOSE_ENDPOINT_ID
          ? POLYMARKET_EVENTS_COMPOSE_DEFAULT_COLUMNS.filter((name) =>
              cols.some((c) => c.name === name),
            )
          : id === POLYMARKET_MARKETS_BY_EVENTS_ENDPOINT_ID
            ? POLYMARKET_MARKETS_BY_EVENTS_DEFAULT_COLUMNS.filter((name) =>
                cols.some((c) => c.name === name),
              )
            : id === POLYMARKET_MARKETS_COMPOSE_ENDPOINT_ID
              ? POLYMARKET_MARKETS_COMPOSE_DEFAULT_COLUMNS.filter((name) =>
                  cols.some((c) => c.name === name),
                )
              : id === POLYMARKET_HOLDERS_BY_MARKETS_ENDPOINT_ID
                ? POLYMARKET_HOLDERS_BY_MARKETS_DEFAULT_COLUMNS.filter((name) =>
                    cols.some((c) => c.name === name),
                  )
                : id === POLYMARKET_OPEN_INTEREST_COMPOSE_ENDPOINT_ID
                  ? POLYMARKET_OPEN_INTEREST_DEFAULT_COLUMNS.filter((name) =>
                      cols.some((c) => c.name === name),
                    )
                  : id === POLYMARKET_LIVE_EVENT_VOLUME_ENDPOINT_ID
                    ? POLYMARKET_LIVE_EVENT_VOLUME_DEFAULT_COLUMNS.filter((name) =>
                        cols.some((c) => c.name === name),
                      )
                    : id === POLYMARKET_SAMPLING_MARKETS_ENDPOINT_ID
                      ? POLYMARKET_SAMPLING_MARKETS_DEFAULT_COLUMNS.filter((name) =>
                          cols.some((c) => c.name === name),
                        )
                      : id === POLYMARKET_ORDERBOOKS_ENDPOINT_ID
                        ? POLYMARKET_ORDERBOOKS_DEFAULT_COLUMNS.filter((name) =>
                            cols.some((c) => c.name === name),
                          )
                        : id === POLYMARKET_MARKET_PRICES_ENDPOINT_ID
                          ? POLYMARKET_MARKET_PRICES_DEFAULT_COLUMNS.filter((name) =>
                              cols.some((c) => c.name === name),
                            )
                          : id === POLYMARKET_MIDPOINT_PRICES_ENDPOINT_ID
                            ? POLYMARKET_MIDPOINT_PRICES_DEFAULT_COLUMNS.filter((name) =>
                                cols.some((c) => c.name === name),
                              )
                            : id === POLYMARKET_SPREADS_ENDPOINT_ID
                              ? POLYMARKET_SPREADS_DEFAULT_COLUMNS.filter((name) =>
                                  cols.some((c) => c.name === name),
                                )
                              : id === POLYMARKET_LAST_TRADE_PRICES_ENDPOINT_ID
                                ? POLYMARKET_LAST_TRADE_PRICES_DEFAULT_COLUMNS.filter((name) =>
                                    cols.some((c) => c.name === name),
                                  )
                                : id === POLYMARKET_PRICES_HISTORY_ENDPOINT_ID
                                  ? POLYMARKET_PRICES_HISTORY_DEFAULT_COLUMNS.filter((name) =>
                                      cols.some((c) => c.name === name),
                                    )
                                  : id === POLYMARKET_PUBLIC_PROFILES_ENDPOINT_ID
                                    ? POLYMARKET_PUBLIC_PROFILES_DEFAULT_COLUMNS.filter((name) =>
                                        cols.some((c) => c.name === name),
                                      )
                                    : id === POLYMARKET_CURRENT_POSITIONS_ENDPOINT_ID
                                      ? POLYMARKET_CURRENT_POSITIONS_DEFAULT_COLUMNS.filter((name) =>
                                          cols.some((c) => c.name === name),
                                        )
                                      : id === POLYMARKET_CLOSED_POSITIONS_ENDPOINT_ID
                                        ? POLYMARKET_CLOSED_POSITIONS_DEFAULT_COLUMNS.filter((name) =>
                                            cols.some((c) => c.name === name),
                                          )
                                        : id === POLYMARKET_USER_ACTIVITY_ENDPOINT_ID
                                          ? POLYMARKET_USER_ACTIVITY_DEFAULT_COLUMNS.filter((name) =>
                                              cols.some((c) => c.name === name),
                                            )
                                          : id === POLYMARKET_HOLDER_POSITION_VALUE_ENDPOINT_ID
                                            ? POLYMARKET_HOLDER_POSITION_VALUE_DEFAULT_COLUMNS.filter((name) =>
                                                cols.some((c) => c.name === name),
                                              )
                                            : id === POLYMARKET_HOLDER_TRADES_ENDPOINT_ID
                                              ? POLYMARKET_HOLDER_TRADES_DEFAULT_COLUMNS.filter((name) =>
                                                  cols.some((c) => c.name === name),
                                                )
                                              : id === POLYMARKET_HOLDER_TRADED_MARKETS_ENDPOINT_ID
                                                ? POLYMARKET_HOLDER_TRADED_MARKETS_DEFAULT_COLUMNS.filter((name) =>
                                                    cols.some((c) => c.name === name),
                                                  )
                                                : id === POLYMARKET_TRADER_LEADERBOARD_ENDPOINT_ID
                                                  ? POLYMARKET_TRADER_LEADERBOARD_DEFAULT_COLUMNS.filter((name) =>
                                                      cols.some((c) => c.name === name),
                                                    )
              : cols.map((c) => c.name);
      if (cols.length) {
        setConnectApiColumnSelections?.((prev) => ({
          ...(prev || {}),
          [id]: prev?.[id]?.length ? prev[id] : defaultCols.length ? defaultCols : cols.map((c) => c.name),
        }));
      }
      if (id === POLYMARKET_EVENTS_COMPOSE_ENDPOINT_ID) {
        setConnectPolymarketLiveEventsCompose?.((prev) =>
          prev ? normalizePolymarketEventsComposeState(prev) : emptyPolymarketEventsComposeState(),
        );
      }
      if (id === POLYMARKET_MARKETS_BY_EVENTS_ENDPOINT_ID) {
        setConnectPolymarketLiveMarketsByEventsCompose?.((prev) =>
          prev
            ? normalizePolymarketMarketsByEventsComposeState(prev)
            : emptyPolymarketMarketsByEventsComposeState(),
        );
      }
      if (id === POLYMARKET_MARKETS_COMPOSE_ENDPOINT_ID) {
        setConnectPolymarketLiveMarketsCompose?.((prev) =>
          prev
            ? normalizePolymarketMarketsComposeState(prev)
            : emptyPolymarketMarketsComposeState(),
        );
      }
      if (id === POLYMARKET_HOLDERS_BY_MARKETS_ENDPOINT_ID) {
        setConnectPolymarketLiveHoldersByMarketsCompose?.((prev) =>
          prev
            ? normalizePolymarketHoldersByMarketsComposeState(prev)
            : emptyPolymarketHoldersByMarketsComposeState(),
        );
      }
      if (id === POLYMARKET_OPEN_INTEREST_COMPOSE_ENDPOINT_ID) {
        setConnectPolymarketLiveOpenInterestCompose?.((prev) =>
          prev
            ? normalizePolymarketOpenInterestComposeState(prev)
            : emptyPolymarketOpenInterestComposeState(),
        );
      }
      if (id === POLYMARKET_LIVE_EVENT_VOLUME_ENDPOINT_ID) {
        setConnectPolymarketLiveEventVolumeCompose?.((prev) =>
          prev
            ? normalizePolymarketLiveEventVolumeComposeState(prev)
            : emptyPolymarketLiveEventVolumeComposeState(),
        );
      }
      if (id === POLYMARKET_SAMPLING_MARKETS_ENDPOINT_ID) {
        setConnectPolymarketLiveSamplingMarketsCompose?.((prev) =>
          prev
            ? normalizePolymarketSamplingMarketsComposeState(prev)
            : emptyPolymarketSamplingMarketsComposeState(),
        );
      }
      if (id === POLYMARKET_ORDERBOOKS_ENDPOINT_ID) {
        setConnectPolymarketLiveOrderbooksCompose?.((prev) =>
          prev
            ? normalizePolymarketOrderbooksComposeState(prev)
            : emptyPolymarketOrderbooksComposeState(),
        );
      }
      if (id === POLYMARKET_MARKET_PRICES_ENDPOINT_ID) {
        setConnectPolymarketLiveMarketPricesCompose?.((prev) =>
          prev
            ? normalizePolymarketMarketPricesComposeState(prev)
            : emptyPolymarketMarketPricesComposeState(),
        );
      }
      if (id === POLYMARKET_MIDPOINT_PRICES_ENDPOINT_ID) {
        setConnectPolymarketLiveMidpointPricesCompose?.((prev) =>
          prev
            ? normalizePolymarketMidpointPricesComposeState(prev)
            : emptyPolymarketMidpointPricesComposeState(),
        );
      }
      if (id === POLYMARKET_SPREADS_ENDPOINT_ID) {
        setConnectPolymarketLiveSpreadsCompose?.((prev) =>
          prev
            ? normalizePolymarketSpreadsComposeState(prev)
            : emptyPolymarketSpreadsComposeState(),
        );
      }
      if (id === POLYMARKET_LAST_TRADE_PRICES_ENDPOINT_ID) {
        setConnectPolymarketLiveLastTradePricesCompose?.((prev) =>
          prev
            ? normalizePolymarketLastTradePricesComposeState(prev)
            : emptyPolymarketLastTradePricesComposeState(),
        );
      }
      if (id === POLYMARKET_PRICES_HISTORY_ENDPOINT_ID) {
        setConnectPolymarketLivePricesHistoryCompose?.((prev) =>
          prev
            ? normalizePolymarketPricesHistoryComposeState(prev)
            : emptyPolymarketPricesHistoryComposeState(),
        );
      }
      if (id === POLYMARKET_PUBLIC_PROFILES_ENDPOINT_ID) {
        setConnectPolymarketLivePublicProfilesCompose?.((prev) =>
          prev
            ? normalizePolymarketPublicProfilesComposeState(prev)
            : emptyPolymarketPublicProfilesComposeState(),
        );
      }
      if (id === POLYMARKET_CURRENT_POSITIONS_ENDPOINT_ID) {
        setConnectPolymarketLiveCurrentPositionsCompose?.((prev) =>
          prev
            ? normalizePolymarketCurrentPositionsComposeState(prev)
            : emptyPolymarketCurrentPositionsComposeState(),
        );
      }
      if (id === POLYMARKET_CLOSED_POSITIONS_ENDPOINT_ID) {
        setConnectPolymarketLiveClosedPositionsCompose?.((prev) =>
          prev
            ? normalizePolymarketClosedPositionsComposeState(prev)
            : emptyPolymarketClosedPositionsComposeState(),
        );
      }
      if (id === POLYMARKET_USER_ACTIVITY_ENDPOINT_ID) {
        setConnectPolymarketLiveUserActivityCompose?.((prev) =>
          prev
            ? normalizePolymarketUserActivityComposeState(prev)
            : emptyPolymarketUserActivityComposeState(),
        );
      }
      if (id === POLYMARKET_HOLDER_POSITION_VALUE_ENDPOINT_ID) {
        setConnectPolymarketLiveHolderPositionValueCompose?.((prev) =>
          prev
            ? normalizePolymarketHolderPositionValueComposeState(prev)
            : emptyPolymarketHolderPositionValueComposeState(),
        );
      }
      if (id === POLYMARKET_HOLDER_TRADES_ENDPOINT_ID) {
        setConnectPolymarketLiveHolderTradesCompose?.((prev) =>
          prev
            ? normalizePolymarketHolderTradesComposeState(prev)
            : emptyPolymarketHolderTradesComposeState(),
        );
      }
      if (id === POLYMARKET_HOLDER_TRADED_MARKETS_ENDPOINT_ID) {
        setConnectPolymarketLiveHolderTradedMarketsCompose?.((prev) =>
          prev
            ? normalizePolymarketHolderTradedMarketsComposeState(prev)
            : emptyPolymarketHolderTradedMarketsComposeState(),
        );
      }
      if (id === POLYMARKET_TRADER_LEADERBOARD_ENDPOINT_ID) {
        setConnectPolymarketLiveTraderLeaderboardCompose?.((prev) =>
          prev
            ? normalizePolymarketTraderLeaderboardComposeState(prev)
            : emptyPolymarketTraderLeaderboardComposeState(),
        );
      }
    },
    [
      setConnectApiEndpointId,
      setConnectApiColumnSelections,
      setConnectPolymarketLiveEventsCompose,
      setConnectPolymarketLiveMarketsByEventsCompose,
      setConnectPolymarketLiveMarketsCompose,
      setConnectPolymarketLiveHoldersByMarketsCompose,
      setConnectPolymarketLiveOpenInterestCompose,
      setConnectPolymarketLiveEventVolumeCompose,
      setConnectPolymarketLiveSamplingMarketsCompose,
      setConnectPolymarketLiveOrderbooksCompose,
      setConnectPolymarketLiveMarketPricesCompose,
      setConnectPolymarketLiveMidpointPricesCompose,
      setConnectPolymarketLiveSpreadsCompose,
      setConnectPolymarketLiveLastTradePricesCompose,
      setConnectPolymarketLivePricesHistoryCompose,
      setConnectPolymarketLivePublicProfilesCompose,
      setConnectPolymarketLiveCurrentPositionsCompose,
      setConnectPolymarketLiveClosedPositionsCompose,
      setConnectPolymarketLiveUserActivityCompose,
      setConnectPolymarketLiveHolderPositionValueCompose,
      setConnectPolymarketLiveHolderTradesCompose,
      setConnectPolymarketLiveHolderTradedMarketsCompose,
      setConnectPolymarketLiveTraderLeaderboardCompose,
    ],
  );

  const handlePublicSearchSelect = useCallback(
    (suggestion) => {
      if (isMarketsByEventsCompose) {
        runPolymarketLiveAction(() =>
          applyPolymarketMarketsByEventsSearchSelection(ctx, suggestion, {
            sheetLayout: marketsByEventsCompose.sheetLayout,
            selectedColumns: selectedColumns,
          }),
        );
        return;
      }
      runPolymarketLiveAction(() => applyPolymarketLiveSearchSelection(ctx, suggestion));
    },
    [
      ctx,
      isMarketsByEventsCompose,
      marketsByEventsCompose.sheetLayout,
      runPolymarketLiveAction,
      selectedColumns,
    ],
  );

  const handlePublicSearchSubmitAll = useCallback(
    (suggestions) => {
      if (isMarketsByEventsCompose) {
        runPolymarketLiveAction(() =>
          applyPolymarketMarketsByEventsSearchAll(ctx, suggestions, {
            sheetLayout: marketsByEventsCompose.sheetLayout,
            selectedColumns: selectedColumns,
          }),
        );
        return;
      }
      if (isHoldersByMarketsCompose) {
        runPolymarketLiveAction(() => {
          void (async () => {
            ctx.setConnectDataLakePullState?.((prev) => ({
              ...prev,
              loading: true,
              error: null,
              label: "Pulling holders…",
              progress: Math.max(Number(prev.progress) || 0, 8),
            }));
            try {
              await applyPolymarketHoldersByMarketsSearchAll(ctx, suggestions, {
                compose: holdersByMarketsCompose,
                selectedColumns,
              });
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: null,
                label: "",
                progress: 100,
              }));
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Request failed";
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: msg,
                label: "",
                progress: 0,
              }));
            }
          })();
        });
        return;
      }
      if (isOpenInterestCompose) {
        runPolymarketLiveAction(() => {
          void (async () => {
            ctx.setConnectDataLakePullState?.((prev) => ({
              ...prev,
              loading: true,
              error: null,
              label: "Pulling open interest…",
              progress: Math.max(Number(prev.progress) || 0, 8),
            }));
            try {
              await applyPolymarketOpenInterestSearchAll(ctx, suggestions, {
                compose: openInterestCompose,
                selectedColumns,
              });
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: null,
                label: "",
                progress: 100,
              }));
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Request failed";
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: msg,
                label: "",
                progress: 0,
              }));
            }
          })();
        });
        return;
      }
      if (isLiveEventVolumeCompose) {
        runPolymarketLiveAction(() => {
          void (async () => {
            ctx.setConnectDataLakePullState?.((prev) => ({
              ...prev,
              loading: true,
              error: null,
              label: "Pulling live volume…",
              progress: Math.max(Number(prev.progress) || 0, 8),
            }));
            try {
              await applyPolymarketLiveEventVolumeSearchAll(ctx, suggestions, {
                compose: liveEventVolumeCompose,
                selectedColumns,
              });
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: null,
                label: "",
                progress: 100,
              }));
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Request failed";
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: msg,
                label: "",
                progress: 0,
              }));
            }
          })();
        });
        return;
      }
      if (isOrderbooksCompose) {
        runPolymarketLiveAction(() => {
          void (async () => {
            ctx.setConnectDataLakePullState?.((prev) => ({
              ...prev,
              loading: true,
              error: null,
              label: "Pulling orderbooks…",
              progress: Math.max(Number(prev.progress) || 0, 8),
            }));
            try {
              await applyPolymarketOrderbooksSearchAll(ctx, suggestions, {
                compose: orderbooksCompose,
                selectedColumns,
              });
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: null,
                label: "",
                progress: 100,
              }));
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Request failed";
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: msg,
                label: "",
                progress: 0,
              }));
            }
          })();
        });
        return;
      }
      if (isMarketPricesCompose) {
        runPolymarketLiveAction(() => {
          void (async () => {
            ctx.setConnectDataLakePullState?.((prev) => ({
              ...prev,
              loading: true,
              error: null,
              label: "Pulling market prices…",
              progress: Math.max(Number(prev.progress) || 0, 8),
            }));
            try {
              await applyPolymarketMarketPricesSearchAll(ctx, suggestions, {
                compose: marketPricesCompose,
                selectedColumns,
              });
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: null,
                label: "",
                progress: 100,
              }));
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Request failed";
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: msg,
                label: "",
                progress: 0,
              }));
            }
          })();
        });
        return;
      }
      if (isMidpointPricesCompose) {
        runPolymarketLiveAction(() => {
          void (async () => {
            ctx.setConnectDataLakePullState?.((prev) => ({
              ...prev,
              loading: true,
              error: null,
              label: "Pulling midpoint prices…",
              progress: Math.max(Number(prev.progress) || 0, 8),
            }));
            try {
              await applyPolymarketMidpointPricesSearchAll(ctx, suggestions, {
                compose: midpointPricesCompose,
                selectedColumns,
              });
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: null,
                label: "",
                progress: 100,
              }));
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Request failed";
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: msg,
                label: "",
                progress: 0,
              }));
            }
          })();
        });
        return;
      }
      if (isSpreadsCompose) {
        runPolymarketLiveAction(() => {
          void (async () => {
            ctx.setConnectDataLakePullState?.((prev) => ({
              ...prev,
              loading: true,
              error: null,
              label: "Pulling spreads…",
              progress: Math.max(Number(prev.progress) || 0, 8),
            }));
            try {
              await applyPolymarketSpreadsSearchAll(ctx, suggestions, {
                compose: spreadsCompose,
                selectedColumns,
              });
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: null,
                label: "",
                progress: 100,
              }));
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Request failed";
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: msg,
                label: "",
                progress: 0,
              }));
            }
          })();
        });
        return;
      }
      if (isLastTradePricesCompose) {
        runPolymarketLiveAction(() => {
          void (async () => {
            ctx.setConnectDataLakePullState?.((prev) => ({
              ...prev,
              loading: true,
              error: null,
              label: "Pulling last trade prices…",
              progress: Math.max(Number(prev.progress) || 0, 8),
            }));
            try {
              await applyPolymarketLastTradePricesSearchAll(ctx, suggestions, {
                compose: lastTradePricesCompose,
                selectedColumns,
              });
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: null,
                label: "",
                progress: 100,
              }));
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Request failed";
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: msg,
                label: "",
                progress: 0,
              }));
            }
          })();
        });
        return;
      }
      if (isPricesHistoryCompose) {
        runPolymarketLiveAction(() => {
          void (async () => {
            ctx.setConnectDataLakePullState?.((prev) => ({
              ...prev,
              loading: true,
              error: null,
              label: "Pulling price history…",
              progress: Math.max(Number(prev.progress) || 0, 8),
            }));
            try {
              await applyPolymarketPricesHistorySearchAll(ctx, suggestions, {
                compose: pricesHistoryCompose,
                selectedColumns,
              });
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: null,
                label: "",
                progress: 100,
              }));
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Request failed";
              ctx.setConnectDataLakePullState?.((prev) => ({
                ...prev,
                loading: false,
                error: msg,
                label: "",
                progress: 0,
              }));
            }
          })();
        });
        return;
      }
      runPolymarketLiveAction(() => applyPolymarketLiveSearchAll(ctx, suggestions));
    },
    [
      ctx,
      holdersByMarketsCompose,
      isHoldersByMarketsCompose,
      isLiveEventVolumeCompose,
      isMarketsByEventsCompose,
      isOpenInterestCompose,
      isOrderbooksCompose,
      isMarketPricesCompose,
      isMidpointPricesCompose,
      isSpreadsCompose,
      isLastTradePricesCompose,
      isPricesHistoryCompose,
      liveEventVolumeCompose,
      marketPricesCompose,
      midpointPricesCompose,
      spreadsCompose,
      lastTradePricesCompose,
      pricesHistoryCompose,
      marketsByEventsCompose.sheetLayout,
      openInterestCompose,
      orderbooksCompose,
      runPolymarketLiveAction,
      selectedColumns,
    ],
  );

  const patchColumns = useCallback(
    (sourceId, updater) => {
      setConnectApiColumnSelections?.((prev) => {
        const current = prev?.[sourceId] || [];
        const next = updater(current);
        if (next === current) return prev ?? {};
        return { ...(prev || {}), [sourceId]: next };
      });
    },
    [setConnectApiColumnSelections],
  );

  useEffect(() => {
    if (!stepBackRef) return;
    stepBackRef.current = () => {
      if (liveRealtimeMode === "wizard") {
        setLiveRealtimeMode(liveRealtimeSession ? "dashboard" : "hub");
        return true;
      }
      if (liveRealtimeMode === "dashboard") {
        setLiveRealtimeMode("hub");
        return true;
      }
      if (selectedId) {
        setConnectApiEndpointId?.("");
        return true;
      }
      return false;
    };
    return () => {
      if (stepBackRef) stepBackRef.current = null;
    };
  }, [
    liveRealtimeMode,
    liveRealtimeSession,
    stepBackRef,
    selectedId,
    setConnectApiEndpointId,
  ]);

  const displayLabel = useCallback((col) => col.name, []);
  const stopRealtimeSession = useCallback(
    (session = liveRealtimeSession) => {
      for (const sheetId of Object.values(session?.sheetsByFeed || {})) {
        ctx.liveStreamActions?.stop?.(sheetId);
      }
    },
    [ctx.liveStreamActions, liveRealtimeSession],
  );
  const connectRealtimeSession = useCallback(
    async (config) => {
      if (!ctx.addNewSheetAndActivate || !ctx.liveStreamActions?.start) return;
      setLiveRealtimeConnecting(true);
      try {
        stopRealtimeSession();
        const seed = await fetchPolymarketRealtimeSeedRows(config);
        const sheetsByFeed = {};
        const labelByFeed = Object.fromEntries(
          POLYMARKET_REALTIME_FEED_OPTIONS.map((option) => [option.id, option.label]),
        );
        for (const feedType of config.feedTypes) {
          const seedRows = seed.rowsByFeed[feedType] || [];
          ctx.addNewSheetAndActivate(
            (sheetId) => {
              sheetsByFeed[feedType] = sheetId;
              ctx.setDataSheets?.((previous) => ({
                ...(previous || {}),
                [sheetId]: {
                  ...(previous?.[sheetId] || { data: [] }),
                  data: seedRows,
                  name: `Live · ${labelByFeed[feedType] || feedType}`,
                  provenance: {
                    integration: "polymarket-live",
                    endpointId: feedType,
                    realtime: true,
                    seededFromRest: seedRows.length > 0,
                    seedErrors: seed.errors,
                    assetIds: config.assetIds,
                    markets: config.markets.map((market) => ({
                      id: market.id,
                      conditionId: market.conditionId,
                      slug: market.slug,
                      title: market.title,
                      selectedOutcomes: market.selectedOutcomes,
                      selectedTokenIds: market.selectedTokenIds,
                    })),
                  },
                },
              }));
              ctx.liveStreamActions.start(sheetId, "polymarket", {
                assetIds: config.assetIds,
                eventType: feedType,
                preserveExistingRows: true,
              });
            },
            { syncActivate: true },
          );
        }
        setLiveRealtimeSession({
          ...config,
          sheetsByFeed,
          seedErrors: seed.errors,
          seededRowCount: Object.values(seed.rowsByFeed).reduce(
            (sum, rows) => sum + rows.length,
            0,
          ),
        });
        setLiveRealtimeMode("dashboard");
      } finally {
        setLiveRealtimeConnecting(false);
      }
    },
    [ctx, stopRealtimeSession],
  );
  const openRealtimeEditor = useCallback(() => {
    const firstSheetId = Object.values(liveRealtimeSession?.sheetsByFeed || {})[0];
    if (firstSheetId) ctx.setActiveSheetId?.(firstSheetId);
    ctx.setConnectHomeAnalyzeActive?.(true);
    ctx.setConnectHomeCenterView?.("sheet");
    ctx.setRightPanelOpen?.(true);
    ctx.setRightPanelTab?.("charts");
    ctx.requestConnectAnalyzeScroll?.();
  }, [ctx, liveRealtimeSession]);

  if (liveRealtimeMode === "wizard") {
    return (
      <div className={cn("relative z-20 w-full font-sans", className)}>
        <PolymarketLiveConnectionWizard
          initialMarkets={liveRealtimeSession?.markets || []}
          connecting={liveRealtimeConnecting}
          onBack={() => setLiveRealtimeMode(liveRealtimeSession ? "dashboard" : "hub")}
          onConnect={connectRealtimeSession}
        />
      </div>
    );
  }

  if (liveRealtimeMode === "dashboard" && liveRealtimeSession) {
    return (
      <div className={cn("relative z-20 w-full font-sans", className)}>
        <PolymarketLiveRealtimeDashboard
          session={liveRealtimeSession}
          onSubscribeMore={() => setLiveRealtimeMode("wizard")}
          onOpenEditor={openRealtimeEditor}
          onStop={() => {
            stopRealtimeSession();
            setLiveRealtimeSession(null);
            setLiveRealtimeMode("hub");
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative z-20 w-full font-sans space-y-6", className)}>
      {!selectedId ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              What do you want to do with Polymarket live data?
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Start from a live endpoint, or search markets, events, and profiles with Polymarket&apos;s
              public search.
            </p>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2">
            <HubStartingPointColumn
              icon={Layers}
              title="Live Data Straight from Polymarket"
              badge="The Latest Data"
              description="Choose what you want to track, then narrow it to the exact markets, fields, and filters you need."
              headerBelow={
                <HubEndpointCategoryTags
                  categories={hubEndpointCategories}
                  value={endpointCategory}
                  onChange={setEndpointCategory}
                />
              }
            >
              {categoryEndpoints.length > 0 ? (
                <div className="space-y-1.5">
                  {categoryEndpoints.map((endpoint) => (
                    <LiveSourceOption
                      key={endpoint.id}
                      endpoint={endpoint}
                      isSelected={selectedId === endpoint.id}
                      onSelect={handleSelectEndpoint}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  No endpoints in this category yet.
                </p>
              )}
            </HubStartingPointColumn>

            <div className="flex min-h-[16rem] min-w-0 flex-col gap-3 sm:min-h-0">
              <HubStartingPointColumn
                icon={Sparkles}
                title="Natural Language Search"
                description="Search anything — markets, events, profiles, and tags — powered by Polymarket public search."
                className="h-auto shrink-0"
              >
                <PolymarketLiveSearch
                  onSelect={handlePublicSearchSelect}
                  onSubmitAll={handlePublicSearchSubmitAll}
                />
              </HubStartingPointColumn>

              <HubStartingPointColumn
                icon={Radio}
                title="Real-time"
                description="Get real-time data on live markets, Lychee instantly plots your markets on a dashboard, you can customize however you like."
                className="h-auto min-h-0 flex-1"
              >
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                  <LiveConnectionStartingOption onStart={() => setLiveRealtimeMode("wizard")} />

                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      What you can get from Lychee&apos;s Real-time Polymarket integration
                    </p>
                    <ul className="space-y-1.5">
                      {POLYMARKET_REALTIME_FEED_OPTIONS.map((option) => (
                        <li key={option.id} className="flex gap-1.5">
                          <Check
                            className="mt-0.5 size-3 shrink-0 text-emerald-600 dark:text-emerald-400"
                            strokeWidth={2.5}
                            aria-hidden
                          />
                          <p className="text-[10px] leading-snug text-muted-foreground">
                            <span className="font-medium text-foreground">{option.label}</span>
                            {" — "}
                            {option.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1.5 border-t border-border/50 pt-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Coming soon
                    </p>
                    <ul className="space-y-1">
                      {["Monitor new market creation", "Monitor market resolutions"].map((label) => (
                        <li
                          key={label}
                          className="flex items-center gap-1.5 text-[10px] leading-snug text-muted-foreground"
                        >
                          <span
                            className="size-1 shrink-0 rounded-full bg-muted-foreground/50"
                            aria-hidden
                          />
                          {label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </HubStartingPointColumn>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="min-w-0">
            <Label className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
              Source
            </Label>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              {selectedEndpointMeta?.title || selectedId}
            </p>
            {selectedEndpointMeta?.description ? (
              <p className="mt-1.5 max-w-xl text-[11px] leading-snug text-muted-foreground">
                {selectedEndpointMeta.description}
              </p>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-auto px-0 py-0 text-[11px] font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => setConnectApiEndpointId?.("")}
            >
              Change endpoint
            </Button>
          </div>

          {isEventsStyleCompose ? (
            <PolymarketLiveEventsFields
              className="mt-2"
              variant={
                isLiveEventVolumeCompose
                  ? "liveEventVolume"
                  : isMarketsByEventsCompose
                    ? "marketsByEvents"
                    : "events"
              }
              onSearchSelect={handlePublicSearchSelect}
              onSearchSubmitAll={handlePublicSearchSubmitAll}
            />
          ) : null}

          {isMarketsCompose ? (
            <PolymarketLiveMarketsFields
              className="mt-2"
              onSearchSelect={handlePublicSearchSelect}
              onSearchSubmitAll={handlePublicSearchSubmitAll}
            />
          ) : null}

          {isHoldersByMarketsCompose ? (
            <PolymarketLiveHoldersByMarketsFields
              className="mt-2"
              onSearchSubmitAll={handlePublicSearchSubmitAll}
            />
          ) : null}

          {isPublicProfilesCompose ? (
            <PolymarketLivePublicProfilesFields className="mt-2" />
          ) : null}

          {isCurrentPositionsCompose ? (
            <PolymarketLiveCurrentPositionsFields className="mt-2" />
          ) : null}

          {isClosedPositionsCompose ? (
            <PolymarketLiveClosedPositionsFields className="mt-2" />
          ) : null}

          {isUserActivityCompose ? (
            <PolymarketLiveUserActivityFields className="mt-2" />
          ) : null}

          {isHolderPositionValueCompose ? (
            <PolymarketLiveHolderPositionValueFields className="mt-2" />
          ) : null}

          {isHolderTradesCompose ? (
            <PolymarketLiveHolderTradesFields className="mt-2" />
          ) : null}

          {isHolderTradedMarketsCompose ? (
            <PolymarketLiveHolderTradedMarketsFields className="mt-2" />
          ) : null}

          {isTraderLeaderboardCompose ? (
            <PolymarketLiveTraderLeaderboardFields className="mt-2" />
          ) : null}

          {isOpenInterestCompose ? (
            <PolymarketLiveOpenInterestFields
              className="mt-2"
              onSearchSubmitAll={handlePublicSearchSubmitAll}
            />
          ) : null}

          {isSamplingMarketsCompose ? (
            <PolymarketLiveSamplingMarketsFields className="mt-2" />
          ) : null}

          {isOrderbooksCompose ? (
            <PolymarketLiveOrderbooksFields
              className="mt-2"
              onSearchSubmitAll={handlePublicSearchSubmitAll}
            />
          ) : null}

          {isMarketPricesCompose ? (
            <PolymarketLiveMarketPricesFields
              className="mt-2"
              onSearchSubmitAll={handlePublicSearchSubmitAll}
            />
          ) : null}

          {isMidpointPricesCompose ? (
            <PolymarketLiveMarketPricesFields
              className="mt-2"
              variant="midpointPrice"
              onSearchSubmitAll={handlePublicSearchSubmitAll}
            />
          ) : null}

          {isSpreadsCompose ? (
            <PolymarketLiveMarketPricesFields
              className="mt-2"
              variant="spreads"
              onSearchSubmitAll={handlePublicSearchSubmitAll}
            />
          ) : null}

          {isLastTradePricesCompose ? (
            <PolymarketLiveMarketPricesFields
              className="mt-2"
              variant="lastTradePrices"
              onSearchSubmitAll={handlePublicSearchSubmitAll}
            />
          ) : null}

          {isPricesHistoryCompose ? (
            <PolymarketLivePricesHistoryFields
              className="mt-2"
              onSearchSubmitAll={handlePublicSearchSubmitAll}
            />
          ) : null}

          {showAdvancedPullUi ? (
            <ColumnPicker
              key={`polymarket-live:${selectedId}`}
              sourceId={selectedId}
              sourceName={selectedEndpointMeta?.title || selectedId}
              columns={endpointColumns}
              getDisplayLabel={displayLabel}
              lake={null}
              table={null}
              enableComposeFormats={false}
              selectedColumns={selectedColumns}
              onSelectColumn={(col) =>
                patchColumns(selectedId, (cur) => (cur.includes(col) ? cur : [...cur, col]))
              }
              onDeselectColumn={(col) =>
                patchColumns(selectedId, (cur) => cur.filter((c) => c !== col))
              }
              onSelectAll={() => patchColumns(selectedId, () => endpointColumns.map((c) => c.name))}
              onDeselectAll={() => patchColumns(selectedId, () => [])}
              showComposeOperations={false}
            >
              <ConnectQueryComposeRunBar
                selectedCount={selectedColumns.length}
                onRun={onRunPull}
                runLabel="Run pull"
              />
            </ColumnPicker>
          ) : null}
        </div>
      )}
      {demoProDialog}
    </div>
  );
}
