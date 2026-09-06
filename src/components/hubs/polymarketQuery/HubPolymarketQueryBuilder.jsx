"use client";

import { ConnectComposeOperationPanel } from "@/components/connectData/ConnectComposeOperationPanel";
import { ConnectComposeHelperLayout } from "@/components/connectData/ConnectComposeHelperLayout";
import { FEATURE_HELPER_DRAWER_WIDTH_CLASS } from "@/components/shared/FeatureHelper";
import { ConnectDataOperationsSection } from "@/components/connectData/ConnectDataOperationsSection";
import { ConnectResearchToolsSection } from "@/components/connectData/ConnectResearchToolsSection";
import { GuidedWorkflowPullResults } from "@/components/guidedWorkflow/GuidedWorkflowPullResults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { POLYMARKET_CONNECT_DATA_SOURCES } from "@/config/dataLakeParquetSamples";
import useSWR from "swr";
import { userSwrFetcher } from "@/lib/hooks";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useDemoProGate } from "@/hooks/useDemoProGate";
import { getConnectComposeOperationsForWorkspace } from "@/lib/connectComposeOperations";
import { getConnectDataLakeConfig } from "@/lib/connectQueryComposeConfig";
import { applyHubQueryDraft } from "@/lib/hubs/applyHubQueryDraft";
import { applyDraftToHubBuilderState } from "@/lib/hubs/applyDraftToHubBuilderState";
import { createEmptyBucketTab } from "@/lib/bucketSheetTabs";
import { generateRandomSampleSeed } from "@/lib/dataLake/randomSample";
import {
  subscribeConnectComposeEditDraft,
  takeConnectComposeEditDraft,
} from "@/lib/hubs/connectComposeEditDraft";
import {
  buildHubQueryDashboardUrl,
  hasComposeDraftPayload,
  navigateToHubQueryDashboard,
  normalizeHubQueryDraft,
  normalizeHubQueryWhereFilters,
  saveHubQueryDraft,
} from "@/lib/hubs/hubQueryDraft";
import {
  getPolymarketColumnDisplayLabel,
  getPolymarketConnectColumnsForSample,
  getPolymarketTableIntro,
  getPolymarketTableNotes,
} from "@/lib/polymarketConnectColumns";
import { cn } from "@/lib/utils";
import { flushSync } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Database, Layers, LineChart, Search, Wand2, Box } from "lucide-react";

const INTEGRATION_ID = "polymarketHistorical";
const LAKE_CONFIG = getConnectDataLakeConfig(INTEGRATION_ID);

const HUB_POLYMARKET_SOURCE_PRESENTATION = {
  "athena-pm-markets": {
    icon: Layers,
    accent: "secondary",
  },
  "athena-pm-trades": {
    icon: LineChart,
    accent: "emerald",
  },
  "athena-pm-blocks": {
    icon: Box,
    accent: "secondary",
  },
};

const PLACEHOLDER_GUIDED_WORKFLOWS = [
  {
    id: "top-markets-volume",
    title: "Get top markets by volume",
    description: "Find and rank the highest-volume Polymarket markets.",
  },
  {
    id: "market-trades",
    title: "Get trades for a market",
    description: "Pull trade history for a specific market contract.",
  },
  {
    id: "resolved-markets",
    title: "Find resolved markets",
    description: "Filter markets that have closed and settled.",
  },
];

