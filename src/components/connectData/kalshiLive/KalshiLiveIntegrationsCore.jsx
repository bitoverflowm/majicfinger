"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { KalshiLiveConnectionStatusDot } from "@/components/connectData/KalshiLiveConnectionStatusDot";
import { KalshiLivePowerToolsSearch } from "@/components/connectData/KalshiLivePowerToolsSearch";
import { ConnectDataOperationsSection } from "@/components/connectData/ConnectDataOperationsSection";
import {
  ColumnHoverPreview,
  ColumnPicker,
  HOVER_PREVIEW_SLOT_CLASS,
} from "@/components/connectData/ConnectHomeIntegrationWorkflow";
import { KalshiLiveCandlestickTickersField } from "@/components/connectData/kalshiLive/KalshiLiveCandlestickTickersField";
import { KalshiLiveComposeOperationPanel } from "@/components/connectData/kalshiLive/KalshiLiveComposeOperationPanel";
import { Button } from "@/components/ui/button";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  KALSHI_LIVE_CONNECT_CONFIG,
  getKalshiLiveComposeOperationIds,
} from "@/config/kalshiLiveConnect";
import { CONNECT_COMPOSE_OPERATIONS } from "@/lib/connectComposeOperations";
import {
  applyKalshiLivePowerSearchSelection,
  applyKalshiLiveSeriesPowerSearchSelection,
} from "@/lib/kalshiLivePowerSearchPull";
import { useDemoProGate } from "@/hooks/useDemoProGate";
import { cn } from "@/lib/utils";

/**
 * Kalshi Live compose UI — mirrors Kalshi Historical (DataLakeSourceCards + ColumnPicker + refine ops).
 */
