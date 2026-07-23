"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  Check,
  ChevronRight,
  CloudSun,
  Database,
  Hash,
  Layers,
  LineChart,
  RefreshCw,
  Search,
  Vote,
  Wand2,
  CircleDollarSign,
} from "lucide-react";

import { KalshiPowerToolsSearch } from "@/components/connectData/KalshiPowerToolsSearch";
import { KalshiHistoricalCandlestickLiveCutoffNote } from "@/components/connectData/kalshiLive/KalshiLiveCandlestickHistoricalCutoffNote";
import { ConnectComposeOperationPanel } from "@/components/connectData/ConnectComposeOperationPanel";
import { ConnectDataOperationsSection } from "@/components/connectData/ConnectDataOperationsSection";
import { GuidedWorkflowOverlay } from "@/components/guidedWorkflow/GuidedWorkflowOverlay";
import { GuidedWorkflowActionsBridge } from "@/components/guidedWorkflow/GuidedWorkflowActionsBridge";
import { GuidedWorkflowProvider } from "@/components/guidedWorkflow/GuidedWorkflowProvider";
import { GuidedWorkflowPullResults } from "@/components/guidedWorkflow/GuidedWorkflowPullResults";
import { RunForYourselfAuthModal } from "@/components/runYourself/RunForYourselfAuthModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KALSHI_CONNECT_DATA_SOURCES } from "@/config/dataLakeParquetSamples";
import useSWR from "swr";
import { userSwrFetcher } from "@/lib/hooks";
import { getConnectDataLakeConfig } from "@/lib/connectQueryComposeConfig";
import { getKalshiConnectColumnsForSample } from "@/lib/kalshiConnectColumns";
import {
  buildHubQueryDashboardUrl,
  navigateToHubQueryDashboard,
  normalizeHubQueryDraft,
  normalizeHubQueryWhereFilters,
  hasComposeDraftPayload,
  saveHubQueryDraft,
} from "@/lib/hubs/hubQueryDraft";
import { applyHubQueryDraft } from "@/lib/hubs/applyHubQueryDraft";
import { KALSHI_GUIDED_WEATHER_WORKFLOW_ID, KALSHI_GUIDED_STEP_IDS } from "@/lib/guidedWorkflows/kalshiHistorical/stepIds";
import { inferPageNameFromPath } from "@/lib/analytics/sessionStartMeta";
import {
  KALSHI_HISTORICAL_GUIDED_WORKFLOWS,
  KALSHI_COMING_SOON_GUIDED_WORKFLOW_IDS,
  KALSHI_WORKFLOW_ICONS,
} from "@/lib/guidedWorkflows/kalshiHistorical";
import { buildGuidedSnapshot } from "@/lib/guidedWorkflows/snapshot";
import { KALSHI_GUIDED_TARGETS } from "@/lib/guidedWorkflows/targets";
import { GUIDED_TARGET_ATTR } from "@/lib/guidedWorkflows/types";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useDemoProGate } from "@/hooks/useDemoProGate";
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

const WORKFLOW_ICON_COMPONENTS = {
  RefreshCw,
  CloudSun,
  LineChart,
};

const SOURCE_GUIDED_TARGETS = {
  "athena-kal-markets": KALSHI_GUIDED_TARGETS.sourceMarkets,
  "athena-kal-trades": KALSHI_GUIDED_TARGETS.sourceTrades,
};

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

/** Tighter typography and spacing for MDX guide embeds; hub scales down between md–lg. */
function hubEmbedDensity(embedded) {
  return {
    surface: embedded
      ? "px-4 py-5 md:px-5 md:py-6"
      : "px-4 py-5 md:px-5 md:py-6 lg:px-8 lg:py-10",
    stack: embedded ? "space-y-6" : "space-y-6 lg:space-y-8",
    sectionStack: embedded ? "space-y-4" : "space-y-4 lg:space-y-5",
    gridGap: embedded ? "gap-3" : "gap-3 lg:gap-4",
    heading: embedded ? "text-base" : "text-base lg:text-lg",
    subheading: embedded ? "text-xs" : "text-xs lg:text-sm",
    footerPt: embedded ? "pt-4" : "pt-4 lg:pt-6",
    submitSize: embedded ? "default" : "default",
    submitPx: embedded ? "px-6" : "px-6 lg:px-8",
    label: embedded ? "text-[11px]" : "text-[11px] lg:text-xs",
    example: embedded ? "text-[11px]" : "text-[11px] lg:text-xs",
    exampleIcon: embedded ? "size-3" : "size-3 lg:size-3.5",
    listGap: embedded ? "space-y-1.5" : "space-y-1.5 lg:space-y-2",
  };
}

