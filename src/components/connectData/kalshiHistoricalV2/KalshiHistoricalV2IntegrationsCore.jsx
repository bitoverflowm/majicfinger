"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CandlestickChart, Layers, LineChart, List, Wand2 } from "lucide-react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { useKalshiHistoricalCutoffDisplay } from "@/hooks/useKalshiHistoricalCutoffDisplay";
import { KALSHI_HISTORICAL_V2_CONNECT_ENDPOINTS, KALSHI_HISTORICAL_V2_CONNECT_CONFIG } from "@/config/kalshiHistoricalV2Connect";
import { ConnectDataOperationsSection } from "@/components/connectData/ConnectDataOperationsSection";
import { ColumnPicker } from "@/components/connectData/ConnectHomeIntegrationWorkflow";
import { KalshiLiveComposeOperationPanel } from "@/components/connectData/kalshiLive/KalshiLiveComposeOperationPanel";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CONNECT_COMPOSE_OPERATIONS } from "@/lib/connectComposeOperations";
import { getKalshiLiveComposeOperationIds } from "@/config/kalshiLiveConnect";
import { KalshiHistoricalV2MarketsTickersField } from "@/components/connectData/kalshiHistoricalV2/KalshiHistoricalV2MarketsTickersField";
import { KalshiHistoricalV2TradesFields } from "@/components/connectData/kalshiHistoricalV2/KalshiHistoricalV2TradesFields";
import {
  KALSHI_HISTORICAL_V2_TRADES_DEFAULT_LIMIT,
  KALSHI_HISTORICAL_V2_TRADES_ROW_LIMIT_MAX,
} from "@/lib/kalshiHistoricalV2/historicalTradesCompose";
import { Label } from "@/components/ui/label";

const SOURCE_PRESENTATION = {
  markets: { icon: Layers, accent: "secondary" },
  trades: { icon: LineChart, accent: "secondary" },
  candlesticks: { icon: CandlestickChart, accent: "emerald" },
};

/** Placeholder guided workflows — not launchable yet. */
const COMING_SOON_WORKFLOWS = [
  {
    id: "historical-market-snapshot",
    title: "Historical market snapshot",
    description: "Pull settled market metadata and last prices before the live cutoff.",
    icon: Layers,
  },
  {
    id: "historical-trades-for-market",
    title: "Historical trades for a market",
    description: "Load completed trades for one market ticker up to the cutoff.",
    icon: LineChart,
  },
  {
    id: "historical-candlestick-ohlc",
    title: "Historical candlestick OHLC",
    description: "Fetch price candles for one or more tickers before the live cutoff.",
    icon: CandlestickChart,
  },
  {
    id: "historical-series-browse",
    title: "Browse historical series",
    description: "Explore series and markets that settled before the live cutoff.",
    icon: List,
  },
];

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
            {description ? (
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2">{children}</div>
    </div>
  );
}

function SourceOption({ endpoint, isSelected, onSelect, disabled }) {
  const presentation = SOURCE_PRESENTATION[endpoint.id] || {
    icon: Layers,
    accent: "secondary",
  };
  const Icon = presentation.icon;
  const { accent } = presentation;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onSelect(endpoint.id);
      }}
      className={cn(
        "group flex w-full items-center gap-2 rounded-lg border p-2.5 text-left transition-all duration-200 ease-out hover:translate-x-1.5",
        hubSourceCardClasses({ isSelected, accent }),
        disabled && "cursor-not-allowed opacity-60 hover:translate-x-0",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          hubSourceIconClasses({ accent }),
        )}
      >
        <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-foreground">{endpoint.title}</span>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {endpoint.description}
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
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/80">
          {workflow.description}
        </p>
      </div>
    </button>
  );
}

