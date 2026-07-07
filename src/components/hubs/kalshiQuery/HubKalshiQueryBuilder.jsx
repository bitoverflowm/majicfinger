"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  CloudSun,
  Database,
  Hash,
  Layers,
  LineChart,
  Plus,
  RefreshCw,
  Search,
  Target,
  Trash2,
  Vote,
  Wand2,
  CircleDollarSign,
} from "lucide-react";

import { KalshiPowerToolsSearch } from "@/components/connectData/KalshiPowerToolsSearch";
import { RunForYourselfAuthModal } from "@/components/runYourself/RunForYourselfAuthModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KALSHI_CONNECT_DATA_SOURCES } from "@/config/dataLakeParquetSamples";
import useSWR from "swr";
import { userSwrFetcher } from "@/lib/hooks";
import { getConnectDataLakeConfig } from "@/lib/connectQueryComposeConfig";
import { getKalshiConnectColumnsForSample } from "@/lib/kalshiConnectColumns";
import {
  buildHubQueryDashboardUrl,
  navigateToHubQueryDashboard,
  normalizeHubQueryDraft,
  saveHubQueryDraft,
} from "@/lib/hubs/hubQueryDraft";
import { inferPageNameFromPath } from "@/lib/analytics/sessionStartMeta";
import { cn } from "@/lib/utils";

const LAKE_CONFIG = getConnectDataLakeConfig("kalshiHistorical");

const HUB_KALSHI_SOURCE_PRESENTATION = {
  "athena-kal-markets": {
    icon: Layers,
    description:
      "Contract-level data: titles, categories, outcomes, volume, settlement, and more.",
    badge: "Best for market discovery and backtests",
    accent: "secondary",
  },
  "athena-kal-trades": {
    icon: LineChart,
    description: "Execution-level data: price, size, timestamp, side, buyer, and seller.",
    badge: "Best for price history and volatility analysis",
    accent: "emerald",
  },
};

const HUB_MARKET_SEARCH_EXAMPLES = [
  { label: "NYC high temp", icon: CloudSun, iconClass: "text-sky-600 dark:text-sky-400" },
  { label: "Presidential Election 2024", icon: Vote, iconClass: "text-secondary dark:text-secondary" },
  { label: "KXLLM1", icon: Hash, iconClass: "text-muted-foreground" },
  { label: "Fed rate", icon: CircleDollarSign, iconClass: "text-emerald-700 dark:text-emerald-400" },
];

const HUB_WORKFLOW_TEMPLATES = [
  {
    id: "trades-for-market",
    title: "Get trades for a market",
    description: "Pull all trades for a specific market.",
    icon: RefreshCw,
    apply: () => ({
      sampleId: "athena-kal-trades",
      columns: ["ticker", "yes_price", "count", "taker_side", "created_time"],
      filters: [],
      sheetName: "market_trades",
    }),
  },
  {
    id: "resolved-weather",
    title: "Find resolved weather markets",
    description: "Discover weather markets that have resolved.",
    icon: CloudSun,
    apply: () => ({
      sampleId: "athena-kal-markets",
      columns: ["ticker", "title", "kalshi_taxonomy_category", "volume", "result", "close_time"],
      filters: [
        { column: "kalshi_taxonomy_category", kind: "string", op: "contains", value: "Weather" },
        { column: "status", kind: "string", op: "eq", value: "finalized" },
      ],
      sheetName: "weather_resolved",
    }),
  },
  {
    id: "price-history",
    title: "Build a price history chart",
    description: "Visualize price history over time.",
    icon: LineChart,
    apply: () => ({
      sampleId: "athena-kal-trades",
      columns: ["ticker", "yes_price", "created_time"],
      filters: [],
      sheetName: "price_history",
    }),
  },
  {
    id: "backtest-outcomes",
    title: "Backtest final outcomes",
    description: "Evaluate strategies using final market outcomes.",
    icon: Target,
    apply: () => ({
      sampleId: "athena-kal-markets",
      columns: ["ticker", "title", "volume", "last_price", "result", "status"],
      filters: [{ column: "status", kind: "string", op: "eq", value: "finalized" }],
      sheetName: "backtest_outcomes",
    }),
  },
];

