"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CandlestickChart,
  CloudSun,
  BookOpen,
  Hash,
  Layers,
  LineChart,
  List,
  RefreshCw,
  Search,
  Sparkles,
  Vote,
  Wand2,
  CircleDollarSign,
  X,
} from "lucide-react";

import { KalshiLivePowerToolsSearch } from "@/components/connectData/KalshiLivePowerToolsSearch";
import { KalshiLiveEmbeddingSearch } from "@/components/connectData/KalshiLiveEmbeddingSearch";
import { ConnectDataOperationsSection } from "@/components/connectData/ConnectDataOperationsSection";
import {
  ColumnPicker,
} from "@/components/connectData/ConnectHomeIntegrationWorkflow";
import { KalshiLiveCandlestickTickersField } from "@/components/connectData/kalshiLive/KalshiLiveCandlestickTickersField";
import { KalshiLiveCandlestickHistoricalCutoffNote } from "@/components/connectData/kalshiLive/KalshiLiveCandlestickHistoricalCutoffNote";
import { KalshiLiveTradesTickerField } from "@/components/connectData/kalshiLive/KalshiLiveTradesTickerField";
import { KalshiLiveOrderbookTickerField } from "@/components/connectData/kalshiLive/KalshiLiveOrderbookTickerField";
import { KalshiLiveComposeOperationPanel } from "@/components/connectData/kalshiLive/KalshiLiveComposeOperationPanel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  KALSHI_LIVE_CONNECT_CONFIG,
  KALSHI_LIVE_UNDER_CONSTRUCTION_ENDPOINT_IDS,
  getKalshiLiveComposeOperationIds,
} from "@/config/kalshiLiveConnect";
import { CONNECT_COMPOSE_OPERATIONS } from "@/lib/connectComposeOperations";
import {
  applyKalshiLivePowerSearchSelection,
  applyKalshiLiveSeriesPowerSearchSelection,
  applyKalshiLiveEmbeddingSearchSelection,
  applyKalshiLiveEmbeddingSearchAll,
} from "@/lib/kalshiLivePowerSearchPull";
import { useDemoProGate } from "@/hooks/useDemoProGate";
import { cn } from "@/lib/utils";

const LIVE_SOURCE_PRESENTATION = {
  markets: {
    icon: Layers,
    accent: "secondary",
  },
  series: {
    icon: RefreshCw,
    accent: "emerald",
  },
  seriesList: {
    icon: List,
    accent: "secondary",
  },
  candlesticks: {
    icon: CandlestickChart,
    accent: "emerald",
  },
  trades: {
    icon: LineChart,
    accent: "secondary",
  },
  orderbook: {
    icon: BookOpen,
    accent: "emerald",
  },
};

const LIVE_MARKET_SEARCH_EXAMPLES = [
  { label: "NYC high temp", icon: CloudSun, iconClass: "text-sky-600 dark:text-sky-400" },
  { label: "Presidential Election 2024", icon: Vote, iconClass: "text-secondary dark:text-secondary" },
  { label: "KXLLM1", icon: Hash, iconClass: "text-muted-foreground" },
  { label: "Fed rate", icon: CircleDollarSign, iconClass: "text-emerald-700 dark:text-emerald-400" },
];

/** Placeholder guided workflows — not launchable yet. */
const KALSHI_LIVE_COMING_SOON_WORKFLOWS = [
  {
    id: "live-market-snapshot",
    title: "Live market snapshot",
    description: "Pull current prices and status for markets matching a category or ticker.",
    icon: Layers,
  },
  {
    id: "recent-trades-for-market",
    title: "Recent trades for a market",
    description: "Load the latest completed trades for one market ticker with optional time filters.",
    icon: LineChart,
  },
  {
    id: "candlestick-ohlc",
    title: "Candlestick OHLC for a market",
    description: "Fetch price candles for one or more tickers over a chosen interval.",
    icon: CandlestickChart,
  },
  {
    id: "series-browse",
    title: "Browse series by category",
    description: "Explore recurring event templates filtered by category or tags.",
    icon: List,
  },
];

function hubEmbedDensity() {
  return {
    stack: "space-y-6",
    sectionStack: "space-y-4",
    gridGap: "gap-3",
    heading: "text-base",
    subheading: "text-xs",
    label: "text-[11px]",
    example: "text-[11px]",
    exampleIcon: "size-3",
    listGap: "space-y-1.5",
  };
}