function HubStartingPointColumn({
  icon: Icon,
  title,
  badge,
  description,
  children,
  compact = false,
  id,
}) {
  return (
    <div
      id={id}
      className={cn(
        "relative flex h-full flex-col rounded-xl border border-border/70 bg-muted/15 scroll-mt-28",
        "transition-[box-shadow,ring-color] duration-300",
        "data-[guided-flash=true]:ring-2 data-[guided-flash=true]:ring-secondary data-[guided-flash=true]:ring-offset-2 data-[guided-flash=true]:ring-offset-background",
        "data-[guided-flash=true]:shadow-[0_0_0_6px_rgba(40,120,255,0.16)]",
        compact ? "p-3" : "p-3 md:p-3 lg:p-4",
      )}
    >
      <div
        className={cn(
          "space-y-2 border-b border-border/50",
          compact ? "mb-3 pb-3" : "mb-3 pb-3 lg:mb-4 lg:pb-4",
        )}
      >
        <div className={cn("flex items-start", compact ? "gap-2" : "gap-2 lg:gap-2.5")}>
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary dark:text-secondary",
              compact ? "size-7" : "size-7 lg:size-8",
            )}
          >
            <Icon className={compact ? "size-3.5" : "size-3.5 lg:size-4"} strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <span className="mb-1 inline-flex rounded-full border border-secondary/25 bg-secondary/10 px-2 py-0.5 text-[0.625rem] font-medium leading-tight text-secondary dark:text-secondary">
              {badge}
            </span>
            <h3
              className={cn(
                "font-semibold leading-snug text-foreground",
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
      <div className={cn("flex min-h-0 flex-1 flex-col", compact ? "gap-2" : "gap-3")}>{children}</div>
    </div>
  );
}