function GoToKalshiLiveCutoffNote({ className }) {
  const ctx = useMyStateV2() ?? {};
  const { requestConnectWorkspace, setIntegrationSidebar, setRightPanelTab } = ctx;
  const { cutoffLabel, loading } = useKalshiHistoricalCutoffDisplay();

  const goToKalshiLive = useCallback(() => {
    setRightPanelTab?.("integrations");
    setIntegrationSidebar?.("kalshiLive");
    requestConnectWorkspace?.("kalshiLive");
  }, [requestConnectWorkspace, setIntegrationSidebar, setRightPanelTab]);

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Skeleton className="h-4 w-[14rem] bg-muted-foreground/20" />
      </div>
    );
  }

  const datePart = cutoffLabel || "…";

  return (
    <p className={cn("text-[11px] leading-snug text-muted-foreground", className)}>
      If you want data after{" "}
      <span className="font-medium text-foreground">{datePart}</span> go to{" "}
      <button
        type="button"
        onClick={goToKalshiLive}
        className="font-medium text-secondary underline underline-offset-2 hover:text-secondary/80"
      >
        Kalshi Live Data Feed
      </button>
    </p>
  );
}

/**
 * Kalshi Historical v2 compose shell — Live-style 3-column layout.
 *
 * @param {{
 *   className?: string;
 *   stepBackRef?: { current?: (() => boolean) | null };
 *   onRunPull?: () => void;
 * }} props
 */