function hubSourceCardClasses({ isSelected, accent }) {
  if (isSelected) {
    return accent === "emerald"
      ? "border-emerald-500/60 bg-emerald-500/5 ring-2 ring-emerald-500/20"
      : "border-secondary/60 bg-secondary/5 ring-2 ring-secondary/25";
  }
  return "border-border/60 bg-background hover:border-border hover:bg-muted/20";
}

function hubSourceRadioClasses({ isSelected, accent }) {
  if (!isSelected) return "border-muted-foreground/35 bg-background";
  return accent === "emerald"
    ? "border-emerald-500 bg-background"
    : "border-secondary bg-background";
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
  headerAction = null,
  className,
}) {
  return (
    <div
      id={id}
      className={cn(
        "relative flex h-full flex-col rounded-xl border border-border/70 bg-muted/15 scroll-mt-28 p-3",
        "transition-[box-shadow,ring-color] duration-300",
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
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2">{children}</div>
    </div>
  );
}

function LiveSourceOption({ endpoint, isSelected, onSelect, onHover, onLeave }) {
  const presentation = LIVE_SOURCE_PRESENTATION[endpoint.id] || {
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
      onMouseEnter={() => {
        if (underConstruction) return;
        onHover(endpoint.id);
      }}
      onMouseLeave={onLeave}
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
            <span className="inline-flex rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[0.625rem] font-medium leading-tight text-muted-foreground">
              Under construction
            </span>
          ) : null}
        </span>
        <p
          className={cn(
            "mt-0.5 text-[11px] leading-snug",
            underConstruction ? "text-muted-foreground/80" : "text-muted-foreground",
          )}
        >
          {endpoint.description}
        </p>
      </div>
      {underConstruction ? null : (
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            hubSourceRadioClasses({ isSelected, accent }),
          )}
          aria-hidden
        >
          {isSelected ? (
            <span
              className={cn(
                "size-2 rounded-full",
                accent === "emerald" ? "bg-emerald-500" : "bg-secondary",
              )}
            />
          ) : null}
        </span>
      )}
    </button>
  );
}

function ComingSoonWorkflowOption({ workflow }) {
  const Icon = workflow.icon || Wand2;
  return (
    <button
      type="button"
      disabled
      className="flex w-full cursor-not-allowed items-center gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5 text-left opacity-60"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground/70">
        <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{workflow.title}</span>
          <span className="inline-flex rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[0.625rem] font-medium leading-tight text-muted-foreground">
            Coming soon
          </span>
        </span>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/80">{workflow.description}</p>
      </div>
    </button>
  );
}