function HubKalshiSourceOption({
  source,
  isSelected,
  onSelect,
  onHover,
  onLeave,
  compact = false,
  guidedTarget,
  disableHover = false,
}) {
  const presentation = HUB_KALSHI_SOURCE_PRESENTATION[source.sampleId];
  if (!presentation) return null;

  const Icon = presentation.icon;
  const { accent } = presentation;

  return (
    <button
      type="button"
      onClick={() => onSelect(source.sampleId)}
      onMouseEnter={() => !disableHover && onHover(source.sampleId)}
      onMouseLeave={() => !disableHover && onLeave()}
      {...(guidedTarget ? { [GUIDED_TARGET_ATTR]: guidedTarget } : {})}
      className={cn(
        "group flex w-full items-center text-left transition-all duration-200 ease-out hover:translate-x-1.5",
        compact ? "gap-2 rounded-lg border p-2.5" : "gap-2 rounded-lg border p-2.5 lg:gap-3 lg:rounded-xl lg:p-3",
        hubSourceCardClasses({ isSelected, accent, isHovered: false }),
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
        <p
          className={cn(
            "mt-0.5 leading-snug text-muted-foreground",
            compact ? "text-[11px]" : "text-[11px] lg:text-xs",
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

function HubWorkflowOption({ workflow, onSelect, compact = false, comingSoon = false }) {
  const iconName = KALSHI_WORKFLOW_ICONS[workflow.id] || "RefreshCw";
  const Icon = WORKFLOW_ICON_COMPONENTS[iconName] || RefreshCw;

  return (
    <button
      type="button"
      disabled={comingSoon}
      onClick={() => {
        if (comingSoon) return;
        onSelect(workflow.id);
      }}
      {...(!comingSoon ? { [GUIDED_TARGET_ATTR]: KALSHI_GUIDED_TARGETS.workflow(workflow.id) } : {})}
      className={cn(
        "flex w-full items-center border text-left transition-all duration-200 ease-out",
        compact ? "gap-2 rounded-lg p-2.5" : "gap-2 rounded-lg p-2.5 lg:gap-3 lg:rounded-xl lg:p-3",
        comingSoon
          ? "cursor-not-allowed border-border/40 bg-muted/20 opacity-60"
          : "border-border/60 bg-background hover:translate-x-1 hover:border-border hover:bg-muted/25",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          compact ? "size-8" : "size-8 lg:size-9",
          comingSoon ? "bg-muted/40 text-muted-foreground/70" : "bg-muted/50 text-muted-foreground",
        )}
      >
        <Icon className={compact ? "size-3.5" : "size-3.5 lg:size-4"} strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "font-medium",
              compact ? "text-xs" : "text-xs lg:text-sm",
              comingSoon ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {workflow.title}
          </span>
          {comingSoon ? (
            <span className="inline-flex rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[0.625rem] font-medium leading-tight text-muted-foreground">
              Coming soon
            </span>
          ) : null}
        </span>
        <p
          className={cn(
            "mt-0.5 leading-snug",
            compact ? "text-[11px]" : "text-[11px] lg:text-xs",
            comingSoon ? "text-muted-foreground/80" : "text-muted-foreground",
          )}
        >
          {workflow.description}
        </p>
      </div>
      {!comingSoon ? (
        <ChevronRight
          className={cn("shrink-0 text-muted-foreground/70", compact ? "size-3.5" : "size-3.5 lg:size-4")}
          aria-hidden
        />
      ) : null}
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

/**
 * @param {{
 *   embedded?: boolean;
 *   mockup?: boolean;
 *   connectHome?: boolean;
 *   stepBackRef?: React.MutableRefObject<(() => boolean) | null>;
 * }} props
 * `connectHome` — dashboard / demo Kalshi Historical workspace: same starting layout,
 * but Run applies the draft in-place and triggers the existing Athena pull bridge.
 */
export function HubKalshiQueryBuilder({
  embedded = false,
  mockup = false,
  connectHome = false,
  stepBackRef,
}) {
  return (
    <HubKalshiQueryBuilderInner
      embedded={embedded}
      mockup={mockup}
      connectHome={connectHome}
      stepBackRef={stepBackRef}
    />
  );
}

function HubKalshiQueryBuilderInner({
  embedded = false,
  mockup = false,
  connectHome = false,
  stepBackRef,
}) {
  const { data: user, isLoading: userLoading } = useSWR("/api/user", userSwrFetcher);
  const isLoggedIn = !!user;
  const connectCtx = useMyStateV2();
  const {
    requestHistoricalProUpgrade,
    workspaceWriteLocked,
    dialog: demoProDialog,
  } = useDemoProGate();
  const [authOpen, setAuthOpen] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [error, setError] = useState(null);

  const [sampleId, setSampleId] = useState("");
  const [hoveredSampleId, setHoveredSampleId] = useState("");
  const [columnSelections, setColumnSelections] = useState({});
  const [activeComposeOps, setActiveComposeOps] = useState([]);
  const [composeDraft, setComposeDraft] = useState({});
  const composeDraftRef = useRef({});
  const [composeSeed, setComposeSeed] = useState(null);
  const handleComposeChange = useCallback((next) => {
    composeDraftRef.current = next;
    setComposeDraft(next);
  }, []);
  const [sheetName, setSheetName] = useState("");
  const [marketSearchInitial, setMarketSearchInitial] = useState("");
  const [marketSearchKey, setMarketSearchKey] = useState(0);
  const clearHoverTimeoutRef = useRef(null);
  const guidedActionsRef = useRef({ startWorkflow: () => {}, cancelWorkflow: () => {} });
  const pendingWorkflowIdRef = useRef(null);
  const guidedInlinePullWorkflowIdRef = useRef(null);
  const [guidedActive, setGuidedActive] = useState(false);
  const [guidedStartTick, setGuidedStartTick] = useState(0);
  const [guidedPullDraft, setGuidedPullDraft] = useState(null);
  const [guidedPostPullReady, setGuidedPostPullReady] = useState(false);

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

  const handlePowerSearchSelect = useCallback((suggestion) => {
    const id = suggestion.entity === "markets" ? "athena-kal-markets" : "athena-kal-trades";
    setSampleId(id);
    setColumnSelections((prev) => ({
      ...prev,
      [id]: prev[id] ?? [],
    }));
    setComposeSeed({
      whereFilters: [
        {
          id: genFilterId(),
          column: "ticker",
          kind: "string",
          op: "eq",
          value: suggestion.ticker,
        },
      ],
      activeComposeOps: ["where"],
    });
    setError(null);
  }, []);

  const handleStartGuidedWorkflow = useCallback((workflowId) => {
    guidedActionsRef.current.cancelWorkflow?.();
    pendingWorkflowIdRef.current = workflowId;
    setSampleId("");
    setColumnSelections({});
    setActiveComposeOps([]);
    setComposeSeed(null);
    setComposeDraft({});
    composeDraftRef.current = {};
    setSheetName("");
    setError(null);
    setGuidedStartTick((t) => t + 1);
  }, []);

  const cancelToStartingView = useCallback(() => {
    guidedInlinePullWorkflowIdRef.current = null;
    guidedActionsRef.current.cancelWorkflow?.();
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
    const sourceHubPath =
      typeof window !== "undefined" ? window.location.pathname || "" : "";
    const refDraft = composeDraftRef.current;
    const draftState = hasComposeDraftPayload(refDraft)
      ? refDraft
      : hasComposeDraftPayload(composeDraft)
        ? composeDraft
        : { ...composeDraft, ...(refDraft || {}) };
    const whereFilters = normalizeHubQueryWhereFilters(draftState.whereFilters);
    return normalizeHubQueryDraft({
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
      pendingSheetName: sheetName.trim() || undefined,
      sourceHubPath: sourceHubPath || undefined,
      sourceHubName: sourceHubPath ? inferPageNameFromPath(sourceHubPath) : undefined,
    });
  }, [sampleId, columnSelections, composeDraft, activeComposeOps, sheetName]);

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

  const handleGuidedPullComplete = useCallback(() => {
    flushSync(() => {
      setGuidedPostPullReady(true);
    });
    guidedActionsRef.current.resumePostPullStep?.(
      KALSHI_GUIDED_WEATHER_WORKFLOW_ID,
      KALSHI_GUIDED_STEP_IDS.dataSheetLoaded,
    );
  }, []);

  const runConnectHomePull = useCallback(
    (draft) => {
      if (!connectCtx) {
        setError("Workspace is not ready. Try again in a moment.");
        return;
      }
      if (workspaceWriteLocked) {
        requestHistoricalProUpgrade("Kalshi Historical");
        return;
      }
      setSubmitBusy(true);
      setError(null);
      try {
        applyHubQueryDraft(connectCtx, draft, { autoPull: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setSubmitBusy(false);
      }
    },
    [connectCtx, workspaceWriteLocked, requestHistoricalProUpgrade],
  );

  const runConnectHomeGuidedPull = useCallback(
    (draft) => {
      if (!connectCtx) {
        setError("Workspace is not ready. Try again in a moment.");
        return;
      }
      if (workspaceWriteLocked) {
        requestHistoricalProUpgrade("Kalshi Historical");
        return;
      }
      setSubmitBusy(true);
      setError(null);
      try {
        guidedActionsRef.current.suppressRunQueryAdvance?.();
        flushSync(() => {
          connectCtx.setConnectHomeGuidedSession?.({
            workflowId: KALSHI_GUIDED_WEATHER_WORKFLOW_ID,
            resumeStepId: KALSHI_GUIDED_STEP_IDS.dataSheetLoaded,
          });
          connectCtx.setGuidedWorkflowPull?.(true);
          applyHubQueryDraft(connectCtx, draft, { autoPull: true });
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        connectCtx.setConnectHomeGuidedSession?.(null);
        connectCtx.setGuidedWorkflowPull?.(false);
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
      setError("Select Markets or Trades and at least one column.");
      return;
    }

    const useGuidedInlinePull =
      guidedInlinePullWorkflowIdRef.current === KALSHI_GUIDED_WEATHER_WORKFLOW_ID;

    if (useGuidedInlinePull) {
      guidedInlinePullWorkflowIdRef.current = null;

      // Dashboard / demo connect-home: pull into the real full-screen sheet (no nested DashBody).
      if (connectHome) {
        runConnectHomeGuidedPull(draft);
        setError(null);
        return;
      }

      guidedActionsRef.current.suppressRunQueryAdvance?.();
      setGuidedPostPullReady(false);
      flushSync(() => {
        setGuidedPullDraft({
          ...draft,
          guidedWorkflowId: KALSHI_GUIDED_WEATHER_WORKFLOW_ID,
        });
      });
      setError(null);
      return;
    }

    if (connectHome) {
      runConnectHomePull(draft);
      return;
    }

    saveHubQueryDraft(draft);

    if (isLoggedIn) {
      void continueToDashboard();
      return;
    }

    setAuthOpen(true);
  }, [
    buildDraft,
    userLoading,
    isLoggedIn,
    continueToDashboard,
    connectHome,
    runConnectHomePull,
    runConnectHomeGuidedPull,
  ]);

  const density = hubEmbedDensity(embedded || connectHome);

  const guidedSnapshot = useMemo(
    () =>
      buildGuidedSnapshot({
        sampleId,
        columnSelections,
        activeComposeOps,
        composeDraft,
        sheetName,
      }),
    [sampleId, columnSelections, activeComposeOps, composeDraft, sheetName],
  );

  return (
    <GuidedWorkflowProvider snapshot={guidedSnapshot}>
      <GuidedWorkflowActionsBridge
        actionsRef={guidedActionsRef}
        pendingWorkflowIdRef={pendingWorkflowIdRef}
        inlinePullWorkflowIdRef={guidedInlinePullWorkflowIdRef}
        onActiveChange={setGuidedActive}
        startAfterTick={guidedStartTick}
      />
      <GuidedWorkflowOverlay
        suspended={!!guidedPullDraft && !guidedPostPullReady}
        hideUpgradeCta={connectHome && isLoggedIn}
      />
    {guidedPullDraft ? (
      <GuidedWorkflowPullResults
        draft={guidedPullDraft}
        embedded={embedded}
        mockup={mockup}
        connectHome={connectHome}
        onPullComplete={handleGuidedPullComplete}
      />
    ) : (
    <>
      <div
        className={cn(
          "relative z-20 w-full font-sans",
          density.stack,
          connectHome
            ? null
            : mockup || embedded
              ? cn("bg-background", density.surface)
              : cn("border-y border-border bg-background", density.surface),
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
              <KalshiHistoricalCandlestickLiveCutoffNote className="pt-0.5" />
            </div>

            <div className={cn("grid grid-cols-1 items-stretch sm:grid-cols-3", density.gridGap)}>
              <div className="min-w-0">
                <HubStartingPointColumn
                  icon={Database}
                  title="Browse raw historical data"
                  badge="Best for discovery"
                  description="Choose a dataset first, then filter, select columns, and query the exact rows you need."
                  compact={embedded || connectHome}
                >
                  <p className={cn("font-medium text-muted-foreground", density.label)}>
                    Choose a data source
                  </p>
                  <div className={density.listGap}>
                    {KALSHI_CONNECT_DATA_SOURCES.map((source) => (
                      <HubKalshiSourceOption
                        key={source.sampleId}
                        source={source}
                        isSelected={sampleId === source.sampleId}
                        onSelect={handleSelectSource}
                        onHover={handleSourceHover}
                        onLeave={handleSourceLeave}
                        compact={embedded || connectHome}
                        guidedTarget={SOURCE_GUIDED_TARGETS[source.sampleId]}
                        disableHover={guidedActive}
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
                    hoveredSampleId && !guidedActive
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
                    compact={embedded || connectHome}
                  >
                    <p className={cn("font-medium text-muted-foreground", density.label)}>
                      Search
                    </p>
                    <KalshiPowerToolsSearch
                      key={marketSearchKey}
                      variant="embedded"
                      initialQuery={marketSearchInitial}
                      onSelect={handlePowerSearchSelect}
                      inputClassName={
                        embedded || connectHome
                          ? "h-9 rounded-lg pl-9 pr-12 text-xs"
                          : "h-9 rounded-lg pl-9 pr-12 text-xs lg:h-11 lg:text-sm"
                      }
                    />
                    <div className={density.listGap}>
                      <p className={cn("font-medium text-muted-foreground", density.label)}>
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

                  <HubStartingPointColumn
                    id="kalshi-guided-workflows"
                    icon={Wand2}
                    title="Use a guided workflow"
                    badge="Best for guided setup"
                    description="Follow a step-by-step guided walkthrough for common Kalshi historical data tasks."
                    compact={embedded || connectHome}
                  >
                    <div className={density.listGap}>
                      {KALSHI_HISTORICAL_GUIDED_WORKFLOWS.map((workflow) => (
                        <HubWorkflowOption
                          key={workflow.id}
                          workflow={workflow}
                          onSelect={handleStartGuidedWorkflow}
                          compact={embedded || connectHome}
                          comingSoon={KALSHI_COMING_SOON_GUIDED_WORKFLOW_IDS.has(workflow.id)}
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
                      compact={embedded || connectHome}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {sampleId ? (
          <>
            <div
              className="space-y-2"
              {...{ [GUIDED_TARGET_ATTR]: KALSHI_GUIDED_TARGETS.columnsPanel }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-xs font-semibold tracking-tight text-foreground">
                  {`What data parameters are you interested in pulling for your ${
                    KALSHI_CONNECT_DATA_SOURCES.find((s) => s.sampleId === sampleId)?.title ||
                    sampleId
                  }`}
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
                    onClick={cancelToStartingView}
                    {...{ [GUIDED_TARGET_ATTR]: KALSHI_GUIDED_TARGETS.cancel }}
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
                        {...{ [GUIDED_TARGET_ATTR]: KALSHI_GUIDED_TARGETS.column(col.name) }}
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

            {selectedColumns.length > 0 ? (
              <div
                className="space-y-0"
                {...{ [GUIDED_TARGET_ATTR]: KALSHI_GUIDED_TARGETS.composePanel }}
              >
                <ConnectDataOperationsSection
                  selectedCount={selectedColumns.length}
                  className={cn("mt-0 border-t-0 pt-0", embedded && "mt-0")}
                  activeComposeOps={activeComposeOps}
                  setActiveComposeOps={setActiveComposeOps}
                  title="Refine your query"
                  description="Optional: add filters, sort, limit, join, summarize, or conditional columns before you run."
                />
                <ConnectComposeOperationPanel
                  key={sampleId}
                  standalone
                  sampleId={sampleId}
                  columnSelections={columnSelections}
                  hidePullActions
                  activeComposeOps={activeComposeOps}
                  setActiveComposeOps={setActiveComposeOps}
                  onComposeChange={handleComposeChange}
                  composeSeed={composeSeed}
                  className="mt-0"
                  panelClassName={embedded || connectHome ? "p-3" : "p-3 lg:p-4"}
                />
              </div>
            ) : null}

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
                {...{ [GUIDED_TARGET_ATTR]: KALSHI_GUIDED_TARGETS.sheetName }}
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
              className={cn("rounded-full text-sm lg:text-base", density.submitPx)}
              disabled={
                submitBusy ||
                (!connectHome && userLoading) ||
                !sampleId ||
                selectedColumns.length === 0
              }
              onClick={handleSubmit}
              {...{ [GUIDED_TARGET_ATTR]: KALSHI_GUIDED_TARGETS.runQuery }}
            >
              {submitBusy
                ? connectHome
                  ? "Running…"
                  : "Starting…"
                : !connectHome && userLoading
                  ? "Loading…"
                  : connectHome
                    ? "Run pull"
                    : isLoggedIn
                      ? "Run query"
                      : "Run for Free"}
            </Button>
            {!connectHome && !isLoggedIn ? (
              <p className={cn("text-muted-foreground", embedded ? "text-[11px]" : "text-xs")}>
                No credit card required
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {!connectHome ? (
        <RunForYourselfAuthModal
          open={authOpen}
          onOpenChange={setAuthOpen}
          onAuthenticated={() => void continueToDashboard()}
        />
      ) : null}
      {connectHome ? demoProDialog : null}
    </>
    )}
    </GuidedWorkflowProvider>
  );
}