function hubSourceCardClasses({ isSelected, accent, isHovered }) {
  if (isSelected) {
    return accent === "emerald"
      ? "border-emerald-500/60 bg-emerald-500/5 ring-2 ring-emerald-500/20"
      : "border-secondary/60 bg-secondary/5 ring-2 ring-secondary/25";
  }
  if (isHovered) return "border-border bg-muted/30";
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

/** Tighter typography and spacing for MDX guide embeds (hub page keeps defaults). */
function hubEmbedDensity(embedded) {
  return {
    surface: embedded ? "px-4 py-5 md:px-5 md:py-6" : "px-6 py-8 md:px-8 md:py-10",
    stack: embedded ? "space-y-6" : "space-y-8",
    sectionStack: embedded ? "space-y-4" : "space-y-5",
    gridGap: embedded ? "gap-3" : "gap-4",
    heading: embedded ? "text-base" : "text-lg",
    subheading: embedded ? "text-xs" : "text-sm",
    footerPt: embedded ? "pt-4" : "pt-6",
    submitSize: embedded ? "default" : "lg",
    submitPx: embedded ? "px-6" : "px-8",
  };
}

function HubStartingPointColumn({ icon: Icon, title, badge, description, children, compact = false }) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-xl border border-border/70 bg-muted/15",
        compact ? "p-3" : "p-4",
      )}
    >
      <div
        className={cn(
          "space-y-2 border-b border-border/50",
          compact ? "mb-3 pb-3" : "mb-4 pb-4",
        )}
      >
        <div className={cn("flex items-start", compact ? "gap-2" : "gap-2.5")}>
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary dark:text-secondary",
              compact ? "size-7" : "size-8",
            )}
          >
            <Icon className={compact ? "size-3.5" : "size-4"} strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <span className="mb-1 inline-flex rounded-full border border-secondary/25 bg-secondary/10 px-2 py-0.5 text-[0.625rem] font-medium leading-tight text-secondary dark:text-secondary">
              {badge}
            </span>
            <h3
              className={cn(
                "font-semibold leading-snug text-foreground",
                compact ? "text-xs" : "text-sm",
              )}
            >
              {title}
            </h3>
            <p
              className={cn(
                "mt-1 leading-relaxed text-muted-foreground",
                compact ? "text-[11px] leading-snug" : "text-xs",
              )}
            >
              {description}
            </p>
          </div>
        </div>
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col", compact ? "gap-2" : "gap-3")}>{children}</div>
    </div>
  );
}

