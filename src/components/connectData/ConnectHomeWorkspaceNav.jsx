"use client";

import { useCallback, useMemo } from "react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";

const chipBase =
  "relative cursor-pointer rounded px-[0.3rem] py-[0.2rem] font-mono font-semibold transition-colors";
const chipIdle = "bg-yellow-200/30 hover:bg-lychee_blue/80 hover:text-lychee_white";
const chipActive = "bg-lychee_blue/30 text-foreground";

const actionChipBase =
  "relative cursor-pointer rounded px-[0.35rem] py-[0.2rem] font-mono font-semibold leading-none transition-colors whitespace-nowrap";

/**
 * Connect home — sheet/chart tabs on the left; new sheet/chart/dashboard + export on the right.
 */
export function ConnectHomeWorkspaceNav({ className, compact = false }) {
  const ctx = useMyStateV2();
  const dataSheets = ctx?.dataSheets || {};
  const chartSheets = ctx?.chartSheets || {};
  const activeSheetId = ctx?.activeSheetId;
  const activeChartSheetId = ctx?.activeChartSheetId;
  const rightPanelTab = ctx?.rightPanelTab ?? "";
  const rightPanelOpen = !!ctx?.rightPanelOpen;
  const setActiveSheetId = ctx?.setActiveSheetId;
  const setActiveChartSheetId = ctx?.setActiveChartSheetId;
  const setChartSheets = ctx?.setChartSheets;
  const setLoadedChartBuilderSnapshot = ctx?.setLoadedChartBuilderSnapshot;
  const setLoadedChartMeta = ctx?.setLoadedChartMeta;
  const setRightPanelTab = ctx?.setRightPanelTab;
  const setRightPanelOpen = ctx?.setRightPanelOpen;
  const addNewSheetAndActivate = ctx?.addNewSheetAndActivate;
  const addNewChartAndActivate = ctx?.addNewChartAndActivate;
  const chartSnapshotFlusher = ctx?.chartSnapshotFlusher;

  const dataSheetIds = useMemo(() => Object.keys(dataSheets || {}), [dataSheets]);
  const chartSheetIds = useMemo(
    () =>
      Object.keys(chartSheets || {}).filter((id) => chartSheets[id]?.userCreated === true),
    [chartSheets],
  );

  const tableViewActive = rightPanelTab !== "charts" && rightPanelTab !== "dashboard";
  const chartViewActive = rightPanelTab === "charts";
  const dashboardViewActive = rightPanelTab === "dashboard";
  const exportActive = rightPanelTab === "export";
  const integrationsPanelActive = rightPanelTab === "integrations" && rightPanelOpen;

  const persistActiveChartSnapshot = useCallback(() => {
    if (typeof chartSnapshotFlusher === "function") {
      chartSnapshotFlusher();
    }
  }, [chartSnapshotFlusher]);

  const activateChartSheet = useCallback(
    (nextId) => {
      if (!nextId || nextId === activeChartSheetId) return;
      persistActiveChartSnapshot();
      const next = chartSheets?.[nextId];
      setActiveChartSheetId?.(nextId);
      setLoadedChartBuilderSnapshot?.(next?.snapshot ?? null);
      setLoadedChartMeta?.(next?.chartMeta ?? null);
    },
    [
      activeChartSheetId,
      chartSheets,
      persistActiveChartSnapshot,
      setActiveChartSheetId,
      setLoadedChartBuilderSnapshot,
      setLoadedChartMeta,
    ],
  );

  const selectSheet = useCallback(
    (id) => {
      setActiveSheetId?.(id);
      setRightPanelTab?.("integrations");
    },
    [setActiveSheetId, setRightPanelTab],
  );

  const selectChart = useCallback(
    (id) => {
      activateChartSheet(id);
      setRightPanelTab?.("charts");
      setRightPanelOpen?.(true);
    },
    [activateChartSheet, setRightPanelOpen, setRightPanelTab],
  );

  const openIntegrationsPanel = useCallback(() => {
    setRightPanelTab?.("integrations");
    setRightPanelOpen?.(true);
  }, [setRightPanelOpen, setRightPanelTab]);

  const addChart = useCallback(() => {
    persistActiveChartSnapshot();
    addNewChartAndActivate?.((newId) => {
      setLoadedChartBuilderSnapshot?.(null);
      setLoadedChartMeta?.(null);
      setChartSheets?.((prev) => {
        const created = Object.values(prev || {}).filter((c) => c?.userCreated).length;
        const chartName = `Chart ${created + 1}`;
        const cur = prev?.[newId] || {};
        return {
          ...(prev || {}),
          [newId]: {
            ...cur,
            name: chartName,
            snapshot: null,
            chartMeta: null,
            userCreated: true,
          },
        };
      });
    });
    setRightPanelTab?.("charts");
    setRightPanelOpen?.(true);
  }, [
    addNewChartAndActivate,
    persistActiveChartSnapshot,
    setChartSheets,
    setLoadedChartBuilderSnapshot,
    setLoadedChartMeta,
    setRightPanelOpen,
    setRightPanelTab,
  ]);

  const openDashboard = useCallback(() => {
    setRightPanelTab?.("dashboard");
    setRightPanelOpen?.(true);
  }, [setRightPanelOpen, setRightPanelTab]);

  const openExport = useCallback(() => {
    setRightPanelTab?.("export");
    setRightPanelOpen?.(true);
  }, [setRightPanelOpen, setRightPanelTab]);

  const textSize = compact ? "text-xs" : "text-sm";
  const gapClass = compact ? "gap-0.5" : "gap-1";

  return (
    <nav
      className={cn(
        "mb-2 flex min-w-0 items-center justify-between gap-2",
        compact && "mb-1 gap-1.5",
        className,
      )}
      aria-label="Workspace navigation"
    >
      <div
        className={cn("flex min-w-0 flex-1 flex-wrap items-center", gapClass)}
        aria-label="Open sheets and charts"
      >
        {dataSheetIds.map((id) => (
          <button
            key={`sheet-${id}`}
            type="button"
            className={cn(
              chipBase,
              textSize,
              tableViewActive && id === activeSheetId ? chipActive : chipIdle,
            )}
            onClick={() => selectSheet(id)}
          >
            {dataSheets[id]?.name || id}
          </button>
        ))}

        {chartSheetIds.map((id) => (
          <button
            key={`chart-${id}`}
            type="button"
            className={cn(
              chipBase,
              textSize,
              chartViewActive && id === activeChartSheetId ? chipActive : chipIdle,
            )}
            onClick={() => selectChart(id)}
          >
            {chartSheets[id]?.name || id}
          </button>
        ))}
      </div>

      <div
        className={cn("flex shrink-0 flex-wrap items-center justify-end", gapClass)}
        aria-label="Workspace actions"
      >
        <button
          type="button"
          className={cn(actionChipBase, textSize, chipIdle)}
          onClick={() => addNewSheetAndActivate?.()}
        >
          + Sheet
        </button>

        <button
          type="button"
          className={cn(
            actionChipBase,
            textSize,
            integrationsPanelActive && !chartViewActive && !dashboardViewActive ? chipActive : chipIdle,
          )}
          onClick={openIntegrationsPanel}
        >
          + Integration
        </button>

        <button
          type="button"
          className={cn(actionChipBase, textSize, chartViewActive ? chipActive : chipIdle)}
          onClick={addChart}
        >
          + Chart
        </button>

        <button
          type="button"
          className={cn(actionChipBase, textSize, dashboardViewActive ? chipActive : chipIdle)}
          onClick={openDashboard}
        >
          + Dashboard
        </button>

        <button
          type="button"
          className={cn(actionChipBase, textSize, exportActive ? chipActive : chipIdle)}
          onClick={openExport}
        >
          Export
        </button>
      </div>
    </nav>
  );
}
