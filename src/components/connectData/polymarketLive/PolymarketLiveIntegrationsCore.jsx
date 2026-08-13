"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Layers,
  Radio,
  Search,
  Sparkles,
  Users,
  Vote,
  Dices,
  Medal,
} from "lucide-react";

import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";
import { PolymarketLiveEventsFields } from "@/components/connectData/polymarketLive/PolymarketLiveEventsFields";
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
  applyPolymarketLiveSearchAll,
  applyPolymarketLiveSearchSelection,
} from "@/lib/polymarketLivePowerSearchPull";
import { useDemoProGate } from "@/hooks/useDemoProGate";
import { cn } from "@/lib/utils";

const ENDPOINT_PRESENTATION = {
  [POLYMARKET_EVENTS_COMPOSE_ENDPOINT_ID]: { icon: Vote, accent: "secondary" },
  listMarkets: { icon: Layers, accent: "secondary" },
  getMarket: { icon: Layers, accent: "secondary" },
  getMarketBySlug: { icon: Layers, accent: "secondary" },
  getMarketTags: { icon: Layers, accent: "secondary" },
  getOpenInterest: { icon: Layers, accent: "secondary" },
  getLiveVolume: { icon: Layers, accent: "secondary" },
  getPricesHistory: { icon: Layers, accent: "emerald" },
  listEvents: { icon: Vote, accent: "secondary" },
  getEvent: { icon: Vote, accent: "secondary" },
  getEventBySlug: { icon: Vote, accent: "secondary" },
  getEventTags: { icon: Vote, accent: "secondary" },
  listSeries: { icon: Sparkles, accent: "secondary" },
  getSeries: { icon: Sparkles, accent: "secondary" },
  getTopHolders: { icon: Users, accent: "secondary" },
  getTradesByMarket: { icon: Users, accent: "secondary" },
  getTradesByUser: { icon: Users, accent: "secondary" },
  builderLeaderboard: { icon: Building2, accent: "secondary" },
  builderVolume: { icon: Building2, accent: "secondary" },
  sportsMetadata: { icon: Medal, accent: "secondary" },
  sportsMarketTypes: { icon: Medal, accent: "secondary" },
  listTeams: { icon: Medal, accent: "secondary" },
  getComboMarkets: { icon: Dices, accent: "secondary" },
  wsPrice: { icon: Radio, accent: "emerald" },
  wsLastTradePrice: { icon: Radio, accent: "emerald" },
  wsOrderbookSnapshot: { icon: Radio, accent: "emerald" },
  wsTickSizeChange: { icon: Radio, accent: "emerald" },
  wsBestBidAsk: { icon: Radio, accent: "emerald" },
  wsNewMarket: { icon: Radio, accent: "emerald" },
  wsMarketResolved: { icon: Radio, accent: "emerald" },
};

const SEARCH_EXAMPLES = [
  { label: "Presidential election", icon: Vote },
  { label: "Bitcoin price", icon: Layers },
  { label: "NBA finals", icon: Medal },
];

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
  } = ctx;

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

  const categoryEndpoints = useMemo(
    () => getPolymarketLiveEndpointsForCategory(endpointCategory),
    [endpointCategory],
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

  const isEventsCompose = selectedId === POLYMARKET_EVENTS_COMPOSE_ENDPOINT_ID;
  const showAdvancedPullUi = !isEventsCompose || eventsCompose.mode === "advanced";

  const handleSelectEndpoint = useCallback(
    (id) => {
      setConnectApiEndpointId?.(id);
      const cols = getPolymarketLiveColumnsForEndpoint(id);
      const defaultCols =
        id === POLYMARKET_EVENTS_COMPOSE_ENDPOINT_ID
          ? POLYMARKET_EVENTS_COMPOSE_DEFAULT_COLUMNS.filter((name) =>
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
    },
    [
      setConnectApiEndpointId,
      setConnectApiColumnSelections,
      setConnectPolymarketLiveEventsCompose,
    ],
  );

  const handlePublicSearchSelect = useCallback(
    (suggestion) => {
      runPolymarketLiveAction(() => applyPolymarketLiveSearchSelection(ctx, suggestion));
    },
    [ctx, runPolymarketLiveAction],
  );

  const handlePublicSearchSubmitAll = useCallback(
    (suggestions) => {
      runPolymarketLiveAction(() => applyPolymarketLiveSearchAll(ctx, suggestions));
    },
    [ctx, runPolymarketLiveAction],
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
      if (selectedId) {
        setConnectApiEndpointId?.("");
        return true;
      }
      return false;
    };
    return () => {
      if (stepBackRef) stepBackRef.current = null;
    };
  }, [stepBackRef, selectedId, setConnectApiEndpointId]);

  const displayLabel = useCallback((col) => col.name, []);

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
                  categories={POLYMARKET_LIVE_ENDPOINT_CATEGORIES}
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
                icon={Search}
                title="Search for a specific market or event"
                description="Ticker and slug search will live here — use List endpoints or natural language search for now."
                className="h-auto min-h-0 flex-1"
              >
                <p className="text-[11px] font-medium text-muted-foreground">Examples</p>
                <ul className="space-y-1">
                  {SEARCH_EXAMPLES.map((example) => {
                    const ExampleIcon = example.icon;
                    return (
                      <li key={example.label}>
                        <span className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-[11px] leading-snug text-muted-foreground">
                          <ExampleIcon className="size-3 shrink-0" aria-hidden />
                          {example.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
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

          {isEventsCompose ? (
            <PolymarketLiveEventsFields
              className="mt-2"
              onSearchSelect={handlePublicSearchSelect}
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