function HubKalshiSourceOption({ source, isSelected, onSelect, onHover, onLeave, compact = false }) {
  const presentation = HUB_KALSHI_SOURCE_PRESENTATION[source.sampleId];
  if (!presentation) return null;

  const Icon = presentation.icon;
  const { accent } = presentation;

  return (
    <button
      type="button"
      onClick={() => onSelect(source.sampleId)}
      onMouseEnter={() => onHover(source.sampleId)}
      onMouseLeave={onLeave}
      className={cn(
        "group flex w-full items-center text-left transition-all duration-200 ease-out hover:translate-x-1.5",
        compact ? "gap-2 rounded-lg border p-2.5" : "gap-3 rounded-xl border p-3",
        hubSourceCardClasses({ isSelected, accent, isHovered: false }),
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          compact ? "size-8" : "size-9",
          hubSourceIconClasses({ accent }),
        )}
      >
        <Icon className={compact ? "size-3.5" : "size-4"} strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <span className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>
          {source.title}
        </span>
        <p
          className={cn(
            "mt-0.5 leading-snug text-muted-foreground",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          {source.description}
        </p>
      </div>
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
    </button>
  );
}

function HubWorkflowOption({ template, onSelect, compact = false }) {
  const Icon = template.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={cn(
        "flex w-full items-center border border-border/60 bg-background text-left transition-all duration-200 ease-out hover:translate-x-1 hover:border-border hover:bg-muted/25",
        compact ? "gap-2 rounded-lg p-2.5" : "gap-3 rounded-xl p-3",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground",
          compact ? "size-8" : "size-9",
        )}
      >
        <Icon className={compact ? "size-3.5" : "size-4"} strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <span className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>
          {template.title}
        </span>
        <p
          className={cn(
            "mt-0.5 leading-snug text-muted-foreground",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          {template.description}
        </p>
      </div>
      <ChevronRight
        className={cn("shrink-0 text-muted-foreground/70", compact ? "size-3.5" : "size-4")}
        aria-hidden
      />
    </button>
  );
}

function getColumnLabel(col) {
  if (LAKE_CONFIG?.getColumnDisplayLabel) return LAKE_CONFIG.getColumnDisplayLabel(col);
  return col?.label || col?.name || "";
}

function genFilterId() {
  return `hub-w-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function ColumnDefinitionsPanel({
  columns,
  getDisplayLabel,
  showAll = false,
  title,
  className,
  compact = false,
}) {
  if (!columns?.length) return null;
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border border-border/70 bg-muted/15",
        compact ? "p-3" : "p-4",
        className,
      )}
    >
      <p
        className={cn(
          "font-medium uppercase tracking-wider text-muted-foreground",
          compact ? "mb-2 text-[10px]" : "mb-3 text-xs",
        )}
      >
        {title ?? `Column definitions (${columns.length})`}
      </p>
      <ul
        className={cn(
          "min-h-0 flex-1 space-y-2",
          !showAll && "max-h-[min(20rem,40vh)] overflow-y-auto",
          showAll && "overflow-y-auto",
        )}
      >
        {columns.map((col) => (
          <li
            key={col.name}
            className="border-b border-border/40 pb-2 last:border-0 last:pb-0"
          >
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

export function HubKalshiQueryBuilder({ embedded = false }) {
  const { data: user, isLoading: userLoading } = useSWR("/api/user", userSwrFetcher);
  const isLoggedIn = !!user;
  const [authOpen, setAuthOpen] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [error, setError] = useState(null);

  const [sampleId, setSampleId] = useState("");
  const [hoveredSampleId, setHoveredSampleId] = useState("");
  const [columnSelections, setColumnSelections] = useState({});
  const [whereFilters, setWhereFilters] = useState([]);
  const [sheetName, setSheetName] = useState("");
  const [marketSearchInitial, setMarketSearchInitial] = useState("");
  const [marketSearchKey, setMarketSearchKey] = useState(0);
  const clearHoverTimeoutRef = useRef(null);

  const hoveredSourceLabel = useMemo(() => {
    if (!hoveredSampleId) return "";
    return KALSHI_CONNECT_DATA_SOURCES.find((source) => source.sampleId === hoveredSampleId)?.title ?? "";
  }, [hoveredSampleId]);

  const handleSourceHover = useCallback((id) => {
    if (clearHoverTimeoutRef.current) {
      clearTimeout(clearHoverTimeoutRef.current);
      clearHoverTimeoutRef.current = null;
    }
    setHoveredSampleId(id);
  }, []);

  const handleSourceLeave = useCallback(() => {
    clearHoverTimeoutRef.current = setTimeout(() => {
      setHoveredSampleId("");
    }, 120);
  }, []);

  const handlePreviewHover = useCallback(() => {
    if (clearHoverTimeoutRef.current) {
      clearTimeout(clearHoverTimeoutRef.current);
      clearHoverTimeoutRef.current = null;
    }
  }, []);

  const handlePreviewLeave = useCallback(() => {
    setHoveredSampleId("");
  }, []);

  useEffect(() => {
    return () => {
      if (clearHoverTimeoutRef.current) clearTimeout(clearHoverTimeoutRef.current);
    };
  }, []);

  const columns = useMemo(
    () => (sampleId ? getKalshiConnectColumnsForSample(sampleId) : []),
    [sampleId],
  );
  const selectedColumns = columnSelections[sampleId] || [];
  const selectedSet = new Set(selectedColumns);
  const hoverPreviewColumns = hoveredSampleId
    ? getKalshiConnectColumnsForSample(hoveredSampleId)
    : [];

  const toggleColumn = useCallback(
    (name) => {
      if (!sampleId) return;
      setColumnSelections((prev) => {
        const current = prev[sampleId] || [];
        const next = current.includes(name)
          ? current.filter((c) => c !== name)
          : [...current, name];
        return { ...prev, [sampleId]: next };
      });
    },
    [sampleId],
  );

  const selectAllColumns = useCallback(() => {
    if (!sampleId) return;
    setColumnSelections((prev) => ({
      ...prev,
      [sampleId]: columns.map((c) => c.name),
    }));
  }, [sampleId, columns]);

  const clearColumns = useCallback(() => {
    if (!sampleId) return;
    setColumnSelections((prev) => ({ ...prev, [sampleId]: [] }));
  }, [sampleId]);

  const handleSelectSource = useCallback((id) => {
    const cols = getKalshiConnectColumnsForSample(id).map((c) => c.name);
    setSampleId(id);
    setColumnSelections((prev) => ({ ...prev, [id]: cols }));
    setWhereFilters([]);
    setError(null);
  }, []);

  const handlePowerSearchSelect = useCallback((suggestion) => {
    const id = suggestion.entity === "markets" ? "athena-kal-markets" : "athena-kal-trades";
    const cols = getKalshiConnectColumnsForSample(id).map((c) => c.name);
    setSampleId(id);
    setColumnSelections((prev) => ({ ...prev, [id]: cols }));
    setWhereFilters([
      {
        id: genFilterId(),
        column: "ticker",
        kind: "string",
        op: "eq",
        value: suggestion.ticker,
      },
    ]);
    setError(null);
  }, []);

  const handleApplyWorkflow = useCallback((template) => {
    const preset = template.apply();
    setSampleId(preset.sampleId);
    setColumnSelections({ [preset.sampleId]: preset.columns });
    setWhereFilters(
      preset.filters.map((filter) => ({
        ...filter,
        id: genFilterId(),
      })),
    );
    setSheetName(preset.sheetName || "");
    setError(null);
  }, []);

  const addFilter = useCallback(() => {
    const defaultCol = columns[0]?.name || "ticker";
    setWhereFilters((prev) => [
      ...prev,
      {
        id: genFilterId(),
        column: defaultCol,
        kind: "string",
        op: "eq",
        value: "",
      },
    ]);
  }, [columns]);

  const updateFilter = useCallback((id, patch) => {
    setWhereFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const removeFilter = useCallback((id) => {
    setWhereFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const buildDraft = useCallback(() => {
    const sourceHubPath =
      typeof window !== "undefined" ? window.location.pathname || "" : "";
    return normalizeHubQueryDraft({
      sampleId,
      columnSelections,
      whereFilters: whereFilters.filter((f) => String(f.value ?? "").trim()),
      pendingSheetName: sheetName.trim() || undefined,
      sourceHubPath: sourceHubPath || undefined,
      sourceHubName: sourceHubPath ? inferPageNameFromPath(sourceHubPath) : undefined,
    });
  }, [sampleId, columnSelections, whereFilters, sheetName]);

  const continueToDashboard = useCallback(async () => {
    const draft = buildDraft();
    if (!draft) {
      setError("Select Markets or Trades and at least one column.");
      return;
    }

    saveHubQueryDraft(draft);
    setSubmitBusy(true);
    setError(null);

    try {
      navigateToHubQueryDashboard(buildHubQueryDashboardUrl());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitBusy(false);
    }
  }, [buildDraft]);

  const handleSubmit = useCallback(() => {
    if (userLoading) return;

    const draft = buildDraft();
    if (!draft) {
      setError("Select Markets or Trades and at least one column.");
      return;
    }
    saveHubQueryDraft(draft);

    if (isLoggedIn) {
      void continueToDashboard();
      return;
    }

    setAuthOpen(true);
  }, [buildDraft, userLoading, isLoggedIn, continueToDashboard]);

  const density = hubEmbedDensity(embedded);

  return (
    <>
      <div
        className={cn(
          "relative z-20 w-full bg-background font-sans",
          density.stack,
          embedded ? density.surface : cn("border-y border-border", density.surface),
        )}
      >
        {!sampleId ? (
          <div className={density.sectionStack}>
            <div className="space-y-1">
              <h3 className={cn("font-semibold tracking-tight text-foreground", density.heading)}>
                What do you want to do with Kalshi historical data?
              </h3>
              <p className={cn("leading-relaxed text-muted-foreground", density.subheading)}>
                Start from raw data, search a specific market, or launch a guided workflow built
                for prediction market research.
              </p>
            </div>

            <div className={cn("flex flex-col lg:flex-row lg:items-stretch", density.gridGap)}>
              <div className="lg:w-[min(100%,20rem)] lg:shrink-0 xl:w-1/3">
                <HubStartingPointColumn
                  icon={Database}
                  title="Browse raw historical data"
                  badge="Best for discovery"
                  description="Choose a dataset first, then filter, select columns, and query the exact rows you need."
                  compact={embedded}
                >
                  <p className={cn("font-medium text-muted-foreground", embedded ? "text-[11px]" : "text-xs")}>
                    Choose a data source
                  </p>
                  <div className={embedded ? "space-y-1.5" : "space-y-2"}>
                    {KALSHI_CONNECT_DATA_SOURCES.map((source) => (
                      <HubKalshiSourceOption
                        key={source.sampleId}
                        source={source}
                        isSelected={sampleId === source.sampleId}
                        onSelect={handleSelectSource}
                        onHover={handleSourceHover}
                        onLeave={handleSourceLeave}
                        compact={embedded}
                      />
                    ))}
                  </div>
                </HubStartingPointColumn>
              </div>

              <div className={cn("relative flex-1 overflow-hidden", embedded ? "min-h-[16rem] lg:min-h-0" : "min-h-[18rem] lg:min-h-0")}>
                <div
                  className={cn(
                    "grid h-full transition-all duration-500 ease-out lg:grid-cols-2",
                    density.gridGap,
                    hoveredSampleId
                      ? "pointer-events-none translate-x-6 opacity-0"
                      : "translate-x-0 opacity-100",
                  )}
                  aria-hidden={!!hoveredSampleId}
                >
                  <HubStartingPointColumn
                    icon={Search}
                    title="Search for a specific market"
                    badge="Best for known markets"
                    description="Load a Kalshi market by ticker, title, or event so you can explore its historical data faster."
                    compact={embedded}
                  >
                    <p className={cn("font-medium text-muted-foreground", embedded ? "text-[11px]" : "text-xs")}>
                      Search
                    </p>
                    <KalshiPowerToolsSearch
                      key={marketSearchKey}
                      variant="embedded"
                      initialQuery={marketSearchInitial}
                      onSelect={handlePowerSearchSelect}
                      inputClassName={embedded ? "h-9 rounded-lg pl-9 pr-12 text-xs" : undefined}
                    />
                    <div className={embedded ? "space-y-1.5" : "space-y-2"}>
                      <p className={cn("font-medium text-muted-foreground", embedded ? "text-[11px]" : "text-xs")}>
                        Examples
                      </p>
                      <ul className="space-y-1">
                        {HUB_MARKET_SEARCH_EXAMPLES.map((example) => {
                          const ExampleIcon = example.icon;
                          return (
                          <li key={example.label}>
                            <button
                              type="button"
                              onClick={() => {
                                setMarketSearchInitial(example.label);
                                setMarketSearchKey((key) => key + 1);
                              }}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-md px-1 py-1 text-left leading-snug text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground",
                                embedded ? "text-[11px]" : "text-xs",
                              )}
                            >
                              <ExampleIcon
                                className={cn("shrink-0", embedded ? "size-3" : "size-3.5", example.iconClass)}
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

                  <HubStartingPointColumn
                    icon={Wand2}
                    title="Use a guided workflow"
                    badge="Best for guided setup"
                    description="Follow a step-by-step guided walkthrough for common Kalshi historical data tasks."
                    compact={embedded}
                  >
                    <div className={embedded ? "space-y-1.5" : "space-y-2"}>
                      {HUB_WORKFLOW_TEMPLATES.map((template) => (
                        <HubWorkflowOption
                          key={template.id}
                          template={template}
                          onSelect={handleApplyWorkflow}
                          compact={embedded}
                        />
                      ))}
                    </div>
                  </HubStartingPointColumn>
                </div>

                <div
                  className={cn(
                    "absolute inset-0 transition-all duration-500 ease-out",
                    hoveredSampleId
                      ? "translate-x-0 opacity-100"
                      : "pointer-events-none translate-x-8 opacity-0",
                  )}
                  onMouseEnter={handlePreviewHover}
                  onMouseLeave={handlePreviewLeave}
                  aria-hidden={!hoveredSampleId}
                >
                  {hoveredSampleId ? (
                    <ColumnDefinitionsPanel
                      columns={hoverPreviewColumns}
                      getDisplayLabel={getColumnLabel}
                      showAll
                      title={`${hoveredSourceLabel} columns (${hoverPreviewColumns.length})`}
                      className="h-full"
                      compact={embedded}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {sampleId ? (
          <>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Columns
                </Label>
                <div className="flex gap-0.5">
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[0.6875rem]" onClick={selectAllColumns}>
                    Select all
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[0.6875rem]" onClick={clearColumns}>
                    Clear
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[0.6875rem]"
                    onClick={() => {
                      setSampleId("");
                      setWhereFilters([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {columns.map((col) => {
                  const isSelected = selectedSet.has(col.name);
                  return (
                    <li key={col.name}>
                      <button
                        type="button"
                        onClick={() => toggleColumn(col.name)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left transition-colors",
                          isSelected
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/60 bg-background hover:bg-muted/20",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background",
                          )}
                        >
                          {isSelected ? <Check className="h-2 w-2" strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                            <span className="text-xs font-medium leading-tight text-foreground">
                              {getColumnLabel(col)}
                            </span>
                            <span className="text-[10px] leading-tight text-muted-foreground">{col.type}</span>
                          </span>
                          <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                            {col.description}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Filters (optional)
                </Label>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={addFilter}>
                  <Plus className="h-3.5 w-3.5" />
                  Add filter
                </Button>
              </div>
              {whereFilters.length === 0 ? (
                <p className="text-sm text-muted-foreground">No filters — query returns up to the row limit.</p>
              ) : (
                <ul className="space-y-3">
                  {whereFilters.map((filter) => (
                    <li
                      key={filter.id}
                      className="flex flex-wrap items-end gap-2 rounded-lg border border-border/60 bg-background p-3"
                    >
                      <div className="min-w-[8rem] flex-1">
                        <Label className="text-[10px] text-muted-foreground">Column</Label>
                        <Select
                          value={filter.column}
                          onValueChange={(v) => updateFilter(filter.id, { column: v })}
                        >
                          <SelectTrigger className="h-9 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {columns.map((col) => (
                              <SelectItem key={col.name} value={col.name}>
                                {getColumnLabel(col)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-28">
                        <Label className="text-[10px] text-muted-foreground">Operator</Label>
                        <Select
                          value={filter.op}
                          onValueChange={(v) => updateFilter(filter.id, { op: v })}
                        >
                          <SelectTrigger className="h-9 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="eq">equals</SelectItem>
                            <SelectItem value="contains">contains</SelectItem>
                            <SelectItem value="gt">greater than</SelectItem>
                            <SelectItem value="lt">less than</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-[8rem] flex-1">
                        <Label className="text-[10px] text-muted-foreground">Value</Label>
                        <Input
                          className="h-9 mt-1"
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                          placeholder="Filter value"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground"
                        onClick={() => removeFilter(filter.id)}
                        aria-label="Remove filter"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hub-sheet-name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sheet name (optional)
              </Label>
              <Input
                id="hub-sheet-name"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="e.g. high_volume_markets"
                className="max-w-md"
              />
            </div>
          </>
        ) : null}

        {error ? (
          <p className={cn("text-destructive", embedded ? "text-xs" : "text-sm")}>{error}</p>
        ) : null}

        <div className={cn("flex justify-end border-t border-border/60", density.footerPt)}>
          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              size={density.submitSize}
              className={cn("rounded-full", density.submitPx)}
              disabled={submitBusy || userLoading || !sampleId || selectedColumns.length === 0}
              onClick={handleSubmit}
            >
              {submitBusy ? "Starting…" : userLoading ? "Loading…" : isLoggedIn ? "Run query" : "Run for Free"}
            </Button>
            {!isLoggedIn ? (
              <p className={cn("text-muted-foreground", embedded ? "text-[11px]" : "text-xs")}>
                No credit card required
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <RunForYourselfAuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onAuthenticated={() => void continueToDashboard()}
      />
    </>
  );
}