function ColumnDefinitionsPanel({ columns, getDisplayLabel, title, className }) {
  if (!columns?.length) return null;
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border border-border/70 bg-muted/15 p-3",
        className,
      )}
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {title ?? `Column definitions (${columns.length})`}
      </p>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {columns.map((col) => (
          <li key={col.name} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-medium text-foreground">{getDisplayLabel(col)}</span>
              <span className="text-xs text-muted-foreground">{col.type}</span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{col.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Kalshi Live compose UI — same starting layout as Kalshi Historical
 * (browse sources | search | guided workflows), then column picker + refine ops.
 */
export function KalshiLiveIntegrationsCore({ onRunPull, className }) {
  const ctx = useMyStateV2() ?? {};
  const { workspaceWriteLocked, requestProUpgrade, dialog: demoProDialog } = useDemoProGate();
  const density = hubEmbedDensity();

  const runKalshiLiveAction = useCallback(
    (action) => {
      if (workspaceWriteLocked) {
        requestProUpgrade("Kalshi Live", {
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

  const {
    connectKalshiLiveEndpointId = "",
    setConnectKalshiLiveEndpointId,
    connectKalshiLiveColumnSelections = {},
    setConnectKalshiLiveColumnSelections,
    setConnectKalshiLiveWhereFilters,
    setConnectKalshiLiveSortClauses,
    connectKalshiLiveCandlestickTickers = "",
    setConnectKalshiLiveCandlestickTickers,
    connectKalshiLiveTradesTicker = "",
    setConnectKalshiLiveTradesTicker,
    connectKalshiLiveOrderbookTicker = "",
    setConnectKalshiLiveOrderbookTicker,
    setConnectActiveComposeOps,
    kalshiLivePingState = "idle",
    pingKalshiLiveExchange,
    connectDataLakePullState,
  } = ctx;

  const [hoveredEndpointId, setHoveredEndpointId] = useState("");
  const [filterError, setFilterError] = useState(null);
  const [marketSearchInitial, setMarketSearchInitial] = useState("");
  const [marketSearchKey, setMarketSearchKey] = useState(0);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [startingGridHeight, setStartingGridHeight] = useState(null);
  const clearHoverTimeoutRef = useRef(null);
  const startingGridRef = useRef(null);

  const endpoints = KALSHI_LIVE_CONNECT_CONFIG.endpoints;
  const selectedId = connectKalshiLiveEndpointId;
  const selectedColumns = connectKalshiLiveColumnSelections[selectedId] || [];
  const pullLoading = !!connectDataLakePullState?.loading;

  const composeOperations = useMemo(() => {
    const allowed = new Set(getKalshiLiveComposeOperationIds(selectedId));
    return CONNECT_COMPOSE_OPERATIONS.filter((o) => allowed.has(o.id));
  }, [selectedId]);

  const hoveredSourceLabel = useMemo(() => {
    if (!hoveredEndpointId) return "";
    return endpoints.find((ep) => ep.id === hoveredEndpointId)?.title ?? "";
  }, [endpoints, hoveredEndpointId]);

  const hoverPreviewColumns = hoveredEndpointId
    ? KALSHI_LIVE_CONNECT_CONFIG.getColumnsForEndpoint(hoveredEndpointId)
    : [];

  useEffect(() => {
    if (kalshiLivePingState !== "idle") return;
    pingKalshiLiveExchange?.();
  }, [kalshiLivePingState, pingKalshiLiveExchange]);

  useEffect(() => {
    return () => {
      if (clearHoverTimeoutRef.current) clearTimeout(clearHoverTimeoutRef.current);
    };
  }, []);

  const handleSourceHover = useCallback((id) => {
    if (KALSHI_LIVE_UNDER_CONSTRUCTION_ENDPOINT_IDS.has(id)) return;
    if (clearHoverTimeoutRef.current) {
      clearTimeout(clearHoverTimeoutRef.current);
      clearHoverTimeoutRef.current = null;
    }
    setHoveredEndpointId(id);
  }, []);

  const handleSourceLeave = useCallback(() => {
    clearHoverTimeoutRef.current = setTimeout(() => {
      setHoveredEndpointId("");
    }, 120);
  }, []);

  const handlePreviewHover = useCallback(() => {
    if (clearHoverTimeoutRef.current) {
      clearTimeout(clearHoverTimeoutRef.current);
      clearHoverTimeoutRef.current = null;
    }
  }, []);

  const handlePreviewLeave = useCallback(() => {
    setHoveredEndpointId("");
  }, []);

  const expandSearch = useCallback(() => {
    if (clearHoverTimeoutRef.current) {
      clearTimeout(clearHoverTimeoutRef.current);
      clearHoverTimeoutRef.current = null;
    }
    const height = startingGridRef.current?.getBoundingClientRect().height;
    if (Number.isFinite(height) && height > 0) setStartingGridHeight(height);
    setHoveredEndpointId("");
    setSearchExpanded(true);
  }, []);

  const collapseSearch = useCallback(() => {
    setSearchExpanded(false);
  }, []);

  const handleSelectEndpoint = useCallback(
    (id) => {
      if (KALSHI_LIVE_UNDER_CONSTRUCTION_ENDPOINT_IDS.has(id)) return;
      setSearchExpanded(false);
      setConnectKalshiLiveEndpointId?.(id);
      setConnectActiveComposeOps?.([]);
      setConnectKalshiLiveWhereFilters?.([]);
      setConnectKalshiLiveSortClauses?.([]);
      if (id !== "candlesticks") setConnectKalshiLiveCandlestickTickers?.("");
      if (id !== "trades") setConnectKalshiLiveTradesTicker?.("");
      if (id !== "orderbook") setConnectKalshiLiveOrderbookTicker?.("");
      setFilterError(null);
      setHoveredEndpointId("");
      if (kalshiLivePingState === "idle") pingKalshiLiveExchange?.();
    },
    [
      setConnectKalshiLiveEndpointId,
      setConnectActiveComposeOps,
      setConnectKalshiLiveWhereFilters,
      setConnectKalshiLiveSortClauses,
      setConnectKalshiLiveCandlestickTickers,
      setConnectKalshiLiveTradesTicker,
      setConnectKalshiLiveOrderbookTicker,
      kalshiLivePingState,
      pingKalshiLiveExchange,
    ],
  );

  const handleClearEndpoint = useCallback(() => {
    setConnectKalshiLiveEndpointId?.("");
    setConnectActiveComposeOps?.([]);
    setConnectKalshiLiveWhereFilters?.([]);
    setConnectKalshiLiveSortClauses?.([]);
    setConnectKalshiLiveCandlestickTickers?.("");
    setConnectKalshiLiveTradesTicker?.("");
    setConnectKalshiLiveOrderbookTicker?.("");
    setSearchExpanded(false);
    setFilterError(null);
  }, [
    setConnectKalshiLiveEndpointId,
    setConnectActiveComposeOps,
    setConnectKalshiLiveWhereFilters,
    setConnectKalshiLiveSortClauses,
    setConnectKalshiLiveCandlestickTickers,
    setConnectKalshiLiveTradesTicker,
    setConnectKalshiLiveOrderbookTicker,
  ]);

  useEffect(() => {
    if (!selectedId || !KALSHI_LIVE_UNDER_CONSTRUCTION_ENDPOINT_IDS.has(selectedId)) return;
    handleClearEndpoint();
  }, [selectedId, handleClearEndpoint]);

  const patchColumns = useCallback(
    (sampleId, updater) => {
      setConnectKalshiLiveColumnSelections?.((prev) => {
        const current = prev?.[sampleId] || [];
        const next = updater(current);
        if (next === current) return prev ?? {};
        return { ...(prev || {}), [sampleId]: next };
      });
    },
    [setConnectKalshiLiveColumnSelections],
  );

  const handlePowerSearchMarket = useCallback(
    (suggestion) => {
      runKalshiLiveAction(() => applyKalshiLivePowerSearchSelection(ctx, suggestion));
    },
    [ctx, runKalshiLiveAction],
  );

  const handlePowerSearchSeries = useCallback(
    (suggestion) => {
      runKalshiLiveAction(() => applyKalshiLiveSeriesPowerSearchSelection(ctx, suggestion));
    },
    [ctx, runKalshiLiveAction],
  );

  const handleEmbeddingSearchSelect = useCallback(
    (suggestion) => {
      runKalshiLiveAction(() => applyKalshiLiveEmbeddingSearchSelection(ctx, suggestion));
    },
    [ctx, runKalshiLiveAction],
  );

  const handleEmbeddingSearchSubmitAll = useCallback(
    (suggestions) => {
      runKalshiLiveAction(() => applyKalshiLiveEmbeddingSearchAll(ctx, suggestions));
    },
    [ctx, runKalshiLiveAction],
  );

  const getDisplayLabel = useCallback(
    (col) => KALSHI_LIVE_CONNECT_CONFIG.getColumnDisplayLabel(selectedId, col),
    [selectedId],
  );

  return (
    <div className={cn("relative z-20 w-full font-sans", density.stack, className)}>
      {!selectedId ? (
        <div className={density.sectionStack}>
          <div className="space-y-1">
            <h3 className={cn("font-semibold tracking-tight text-foreground", density.heading)}>
              What do you want to do with Kalshi live data?
            </h3>
            <p className={cn("leading-relaxed text-muted-foreground", density.subheading)}>
              Start from a live endpoint, search with natural language or by ticker, or launch a
              guided workflow built for real-time prediction market monitoring.
            </p>
          </div>

          <motion.div
            ref={startingGridRef}
            layout
            transition={{ layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
            style={{
              minHeight:
                searchExpanded && startingGridHeight ? `${startingGridHeight}px` : undefined,
            }}
            className={cn(
              "grid grid-cols-1 items-stretch sm:grid-cols-3",
              density.gridGap,
            )}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {!searchExpanded ? (
                <motion.div
                  key="live-endpoints"
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="min-w-0"
                >
                  <HubStartingPointColumn
                    icon={Layers}
                    title="Live Data Straight from Kalshi"
                    badge="The Latest Data"
                    description="Choose what you want to track, then narrow it to the exact markets, fields, and time range you need."
                  >
                    <p className={cn("font-medium text-muted-foreground", density.label)}>
                      Choose a data source
                    </p>
                    <div className={density.listGap}>
                      {endpoints.map((endpoint) => (
                        <LiveSourceOption
                          key={endpoint.id}
                          endpoint={endpoint}
                          isSelected={selectedId === endpoint.id}
                          onSelect={handleSelectEndpoint}
                          onHover={handleSourceHover}
                          onLeave={handleSourceLeave}
                        />
                      ))}
                    </div>
                  </HubStartingPointColumn>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.div
              layout
              transition={{ layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
              className={cn(
                "relative min-h-[16rem] min-w-0 sm:min-h-0",
                searchExpanded
                  ? "h-full overflow-visible sm:col-span-3"
                  : "overflow-hidden sm:col-span-2",
              )}
            >
              <motion.div
                layout
                transition={{ layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
                className={cn(
                  "grid h-full grid-cols-1 transition-all duration-500 ease-out sm:grid-cols-2",
                  density.gridGap,
                  !searchExpanded && hoveredEndpointId
                    ? "pointer-events-none translate-x-6 opacity-0"
                    : "translate-x-0 opacity-100",
                )}
                aria-hidden={!searchExpanded && !!hoveredEndpointId}
              >
                <motion.div
                  layout
                  transition={{ layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
                  className={cn(
                    "relative flex min-w-0 flex-col",
                    density.gridGap,
                    searchExpanded && "h-full sm:col-span-2",
                  )}
                >
                  <HubStartingPointColumn
                    icon={Sparkles}
                    title="Natural Language Search"
                    description="Search anything you want and we will return all matching series, markets, etc. Hit enter on your search to pull all matches into your data sheet view. Or select a specific search recommendation to view that specific result."
                    className="h-auto shrink-0"
                    headerAction={
                      <AnimatePresence initial={false}>
                        {searchExpanded ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                              onClick={collapseSearch}
                              aria-label="Close search and show all options"
                            >
                              <X className="size-3.5" aria-hidden />
                            </Button>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    }
                  >
                    <KalshiLiveEmbeddingSearch
                      onFocus={expandSearch}
                      onSelect={handleEmbeddingSearchSelect}
                      onSubmitAll={handleEmbeddingSearchSubmitAll}
                      disabled={pullLoading}
                    />
                  </HubStartingPointColumn>

                  <HubStartingPointColumn
                    icon={Search}
                    title="Search for a specific market, series, or trade"
                    description="For best results search by ticker, but general search is also possible."
                    className="h-auto min-h-0 flex-1"
                  >
                    <p className={cn("font-medium text-muted-foreground", density.label)}>Search</p>
                    <KalshiLivePowerToolsSearch
                      key={marketSearchKey}
                      variant="embedded"
                      initialQuery={marketSearchInitial}
                      autoFocus={!!marketSearchInitial}
                      onFocus={expandSearch}
                      onSelectMarket={handlePowerSearchMarket}
                      onSelectSeries={handlePowerSearchSeries}
                      disabled={pullLoading}
                      inputClassName="h-9 rounded-lg pl-9 pr-12 text-xs"
                    />
                    <div className={density.listGap}>
                      <p className={cn("font-medium text-muted-foreground", density.label)}>
                        Examples
                      </p>
                      <ul
                        className={cn(
                          "space-y-1",
                          searchExpanded && "sm:grid sm:grid-cols-2 sm:gap-x-4 sm:space-y-0",
                        )}
                      >
                        {LIVE_MARKET_SEARCH_EXAMPLES.map((example) => {
                          const ExampleIcon = example.icon;
                          return (
                            <li key={example.label}>
                              <button
                                type="button"
                                onClick={() => {
                                  expandSearch();
                                  setMarketSearchInitial(example.label);
                                  setMarketSearchKey((key) => key + 1);
                                }}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-md px-1 py-1 text-left leading-snug text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground",
                                  density.example,
                                )}
                              >
                                <ExampleIcon
                                  className={cn("shrink-0", density.exampleIcon, example.iconClass)}
                                  aria-hidden
                                />
                                {example.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </HubStartingPointColumn>
                </motion.div>

                <AnimatePresence initial={false} mode="popLayout">
                  {!searchExpanded ? (
                    <motion.div
                      key="guided-workflows"
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="min-w-0"
                    >
                      <HubStartingPointColumn
                        id="kalshi-live-guided-workflows"
                        icon={Wand2}
                        title="Use a guided workflow"
                        badge="Best for guided setup"
                        description="Follow a step-by-step guided walkthrough for common Kalshi live data tasks."
                      >
                        <div className={density.listGap}>
                          {KALSHI_LIVE_COMING_SOON_WORKFLOWS.map((workflow) => (
                            <ComingSoonWorkflowOption key={workflow.id} workflow={workflow} />
                          ))}
                        </div>
                      </HubStartingPointColumn>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>

              {!searchExpanded ? (
                <div
                  className={cn(
                    "absolute inset-0 transition-all duration-500 ease-out",
                    hoveredEndpointId
                      ? "translate-x-0 opacity-100"
                      : "pointer-events-none translate-x-8 opacity-0",
                  )}
                  onMouseEnter={handlePreviewHover}
                  onMouseLeave={handlePreviewLeave}
                  aria-hidden={!hoveredEndpointId}
                >
                  {hoveredEndpointId ? (
                    <ColumnDefinitionsPanel
                      columns={hoverPreviewColumns}
                      getDisplayLabel={(col) =>
                        KALSHI_LIVE_CONNECT_CONFIG.getColumnDisplayLabel(hoveredEndpointId, col)
                      }
                      title={`${hoveredSourceLabel} columns (${hoverPreviewColumns.length})`}
                      className="h-full"
                    />
                  ) : null}
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <Label className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                Source
              </Label>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                {(() => {
                  const ep = endpoints.find((e) => e.id === selectedId);
                  return ep?.selectedTitle ?? ep?.title ?? selectedId;
                })()}
              </p>
              {selectedId === "candlesticks" ? (
                <KalshiLiveCandlestickHistoricalCutoffNote className="mt-1.5 max-w-xl" />
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[0.6875rem]"
              onClick={handleClearEndpoint}
            >
              Cancel
            </Button>
          </div>

          <AnimatePresence>
            {selectedId === "candlesticks" ? (
              <KalshiLiveCandlestickTickersField
                className="mt-4"
                value={connectKalshiLiveCandlestickTickers}
                onChange={(v) => setConnectKalshiLiveCandlestickTickers?.(v)}
                disabled={pullLoading}
              />
            ) : null}
            {selectedId === "trades" ? (
              <KalshiLiveTradesTickerField
                className="mt-4"
                value={connectKalshiLiveTradesTicker}
                onChange={(v) => setConnectKalshiLiveTradesTicker?.(v)}
                disabled={pullLoading}
              />
            ) : null}
            {selectedId === "orderbook" ? (
              <KalshiLiveOrderbookTickerField
                className="mt-4"
                value={connectKalshiLiveOrderbookTicker}
                onChange={(v) => setConnectKalshiLiveOrderbookTicker?.(v)}
                disabled={pullLoading}
              />
            ) : null}
            <ColumnPicker
              key={selectedId}
              sourceId={selectedId}
              columns={KALSHI_LIVE_CONNECT_CONFIG.getColumnsForEndpoint(selectedId)}
              getDisplayLabel={getDisplayLabel}
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
              onSelectAll={() =>
                patchColumns(selectedId, () =>
                  KALSHI_LIVE_CONNECT_CONFIG.getColumnsForEndpoint(selectedId).map((c) => c.name),
                )
              }
              onDeselectAll={() => patchColumns(selectedId, () => [])}
              showComposeOperations={false}
            >
              <ConnectDataOperationsSection
                selectedCount={selectedColumns.length}
                operations={composeOperations}
              />
              <KalshiLiveComposeOperationPanel
                endpointId={selectedId}
                onRunPull={() => runKalshiLiveAction(() => onRunPull?.())}
                filterError={filterError}
                setFilterError={setFilterError}
              />
            </ColumnPicker>
          </AnimatePresence>
        </div>
      )}
      {demoProDialog}
    </div>
  );
}