function hubEmbedDensity(connectHome) {
  return {
    stack: "space-y-6",
    sectionStack: "space-y-4",
    gridGap: "gap-3",
    heading: connectHome ? "text-base" : "text-base lg:text-lg",
    subheading: connectHome ? "text-xs" : "text-xs lg:text-sm",
    footerPt: "pt-4",
    submitSize: "default",
    submitPx: "px-6",
    label: "text-[11px]",
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

function HubStartingPointColumn({ icon: Icon, title, badge, description, children, compact = false, id, disabled = false }) {
  return (
    <div
      id={id}
      className={cn(
        "relative flex h-full flex-col rounded-xl border scroll-mt-28",
        "transition-[box-shadow,ring-color] duration-300",
        disabled
          ? "border-border/40 bg-muted/10 opacity-70"
          : "border-border/70 bg-muted/15",
        compact ? "p-3" : "p-3 md:p-3 lg:p-4",
      )}
    >
      <div className={cn("space-y-2 border-b border-border/50", compact ? "mb-3 pb-3" : "mb-3 pb-3 lg:mb-4 lg:pb-4")}>
        <div className={cn("flex items-start", compact ? "gap-2" : "gap-2 lg:gap-2.5")}>
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary dark:text-secondary",
              compact ? "size-7" : "size-7 lg:size-8",
              disabled && "opacity-60",
            )}
          >
            <Icon className={compact ? "size-3.5" : "size-3.5 lg:size-4"} strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            {badge ? (
              <span
                className={cn(
                  "mb-1 inline-flex rounded-full border px-2 py-0.5 text-[0.625rem] font-medium leading-tight",
                  disabled
                    ? "border-border/50 bg-muted/30 text-muted-foreground"
                    : "border-secondary/25 bg-secondary/10 text-secondary dark:text-secondary",
                )}
              >
                {badge}
              </span>
            ) : null}
            <h3
              className={cn(
                "font-semibold leading-snug",
                disabled ? "text-muted-foreground" : "text-foreground",
                compact ? "text-xs" : "text-xs lg:text-sm",
              )}
            >
              {title}
            </h3>
            <p
              className={cn(
                "mt-1 leading-relaxed text-muted-foreground",
                compact ? "text-[11px] leading-snug" : "text-[11px] leading-snug lg:text-xs",
              )}
            >
              {description}
            </p>
          </div>
        </div>
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col", compact ? "gap-2" : "gap-3", disabled && "pointer-events-none")}>
        {children}
      </div>
      {disabled ? (
        <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Coming soon
        </p>
      ) : null}
    </div>
  );
}

function HubPolymarketSourceOption({ source, isSelected, onSelect, onHover, onLeave, compact = false, disableHover = false }) {
  const presentation = HUB_POLYMARKET_SOURCE_PRESENTATION[source.sampleId];
  if (!presentation) return null;

  const Icon = presentation.icon;
  const { accent } = presentation;

  return (
    <button
      type="button"
      onClick={() => onSelect(source.sampleId)}
      onMouseEnter={() => !disableHover && onHover(source.sampleId)}
      onMouseLeave={() => !disableHover && onLeave()}
      className={cn(
        "group flex w-full items-center text-left transition-all duration-200 ease-out hover:translate-x-1.5",
        compact ? "gap-2 rounded-lg border p-2.5" : "gap-2 rounded-lg border p-2.5 lg:gap-3 lg:rounded-xl lg:p-3",
        hubSourceCardClasses({ isSelected, accent }),
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          compact ? "size-8" : "size-8 lg:size-9",
          hubSourceIconClasses({ accent }),
        )}
      >
        <Icon className={compact ? "size-3.5" : "size-3.5 lg:size-4"} strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <span className={cn("font-medium text-foreground", compact ? "text-xs" : "text-xs lg:text-sm")}>
          {source.title}
        </span>
        <p className={cn("mt-0.5 leading-snug text-muted-foreground", compact ? "text-[11px]" : "text-[11px] lg:text-xs")}>
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
          <span className={cn("size-2 rounded-full", accent === "emerald" ? "bg-emerald-500" : "bg-secondary")} />
        ) : null}
      </span>
    </button>
  );
}