export function KalshiLiveIntegrationsCore({ onRunPull, className }) {
  const ctx = useMyStateV2() ?? {};
  const { workspaceWriteLocked, requestProUpgrade, dialog: demoProDialog } = useDemoProGate();

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
    connectKalshiLiveWhereFilters = [],
    setConnectKalshiLiveWhereFilters,
    connectKalshiLiveSortClauses = [],
    setConnectKalshiLiveSortClauses,
    connectKalshiLiveCandlestickTickers = "",
    setConnectKalshiLiveCandlestickTickers,
    setConnectActiveComposeOps,
    kalshiLivePingState = "idle",
    pingKalshiLiveExchange,
    connectDataLakePullState,
  } = ctx;

  const [hoveredEndpointId, setHoveredEndpointId] = useState(null);
  const [filterError, setFilterError] = useState(null);

  const endpoints = KALSHI_LIVE_CONNECT_CONFIG.endpoints;
  const selectedId = connectKalshiLiveEndpointId;
  const selectedColumns = connectKalshiLiveColumnSelections[selectedId] || [];
  const pullLoading = !!connectDataLakePullState?.loading;

  const composeOperations = useMemo(() => {
    const allowed = new Set(getKalshiLiveComposeOperationIds(selectedId));
    return CONNECT_COMPOSE_OPERATIONS.filter((o) => allowed.has(o.id));
  }, [selectedId]);

  const showHoverPreview = !!hoveredEndpointId && (!selectedId || hoveredEndpointId !== selectedId);
  const hidePowerToolsForExplore =
    hoveredEndpointId === "candlesticks" && !selectedId;

  useEffect(() => {
    if (kalshiLivePingState !== "idle") return;
    pingKalshiLiveExchange?.();
  }, [kalshiLivePingState, pingKalshiLiveExchange]);

  const handleSelectEndpoint = useCallback(
    (id) => {
      setConnectKalshiLiveEndpointId?.(id);
      setConnectActiveComposeOps?.([]);
      setConnectKalshiLiveWhereFilters?.([]);
      setConnectKalshiLiveSortClauses?.([]);
      if (id !== "candlesticks") setConnectKalshiLiveCandlestickTickers?.("");
      setFilterError(null);
      if (kalshiLivePingState === "idle") pingKalshiLiveExchange?.();
    },
    [
      setConnectKalshiLiveEndpointId,
      setConnectActiveComposeOps,
      setConnectKalshiLiveWhereFilters,
      setConnectKalshiLiveSortClauses,
      setConnectKalshiLiveCandlestickTickers,
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
    setFilterError(null);
  }, [
    setConnectKalshiLiveEndpointId,
    setConnectActiveComposeOps,
    setConnectKalshiLiveWhereFilters,
    setConnectKalshiLiveSortClauses,
    setConnectKalshiLiveCandlestickTickers,
  ]);

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

  const getDisplayLabel = useCallback(
    (col) => KALSHI_LIVE_CONNECT_CONFIG.getColumnDisplayLabel(selectedId, col),
    [selectedId],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className={cn("space-y-3", selectedId ? "mt-5" : "mt-8")}>
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Pick one</h2>
          <div className="mt-0.5 flex items-center justify-between gap-3">
            <p className="text-[11px] leading-snug text-muted-foreground">
              Then pick columns and optional filters, sort, or limits below
            </p>
            {selectedId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearEndpoint}
                className="h-auto shrink-0 px-0 py-0 text-[11px] font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-3" onMouseLeave={() => setHoveredEndpointId(null)}>
          <motion.div
            layout
            className={cn("grid gap-3", selectedId ? "grid-cols-1" : "sm:grid-cols-2")}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {endpoints
                .filter((ep) => !selectedId || selectedId === ep.id)
                .map((ep) => {
                  const isSelected = selectedId === ep.id;
                  const isHovered = hoveredEndpointId === ep.id;
                  return (
                    <motion.div
                      key={ep.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      onMouseEnter={() => setHoveredEndpointId(ep.id)}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectEndpoint(ep.id)}
                        className={cn(
                          "relative flex w-full min-h-[5.5rem] flex-col rounded-xl border p-4 text-left transition-all duration-200",
                          isSelected
                            ? "border-primary bg-muted/40 shadow-sm ring-2 ring-primary/25"
                            : isHovered
                              ? "border-border bg-muted/25 shadow-md"
                              : "border-border/60 bg-card hover:border-border hover:bg-muted/25 hover:shadow-md",
                        )}
                      >
                        {isSelected ? (
                          <KalshiLiveConnectionStatusDot
                            state={kalshiLivePingState}
                            size="sm"
                            className="absolute right-3 top-3"
                          />
                        ) : null}
                        <span className="pr-6 text-sm font-semibold tracking-tight text-foreground">
                          {ep.title}
                        </span>
                        <span className="mt-1 text-xs leading-snug text-muted-foreground">
                          {ep.description}
                        </span>
                      </button>
                    </motion.div>
                  );
                })}
            </AnimatePresence>
          </motion.div>

          <AnimatePresence initial={false}>
            {!selectedId ? (
              <motion.div
                key="kalshi-live-explore"
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
                aria-live="polite"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {showHoverPreview ? (
                    <motion.div
                      key="hover-preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className={cn("relative", HOVER_PREVIEW_SLOT_CLASS)}
                    >
                      <ColumnHoverPreview
                        columns={KALSHI_LIVE_CONNECT_CONFIG.getColumnsForEndpoint(hoveredEndpointId)}
                        getDisplayLabel={(col) =>
                          KALSHI_LIVE_CONNECT_CONFIG.getColumnDisplayLabel(hoveredEndpointId, col)
                        }
                        className="absolute inset-0"
                      />
                    </motion.div>
                  ) : hidePowerToolsForExplore ? null : (
                    <motion.div
                      key="power-tools"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <KalshiLivePowerToolsSearch
                        onSelectMarket={handlePowerSearchMarket}
                        onSelectSeries={handlePowerSearchSeries}
                        disabled={pullLoading}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {selectedId ? (
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
                {selectedId === "candlesticks" ? (
                  <KalshiLiveCandlestickTickersField
                    className="mb-3"
                    value={connectKalshiLiveCandlestickTickers}
                    onChange={(v) => setConnectKalshiLiveCandlestickTickers?.(v)}
                    disabled={pullLoading}
                  />
                ) : null}
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
            ) : null}
          </AnimatePresence>
        </div>
      </div>
      {demoProDialog}
    </div>
  );
}