export function KalshiHistoricalV2IntegrationsCore({ className, stepBackRef, onRunPull }) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectKalshiLiveEndpointId = "",
    setConnectKalshiLiveEndpointId,
    connectKalshiLiveColumnSelections = {},
    setConnectKalshiLiveColumnSelections,
    connectKalshiLiveTickers = "",
    setConnectKalshiLiveTickers,
    setConnectKalshiLiveMarketsTickerMeta,
    setConnectKalshiLiveWhereFilters,
    setConnectKalshiLiveSortClauses,
    setConnectActiveComposeOps,
    connectDataLakePullState,
    setConnectKalshiLiveMarketsSheetMode,
    setConnectKalshiLiveMarketsDiscoveryMode,
    setConnectKalshiLiveMarketsDiscoveryStatus,
    setConnectKalshiLiveMarketsDiscoveryMveFilter,
    setConnectKalshiLiveMarketsDiscoveryEventTicker,
    setConnectKalshiLiveMarketsDiscoverySeriesTicker,
    setConnectKalshiLiveMarketsDiscoveryTickers,
    setConnectKalshiLiveMarketsDiscoveryMinCreatedTs,
    setConnectKalshiLiveMarketsDiscoveryMaxCreatedTs,
    setConnectKalshiLiveMarketsDiscoveryMinUpdatedTs,
    setConnectKalshiLiveMarketsDiscoveryMinCloseTs,
    setConnectKalshiLiveMarketsDiscoveryMaxCloseTs,
    setConnectKalshiLiveMarketsDiscoveryMinSettledTs,
    setConnectKalshiLiveMarketsDiscoveryMaxSettledTs,
    setConnectKalshiHistoricalV2MarketsDiscoveryScope,
    setConnectKalshiLiveTradesTicker,
    setConnectKalshiLiveTradesTickerMeta,
    setConnectKalshiLiveLimit,
    setConnectKalshiHistoricalV2TradesIncludeBlockTrades,
  } = ctx;

  const selectedId = connectKalshiLiveEndpointId;
  const pullLoading = !!connectDataLakePullState?.loading;
  const [filterError, setFilterError] = useState(null);

  const handleClearEndpoint = useCallback(() => {
    setConnectKalshiLiveEndpointId?.("");
    setConnectActiveComposeOps?.([]);
    setConnectKalshiLiveWhereFilters?.([]);
    setConnectKalshiLiveSortClauses?.([]);

    setConnectKalshiLiveTickers?.("");
    setConnectKalshiLiveMarketsTickerMeta?.({});
    setConnectKalshiLiveMarketsSheetMode?.("per_market");

    setConnectKalshiLiveMarketsDiscoveryMode?.(false);
    setConnectKalshiLiveMarketsDiscoveryStatus?.("");
    setConnectKalshiLiveMarketsDiscoveryMveFilter?.("include");
    setConnectKalshiLiveMarketsDiscoveryEventTicker?.("");
    setConnectKalshiLiveMarketsDiscoverySeriesTicker?.("");
    setConnectKalshiLiveMarketsDiscoveryTickers?.("");
    setConnectKalshiLiveMarketsDiscoveryMinCreatedTs?.("");
    setConnectKalshiLiveMarketsDiscoveryMaxCreatedTs?.("");
    setConnectKalshiLiveMarketsDiscoveryMinUpdatedTs?.("");
    setConnectKalshiLiveMarketsDiscoveryMinCloseTs?.("");
    setConnectKalshiLiveMarketsDiscoveryMaxCloseTs?.("");
    setConnectKalshiLiveMarketsDiscoveryMinSettledTs?.("");
    setConnectKalshiLiveMarketsDiscoveryMaxSettledTs?.("");
    setConnectKalshiHistoricalV2MarketsDiscoveryScope?.("event");
    setConnectKalshiLiveTradesTicker?.("");
    setConnectKalshiLiveTradesTickerMeta?.({});
    setConnectKalshiHistoricalV2TradesIncludeBlockTrades?.(true);

    setFilterError(null);
  }, [
    setConnectKalshiLiveEndpointId,
    setConnectActiveComposeOps,
    setConnectKalshiLiveWhereFilters,
    setConnectKalshiLiveSortClauses,
    setConnectKalshiLiveTickers,
    setConnectKalshiLiveMarketsTickerMeta,
    setConnectKalshiLiveMarketsSheetMode,
    setConnectKalshiLiveMarketsDiscoveryMode,
    setConnectKalshiLiveMarketsDiscoveryStatus,
    setConnectKalshiLiveMarketsDiscoveryMveFilter,
    setConnectKalshiLiveMarketsDiscoveryEventTicker,
    setConnectKalshiLiveMarketsDiscoverySeriesTicker,
    setConnectKalshiLiveMarketsDiscoveryTickers,
    setConnectKalshiLiveMarketsDiscoveryMinCreatedTs,
    setConnectKalshiLiveMarketsDiscoveryMaxCreatedTs,
    setConnectKalshiLiveMarketsDiscoveryMinUpdatedTs,
    setConnectKalshiLiveMarketsDiscoveryMinCloseTs,
    setConnectKalshiLiveMarketsDiscoveryMaxCloseTs,
    setConnectKalshiLiveMarketsDiscoveryMinSettledTs,
    setConnectKalshiLiveMarketsDiscoveryMaxSettledTs,
    setConnectKalshiHistoricalV2MarketsDiscoveryScope,
    setConnectKalshiLiveTradesTicker,
    setConnectKalshiLiveTradesTickerMeta,
    setConnectKalshiHistoricalV2TradesIncludeBlockTrades,
  ]);

  const handleSelectEndpoint = useCallback(
    (endpointId) => {
      if (endpointId !== "markets" && endpointId !== "trades") return;
      setConnectKalshiLiveEndpointId?.(endpointId);
      setConnectActiveComposeOps?.([]);
      setConnectKalshiLiveWhereFilters?.([]);
      setConnectKalshiLiveSortClauses?.([]);

      setConnectKalshiLiveTickers?.("");
      setConnectKalshiLiveMarketsTickerMeta?.({});
      setConnectKalshiLiveMarketsSheetMode?.("per_market");

      setConnectKalshiLiveMarketsDiscoveryMode?.(endpointId === "markets");
      setConnectKalshiLiveMarketsDiscoveryStatus?.("");
      setConnectKalshiLiveMarketsDiscoveryMveFilter?.("include");
      setConnectKalshiLiveMarketsDiscoveryEventTicker?.("");
      setConnectKalshiLiveMarketsDiscoverySeriesTicker?.("");
      setConnectKalshiLiveMarketsDiscoveryTickers?.("");
      setConnectKalshiLiveMarketsDiscoveryMinCreatedTs?.("");
      setConnectKalshiLiveMarketsDiscoveryMaxCreatedTs?.("");
      setConnectKalshiLiveMarketsDiscoveryMinUpdatedTs?.("");
      setConnectKalshiLiveMarketsDiscoveryMinCloseTs?.("");
      setConnectKalshiLiveMarketsDiscoveryMaxCloseTs?.("");
      setConnectKalshiLiveMarketsDiscoveryMinSettledTs?.("");
      setConnectKalshiLiveMarketsDiscoveryMaxSettledTs?.("");
      setConnectKalshiHistoricalV2MarketsDiscoveryScope?.("event");

      setConnectKalshiLiveTradesTicker?.("");
      setConnectKalshiLiveTradesTickerMeta?.({});
      setConnectKalshiHistoricalV2TradesIncludeBlockTrades?.(true);
      if (endpointId === "trades") {
        setConnectKalshiLiveLimit?.(KALSHI_HISTORICAL_V2_TRADES_DEFAULT_LIMIT);
      }

      setFilterError(null);
    },
    [
      setConnectKalshiLiveEndpointId,
      setConnectActiveComposeOps,
      setConnectKalshiLiveWhereFilters,
      setConnectKalshiLiveSortClauses,
      setConnectKalshiLiveTickers,
      setConnectKalshiLiveMarketsTickerMeta,
      setConnectKalshiLiveMarketsSheetMode,
      setConnectKalshiLiveMarketsDiscoveryMode,
      setConnectKalshiLiveMarketsDiscoveryStatus,
      setConnectKalshiLiveMarketsDiscoveryMveFilter,
      setConnectKalshiLiveMarketsDiscoveryEventTicker,
      setConnectKalshiLiveMarketsDiscoverySeriesTicker,
      setConnectKalshiLiveMarketsDiscoveryTickers,
      setConnectKalshiLiveMarketsDiscoveryMinCreatedTs,
      setConnectKalshiLiveMarketsDiscoveryMaxCreatedTs,
      setConnectKalshiLiveMarketsDiscoveryMinUpdatedTs,
      setConnectKalshiLiveMarketsDiscoveryMinCloseTs,
      setConnectKalshiLiveMarketsDiscoveryMaxCloseTs,
      setConnectKalshiLiveMarketsDiscoveryMinSettledTs,
      setConnectKalshiLiveMarketsDiscoveryMaxSettledTs,
      setConnectKalshiHistoricalV2MarketsDiscoveryScope,
      setConnectKalshiLiveTradesTicker,
      setConnectKalshiLiveTradesTickerMeta,
      setConnectKalshiHistoricalV2TradesIncludeBlockTrades,
      setConnectKalshiLiveLimit,
    ],
  );

  // Only Markets + Trades are live for Historical v2 — clear stale selections.
  useEffect(() => {
    if (selectedId && selectedId !== "markets" && selectedId !== "trades") {
      handleClearEndpoint();
    }
  }, [selectedId, handleClearEndpoint]);

  useEffect(() => {
    if (!stepBackRef) return undefined;
    stepBackRef.current = () => {
      if (!selectedId) return false;
      handleClearEndpoint();
      return true;
    };
    return () => {
      stepBackRef.current = null;
    };
  }, [stepBackRef, selectedId, handleClearEndpoint]);

  const selectedColumns = selectedId ? connectKalshiLiveColumnSelections?.[selectedId] || [] : [];

  const patchColumns = useCallback(
    (endpointId, fn) => {
      setConnectKalshiLiveColumnSelections?.((prev) => ({
        ...(prev || {}),
        [endpointId]: fn((prev || {})?.[endpointId] || []),
      }));
    },
    [setConnectKalshiLiveColumnSelections],
  );

  const composeOperations = useMemo(() => {
    const allowed = new Set(getKalshiLiveComposeOperationIds(selectedId || "markets"));
    return CONNECT_COMPOSE_OPERATIONS.filter((o) => allowed.has(o.id)).map((o) => {
      if (o.id !== "row_limit") return o;
      if (selectedId === "trades") {
        return {
          ...o,
          description:
            "Max trades to pull (per market when tickers are set). Default paginates until exhausted or this cap. Unscoped pulls (no ticker/dates) are capped at 1,000.",
        };
      }
      return {
        ...o,
        description: "limit how many markets you would like to pull (e.g. 1000 rows)",
      };
    });
  }, [selectedId]);

  const getDisplayLabel = useMemo(() => {
    return (col) =>
      KALSHI_HISTORICAL_V2_CONNECT_CONFIG.getColumnDisplayLabel(selectedId || "markets", col);
  }, [selectedId]);

  const endpointColumns = selectedId
    ? KALSHI_HISTORICAL_V2_CONNECT_CONFIG.getColumnsForEndpoint(selectedId)
    : [];

  const showHub = selectedId !== "markets" && selectedId !== "trades";
  const sourceTitle = selectedId === "trades" ? "Trades" : "Markets";

  return (
    <div className={cn("space-y-3", className)}>
      {showHub ? (
        <>
          <GoToKalshiLiveCutoffNote />

          <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-3">
            <HubStartingPointColumn
              icon={Layers}
              title="Kalshi Historical Data v2"
              badge="Up to live cutoff"
              description="Choose Markets or Trades. Candlesticks coming soon."
            >
              <div className="space-y-1.5">
                {KALSHI_HISTORICAL_V2_CONNECT_ENDPOINTS.map((endpoint) => (
                  <SourceOption
                    key={endpoint.id}
                    endpoint={endpoint}
                    isSelected={selectedId === endpoint.id}
                    disabled={endpoint.id !== "markets" && endpoint.id !== "trades"}
                    onSelect={handleSelectEndpoint}
                  />
                ))}
              </div>
            </HubStartingPointColumn>

            <div
              className="relative flex min-h-[12rem] flex-col rounded-xl border border-border/70 bg-muted/15 p-3"
              aria-hidden
            />

            <HubStartingPointColumn
              id="kalshi-historical-v2-guided-workflows"
              icon={Wand2}
              title="Use a guided workflow"
              badge="Best for guided setup"
              description="Follow a step-by-step walkthrough for common historical data tasks."
            >
              <div className="space-y-1.5">
                {COMING_SOON_WORKFLOWS.map((workflow) => (
                  <ComingSoonWorkflowOption key={workflow.id} workflow={workflow} />
                ))}
              </div>
            </HubStartingPointColumn>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <GoToKalshiLiveCutoffNote />

          <div className="min-w-0">
            <Label className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
              Source
            </Label>
            <p className="text-sm font-semibold tracking-tight text-foreground">{sourceTitle}</p>
          </div>

          {selectedId === "trades" ? (
            <KalshiHistoricalV2TradesFields className="mt-4" disabled={pullLoading} />
          ) : (
            <KalshiHistoricalV2MarketsTickersField
              className="mt-4"
              value={connectKalshiLiveTickers}
              onChange={(v) => setConnectKalshiLiveTickers?.(v)}
              disabled={pullLoading}
            />
          )}

          <ColumnPicker
            key={`kalshi-historical-v2:${selectedId}:${selectedColumns.length}`}
            sourceId={selectedId}
            sourceName={sourceTitle}
            columns={endpointColumns}
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
              patchColumns(selectedId, () => endpointColumns.map((c) => c.name))
            }
            onDeselectAll={() => patchColumns(selectedId, () => [])}
            showComposeOperations={false}
          >
            <ConnectDataOperationsSection selectedCount={selectedColumns.length} operations={composeOperations} />
            <KalshiLiveComposeOperationPanel
              endpointId={selectedId}
              onRunPull={() => onRunPull?.()}
              filterError={filterError}
              setFilterError={setFilterError}
              rowLimitMaxOverride={
                selectedId === "trades" ? KALSHI_HISTORICAL_V2_TRADES_ROW_LIMIT_MAX : undefined
              }
            />
          </ColumnPicker>
        </div>
      )}
    </div>
  );
}