function ColumnDefinitionsPanel({ columns, getDisplayLabel, title, className, compact = false }) {
  if (!columns?.length) return null;
  return (
    <div className={cn("flex h-full flex-col rounded-xl border border-border/70 bg-muted/15", compact ? "p-3" : "p-4", className)}>
      <p className={cn("font-medium uppercase tracking-wider text-muted-foreground", compact ? "mb-2 text-[10px]" : "mb-3 text-xs")}>
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

function PolymarketTableNotes({ sampleId }) {
  const notes = getPolymarketTableNotes(sampleId);
  if (!notes) return null;
  return (
    <div className="space-y-2 rounded-lg border border-border/50 bg-muted/15 px-3 py-2.5">
      {notes.footnotes?.map((line) => (
        <p key={line} className="text-[11px] leading-snug text-muted-foreground">
          {line}
        </p>
      ))}
      {notes.legacyIntro ? (
        <>
          <p className="text-[11px] font-medium text-foreground">Polymarket legacy trades (FPMM)</p>
          <p className="text-[11px] leading-snug text-muted-foreground">{notes.legacyIntro}</p>
        </>
      ) : null}
    </div>
  );
}

/**
 * Polymarket Historical query builder — Connect home and hub landing mockup.
 * Search and guided workflows are shown but disabled until implemented.
 *
 * @param {{
 *   connectHome?: boolean;
 *   mockup?: boolean;
 *   embedded?: boolean;
 *   stepBackRef?: React.MutableRefObject<(() => boolean) | null>;
 * }} props
 */
export function HubPolymarketQueryBuilder({
  connectHome = false,
  mockup = false,
  embedded = false,
  stepBackRef,
}) {
  const { data: user, isLoading: userLoading } = useSWR("/api/user", userSwrFetcher);
  const isLoggedIn = !!user;
  const connectCtx = useMyStateV2();
  const { requestHistoricalProUpgrade, workspaceWriteLocked, dialog: demoProDialog } = useDemoProGate();
  const [submitBusy, setSubmitBusy] = useState(false);
  const [error, setError] = useState(null);
  const [demoPullDraft, setDemoPullDraft] = useState(null);

  const [sampleId, setSampleId] = useState("");
  const [hoveredSampleId, setHoveredSampleId] = useState("");
  const [columnSelections, setColumnSelections] = useState({});
  const [activeComposeOps, setActiveComposeOps] = useState([]);
  const [composeDraft, setComposeDraft] = useState({});
  const composeDraftRef = useRef({});
  const [composeSeed, setComposeSeed] = useState(null);
  const [sheetName, setSheetName] = useState("");
  const clearHoverTimeoutRef = useRef(null);

  const handleComposeChange = useCallback((next) => {
    // Merge so research-tool fields (bucketing, etc.) the op panel does not own are kept.
    const merged = { ...(composeDraftRef.current || {}), ...(next || {}) };
    composeDraftRef.current = merged;
    setComposeDraft(merged);
  }, []);

  useEffect(() => {
    const tryHydrateEditDraft = () => {
      const draft = takeConnectComposeEditDraft(INTEGRATION_ID);
      if (!draft) return;
      applyDraftToHubBuilderState(draft, {
        setSampleId,
        setColumnSelections,
        setActiveComposeOps,
        setComposeDraft,
        composeDraftRef,
        setComposeSeed,
        setSheetName,
        setError,
      });
    };
    tryHydrateEditDraft();
    return subscribeConnectComposeEditDraft(tryHydrateEditDraft);
  }, []);

  const patchComposeDraft = useCallback((patch) => {
    const next = { ...(composeDraftRef.current || {}), ...patch };
    composeDraftRef.current = next;
    setComposeDraft(next);
    setComposeSeed(next);
  }, []);

  const enableRandomSample = useCallback(() => {
    patchComposeDraft({
      randomSampleEnabled: true,
      composeLimitOpen: false,
      composeLimitValue: "",
      randomSampleSize:
        String(composeDraftRef.current?.randomSampleSize || "").trim() || "100",
      randomSampleSeeded: true,
      randomSampleSeed:
        String(composeDraftRef.current?.randomSampleSeed || "").trim() || generateRandomSampleSeed(),
    });
    setActiveComposeOps((prev) => (prev || []).filter((id) => id !== "row_limit"));
  }, [patchComposeDraft]);

  const setRandomSampleEnabled = useCallback(
    (next) => {
      const enabled =
        typeof next === "function" ? next(!!composeDraftRef.current?.randomSampleEnabled) : !!next;
      if (enabled) {
        enableRandomSample();
        return;
      }
      patchComposeDraft({ randomSampleEnabled: false });
    },
    [enableRandomSample, patchComposeDraft],
  );

  const setRandomSampleSize = useCallback(
    (value) => {
      patchComposeDraft({ randomSampleSize: value });
    },
    [patchComposeDraft],
  );

  const setRandomSampleSeeded = useCallback(
    (next) => {
      const seeded =
        typeof next === "function" ? next(composeDraftRef.current?.randomSampleSeeded !== false) : !!next;
      if (seeded) {
        patchComposeDraft({
          randomSampleSeeded: true,
          randomSampleSeed:
            String(composeDraftRef.current?.randomSampleSeed || "").trim() || generateRandomSampleSeed(),
        });
      } else {
        patchComposeDraft({ randomSampleSeeded: false, randomSampleSeed: "" });
      }
    },
    [patchComposeDraft],
  );

  const enableBucketing = useCallback(() => {
    const existing = composeDraftRef.current?.bucketConfig;
    patchComposeDraft({
      bucketingEnabled: true,
      bucketConfig:
        existing && typeof existing === "object"
          ? existing
          : createEmptyBucketTab("Bucketed sheet"),
    });
  }, [patchComposeDraft]);

  const setBucketingEnabled = useCallback(
    (next) => {
      const enabled =
        typeof next === "function" ? next(!!composeDraftRef.current?.bucketingEnabled) : !!next;
      if (enabled) {
        enableBucketing();
        return;
      }
      patchComposeDraft({ bucketingEnabled: false });
    },
    [enableBucketing, patchComposeDraft],
  );

  const setBucketConfig = useCallback(
    (value) => {
      patchComposeDraft({
        bucketConfig: value && typeof value === "object" ? value : null,
        bucketingEnabled: true,
      });
    },
    [patchComposeDraft],
  );

  const [researchHelperToolId, setResearchHelperToolId] = useState(null);
  const [researchHelperOpen, setResearchHelperOpen] = useState(false);

  const handleResearchToolHelperChange = useCallback((toolId) => {
    if (!toolId) {
      setResearchHelperOpen(false);
      setResearchHelperToolId(null);
      return;
    }
    setResearchHelperToolId(toolId);
    setResearchHelperOpen(true);
  }, []);

  const hoveredSourceLabel = useMemo(() => {
    if (!hoveredSampleId) return "";
    return POLYMARKET_CONNECT_DATA_SOURCES.find((source) => source.sampleId === hoveredSampleId)?.title ?? "";
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
    () => (sampleId ? getPolymarketConnectColumnsForSample(sampleId) : []),
    [sampleId],
  );
  const selectedColumns = columnSelections[sampleId] || [];
  const selectedSet = new Set(selectedColumns);
  const hoverPreviewColumns = hoveredSampleId ? getPolymarketConnectColumnsForSample(hoveredSampleId) : [];
  const tableIntro = sampleId ? getPolymarketTableIntro(sampleId) : "";

  const toggleColumn = useCallback(
    (name) => {
      if (!sampleId) return;
      setColumnSelections((prev) => {
        const current = prev[sampleId] || [];
        const next = current.includes(name) ? current.filter((c) => c !== name) : [...current, name];
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

  const handleSelectSource = useCallback(
    (id) => {
      setSampleId(id);
      setColumnSelections((prev) => ({
        ...prev,
        [id]: prev[id] ?? [],
      }));
      setActiveComposeOps([]);
      setComposeSeed(null);
      setError(null);
      if (connectHome) {
        const snap = LAKE_CONFIG?.sampleOptions?.find((s) => s.id === id);
        if (snap && LAKE_CONFIG?.lake) {
          void connectCtx?.pingAthenaLakeSample?.({
            sampleId: id,
            lake: LAKE_CONFIG.lake,
            table: snap.table,
          });
        }
      }
    },
    [connectHome, connectCtx],
  );

  const cancelToStartingView = useCallback(() => {
    setSampleId("");
    setActiveComposeOps([]);
    setComposeSeed(null);
    setComposeDraft({});
    composeDraftRef.current = {};
    setSheetName("");
    setError(null);
  }, []);

  useEffect(() => {
    if (!stepBackRef || !connectHome) return undefined;
    stepBackRef.current = () => {
      if (!sampleId) return false;
      cancelToStartingView();
      return true;
    };
    return () => {
      stepBackRef.current = null;
    };
  }, [stepBackRef, connectHome, sampleId, cancelToStartingView]);

  const buildDraft = useCallback(() => {
    const refDraft = composeDraftRef.current;
    const draftState = hasComposeDraftPayload(refDraft)
      ? refDraft
      : hasComposeDraftPayload(composeDraft)
        ? composeDraft
        : { ...composeDraft, ...(refDraft || {}) };
    const whereFilters = normalizeHubQueryWhereFilters(draftState.whereFilters);
    return normalizeHubQueryDraft({
      integrationId: INTEGRATION_ID,
      sampleId,
      columnSelections,
      whereFilters,
      activeComposeOps: draftState.activeComposeOps || activeComposeOps,
      columnComposeItems: draftState.columnComposeItems || [],
      orderBy: draftState.orderBy || [],
      havingFilters: draftState.havingFilters || [],
      joins: draftState.joins || [],
      composeLimitOpen: !!draftState.composeLimitOpen,
      composeLimitValue: draftState.composeLimitValue ?? "",
      composeLimitScope: draftState.composeLimitScope ?? "primary",
      randomSampleEnabled: !!draftState.randomSampleEnabled,
      randomSampleSize: draftState.randomSampleSize ?? "",
      randomSampleSeeded: draftState.randomSampleSeeded !== false,
      randomSampleSeed: draftState.randomSampleSeed ?? "",
      bucketingEnabled: !!draftState.bucketingEnabled,
      bucketConfig:
        draftState.bucketConfig && typeof draftState.bucketConfig === "object"
          ? draftState.bucketConfig
          : null,
      pendingSheetName: sheetName.trim() || undefined,
    });
  }, [sampleId, columnSelections, composeDraft, activeComposeOps, sheetName]);

  const continueToDashboard = useCallback(async () => {
    const draft = buildDraft();
    if (!draft) {
      setError("Select a dataset and at least one column.");
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

  const runConnectHomePull = useCallback(
    (draft) => {
      if (!connectCtx) {
        setError("Workspace is not ready. Try again in a moment.");
        return;
      }
      if (workspaceWriteLocked) {
        requestHistoricalProUpgrade("Polymarket Historical");
        return;
      }
      setSubmitBusy(true);
      setError(null);
      try {
        applyHubQueryDraft(connectCtx, draft, { autoPull: true, integrationId: INTEGRATION_ID });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setSubmitBusy(false);
      }
    },
    [connectCtx, workspaceWriteLocked, requestHistoricalProUpgrade],
  );

  const handleSubmit = useCallback(() => {
    if (!connectHome && userLoading) return;

    const draft = buildDraft();
    if (!draft) {
      setError("Select a dataset and at least one column.");
      return;
    }

    if (connectHome) {
      runConnectHomePull(draft);
      return;
    }

    // Public hub / mockup demo: run the capped query inline without sign-in.
    if (!isLoggedIn) {
      flushSync(() => {
        setDemoPullDraft(draft);
      });
      setError(null);
      return;
    }

    saveHubQueryDraft(draft);
    void continueToDashboard();
  }, [
    buildDraft,
    connectHome,
    continueToDashboard,
    isLoggedIn,
    runConnectHomePull,
    userLoading,
  ]);

  const density = hubEmbedDensity(connectHome || embedded || mockup);
  const compact = connectHome || embedded || mockup;

  if (demoPullDraft) {
    return (
      <GuidedWorkflowPullResults
        draft={demoPullDraft}
        embedded={embedded}
        mockup={mockup}
        connectHome={connectHome}
        integrationId={INTEGRATION_ID}
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          "relative z-20 w-full font-sans",
          density.stack,
          !connectHome && (mockup || embedded) && "bg-background px-4 py-5 md:px-5 md:py-6",
        )}
      >
        {!sampleId ? (
          <div className={density.sectionStack}>
            <div className="space-y-1">
              <h3 className={cn("font-semibold tracking-tight text-foreground", density.heading)}>
                What do you want to do with Polymarket historical data?
              </h3>
              <p className={cn("leading-relaxed text-muted-foreground", density.subheading)}>
                Start from raw data, search a specific market, or launch a guided workflow built for
                prediction market research.
              </p>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Public demo preview · up to 10 rows per query in the full workspace.
              </p>
            </div>

            <div className={cn("grid grid-cols-1 items-stretch sm:grid-cols-3", density.gridGap)}>
              <div className="min-w-0">
                <HubStartingPointColumn
                  icon={Database}
                  title="Browse raw historical data"
                  badge="Best for discovery"
                  description="Choose a dataset first, then filter, select columns, and query the exact rows you need."
                  compact={compact}
                >
                  <p className={cn("font-medium text-muted-foreground", density.label)}>Choose a data source</p>
                  <div className={density.listGap}>
                    {POLYMARKET_CONNECT_DATA_SOURCES.map((source) => (
                      <HubPolymarketSourceOption
                        key={source.sampleId}
                        source={source}
                        isSelected={sampleId === source.sampleId}
                        onSelect={handleSelectSource}
                        onHover={handleSourceHover}
                        onLeave={handleSourceLeave}
                        compact={compact}
                        disableHover={false}
                      />
                    ))}
                  </div>
                </HubStartingPointColumn>
              </div>

              <div className="relative min-h-[16rem] min-w-0 overflow-hidden sm:col-span-2 sm:min-h-0">
                <div
                  className={cn(
                    "grid h-full grid-cols-1 transition-all duration-500 ease-out sm:grid-cols-2",
                    density.gridGap,
                    hoveredSampleId ? "pointer-events-none translate-x-6 opacity-0" : "translate-x-0 opacity-100",
                  )}
                  aria-hidden={!!hoveredSampleId}
                >
                  <HubStartingPointColumn
                    icon={Search}
                    title="Search for a specific market"
                    badge="Best for known markets"
                    description="Load a Polymarket market by slug, title, or condition ID so you can explore its historical data faster."
                    compact={compact}
                    disabled
                  >
                    <p className={cn("font-medium text-muted-foreground", density.label)}>Search</p>
                    <Input
                      disabled
                      placeholder="Search by slug, title, or condition ID…"
                      className="h-9 rounded-lg text-xs"
                      aria-hidden
                    />
                  </HubStartingPointColumn>

                  <HubStartingPointColumn
                    icon={Wand2}
                    title="Use a guided workflow"
                    badge="Best for guided setup"
                    description="Follow a step-by-step guided walkthrough for common Polymarket historical data tasks."
                    compact={compact}
                    disabled
                  >
                    <div className={density.listGap}>
                      {PLACEHOLDER_GUIDED_WORKFLOWS.map((workflow) => (
                        <div
                          key={workflow.id}
                          className="flex w-full items-center gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5 opacity-60"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground/70">
                            <Wand2 className="size-3.5" strokeWidth={1.75} aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-medium text-muted-foreground">{workflow.title}</span>
                              <span className="inline-flex rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[0.625rem] font-medium leading-tight text-muted-foreground">
                                Coming soon
                              </span>
                            </span>
                            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/80">
                              {workflow.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </HubStartingPointColumn>
                </div>

                <div
                  className={cn(
                    "absolute inset-0 transition-all duration-500 ease-out",
                    hoveredSampleId ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-8 opacity-0",
                  )}
                  onMouseEnter={handlePreviewHover}
                  onMouseLeave={handlePreviewLeave}
                  aria-hidden={!hoveredSampleId}
                >
                  {hoveredSampleId ? (
                    <ColumnDefinitionsPanel
                      columns={hoverPreviewColumns}
                      getDisplayLabel={getPolymarketColumnDisplayLabel}
                      title={`${hoveredSourceLabel} columns (${hoverPreviewColumns.length})`}
                      className="h-full"
                      compact={compact}
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
                <Label className="text-xs font-semibold tracking-tight text-foreground">
                  {`What data parameters are you interested in pulling for your ${
                    POLYMARKET_CONNECT_DATA_SOURCES.find((s) => s.sampleId === sampleId)?.title || sampleId
                  }`}
                </Label>
                <div className="flex gap-0.5">
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[0.6875rem]" onClick={selectAllColumns}>
                    Select all
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[0.6875rem]" onClick={clearColumns}>
                    Clear
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[0.6875rem]" onClick={cancelToStartingView}>
                    Cancel
                  </Button>
                </div>
              </div>
              {tableIntro ? (
                <p className="text-[11px] leading-snug text-muted-foreground">{tableIntro}</p>
              ) : null}
              <PolymarketTableNotes sampleId={sampleId} />
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
                          isSelected ? "border-primary/40 bg-primary/5" : "border-border/60 bg-background hover:bg-muted/20",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
                          )}
                        >
                          {isSelected ? <Check className="h-2 w-2" strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                            <span className="text-xs font-medium leading-tight text-foreground">
                              {getPolymarketColumnDisplayLabel(col)}
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

            {selectedColumns.length > 0 ? (
              <ConnectComposeHelperLayout
                activeHelperToolId={researchHelperToolId}
                helperOpen={researchHelperOpen}
                onHelperOpenChange={(open) => {
                  if (!open) handleResearchToolHelperChange(null);
                }}
              >
                <div className="space-y-0">
                  <ConnectDataOperationsSection
                    selectedCount={selectedColumns.length}
                    className="mt-0 border-t-0 pt-0"
                    operations={getConnectComposeOperationsForWorkspace(INTEGRATION_ID)}
                    activeComposeOps={activeComposeOps}
                    setActiveComposeOps={setActiveComposeOps}
                    title="Refine your query"
                    description="Optional: add filters, sort, limit, join, summarize, or conditional columns before you run."
                  />
                  <ConnectResearchToolsSection
                    selectedCount={selectedColumns.length}
                    className="mt-6 border-t border-border/40 pt-6"
                    columnNames={selectedColumns}
                    columnTypesByName={Object.fromEntries(
                      (columns || []).map((col) => [col.name, col.type]),
                    )}
                    randomSampleEnabled={!!composeDraft.randomSampleEnabled}
                    setRandomSampleEnabled={setRandomSampleEnabled}
                    randomSampleSize={composeDraft.randomSampleSize ?? ""}
                    setRandomSampleSize={setRandomSampleSize}
                    randomSampleSeeded={composeDraft.randomSampleSeeded !== false}
                    setRandomSampleSeeded={setRandomSampleSeeded}
                    onEnableRandomSample={enableRandomSample}
                    bucketingEnabled={!!composeDraft.bucketingEnabled}
                    setBucketingEnabled={setBucketingEnabled}
                    bucketConfig={composeDraft.bucketConfig ?? null}
                    setBucketConfig={setBucketConfig}
                    onEnableBucketing={enableBucketing}
                    helperOpen={researchHelperOpen}
                    onResearchToolHelperChange={handleResearchToolHelperChange}
                    composeDraft={composeDraft}
                  />
                  <ConnectComposeOperationPanel
                    key={sampleId}
                    standalone
                    standaloneWorkspaceId={INTEGRATION_ID}
                    sampleId={sampleId}
                    columnSelections={columnSelections}
                    onColumnSelectionsChange={setColumnSelections}
                    hidePullActions
                    activeComposeOps={activeComposeOps}
                    setActiveComposeOps={setActiveComposeOps}
                    onComposeChange={handleComposeChange}
                    composeSeed={composeSeed}
                    className="mt-0"
                    panelClassName="p-3"
                  />
                </div>
              </ConnectComposeHelperLayout>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="hub-pm-sheet-name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sheet name (optional)
              </Label>
              <Input
                id="hub-pm-sheet-name"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="e.g. high_volume_markets"
                className="max-w-md"
              />
            </div>
          </>
        ) : null}

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <div
          className={cn(
            "flex justify-end border-t border-border/60 transition-[padding] duration-300 ease-out",
            density.footerPt,
            researchHelperOpen && FEATURE_HELPER_DRAWER_WIDTH_CLASS,
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              size={density.submitSize}
              className={cn("rounded-full text-sm lg:text-base", density.submitPx)}
              disabled={
                submitBusy ||
                (!connectHome && userLoading) ||
                !sampleId ||
                selectedColumns.length === 0
              }
              onClick={handleSubmit}
            >
              {submitBusy
                ? connectHome
                  ? "Running…"
                  : "Starting…"
                : !connectHome && userLoading
                  ? "Loading…"
                  : connectHome
                    ? "Run pull"
                    : "Run query"}
            </Button>
          </div>
        </div>
      </div>
      {connectHome ? demoProDialog : null}
    </>
  );
}
