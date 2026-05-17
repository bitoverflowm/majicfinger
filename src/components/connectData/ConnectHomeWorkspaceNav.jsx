"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AmberCancelButton } from "@/components/primitives/destructive-icon-button";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  connectHomeAnySheetHasData,
  isConnectUserDataPullActive,
} from "@/lib/connectHomePullDestination";
import { CONNECT_HOME_CENTER_VIEW, normalizeConnectHomeCenterView } from "@/lib/connectHomeFlow";
import { isConnectIntegrationWorkspace } from "@/lib/connectHomeWorkspace";
import { cn } from "@/lib/utils";

const WORKSPACE_ACTION_TOOLTIPS = {
  integration: "Add more data and connect to another integration",
  chart: "Visualize your data",
  dashboard: "Create a dashboard",
  export: "Share and download your work",
};

const chipBase =
  "relative max-w-[11rem] shrink-0 cursor-pointer truncate rounded px-[0.3rem] py-[0.2rem] font-mono font-semibold transition-colors";
const chipIdle = "bg-yellow-200/30 hover:bg-lychee_blue/80 hover:text-lychee_white";
const chipActive = "bg-lychee_blue/30 text-foreground";

const actionChipBase =
  "relative cursor-pointer rounded px-[0.35rem] py-[0.2rem] font-mono font-semibold leading-none transition-colors whitespace-nowrap";

const CHIP_GAP_PX = 4;
const OVERFLOW_BTN_WIDTH_PX = 52;

function estimateChipWidth(label, compact) {
  const charW = compact ? 6.1 : 6.8;
  return Math.min(176, Math.ceil(String(label || "").length * charW) + 12);
}

/**
 * @param {Array<{ label: string; isActive: boolean }>} items
 * @param {number} availableWidth
 * @param {boolean} compact
 */
function splitVisibleWorkspaceTabs(items, availableWidth, compact) {
  if (!items.length) return { visible: [], overflow: [] };
  if (availableWidth <= 0) {
    const activeIdx = items.findIndex((t) => t.isActive);
    const activeOnly = activeIdx >= 0 ? [items[activeIdx]] : [items[0]];
    return { visible: activeOnly, overflow: items.filter((t) => !activeOnly.includes(t)) };
  }

  const widths = items.map((it) => estimateChipWidth(it.label, compact));
  let count = 0;
  let used = 0;

  for (let i = 0; i < items.length; i++) {
    const w = widths[i] + (count > 0 ? CHIP_GAP_PX : 0);
    if (count > 0 && used + w > availableWidth) break;
    used += w;
    count++;
  }

  if (count >= items.length) {
    return { visible: items, overflow: [] };
  }

  const visibleIndices = new Set();
  for (let i = 0; i < count; i++) visibleIndices.add(i);

  const activeIdx = items.findIndex((t) => t.isActive);
  if (activeIdx >= 0 && !visibleIndices.has(activeIdx)) {
    const dropIdx = Math.max(...visibleIndices);
    visibleIndices.delete(dropIdx);
    visibleIndices.add(activeIdx);
  }

  const ordered = [...visibleIndices].sort((a, b) => a - b);
  const visible = ordered.map((i) => items[i]);
  const overflow = items.filter((_, i) => !visibleIndices.has(i));
  return { visible, overflow };
}

function WorkspaceTabChip({ item, textSize, onSelect }) {
  return (
    <button
      type="button"
      title={item.label}
      className={cn(chipBase, textSize, item.isActive ? chipActive : chipIdle)}
      onClick={onSelect}
    >
      {item.label}
    </button>
  );
}

function WorkspaceTabStrip({ items, compact, textSize, gapClass }) {
  const stripRef = useRef(null);
  const [{ visible, overflow }, setSplit] = useState({ visible: items, overflow: [] });

  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el) return;

    const measure = () => {
      const width = el.clientWidth;
      const reserveOverflow = items.length > 1 ? OVERFLOW_BTN_WIDTH_PX : 0;
      const available = Math.max(0, width - reserveOverflow);
      setSplit(splitVisibleWorkspaceTabs(items, available, compact));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items, compact]);

  const overflowCount = overflow.length;
  const totalCount = items.length;

  const sheetItems = items.filter((t) => t.kind === "sheet");
  const chartItems = items.filter((t) => t.kind === "chart");

  return (
    <div
      ref={stripRef}
      className={cn("flex min-w-0 flex-1 items-center overflow-hidden", gapClass)}
      aria-label="Open sheets and charts"
    >
      {visible.map((item) => (
        <WorkspaceTabChip
          key={item.key}
          item={item}
          textSize={textSize}
          onSelect={item.onSelect}
        />
      ))}
      {overflowCount > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(chipBase, textSize, chipIdle, "max-w-none shrink-0")}
              title={`${totalCount} sheets and charts — open menu`}
            >
              + {totalCount}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-[min(20rem,70dvh)] w-[min(20rem,90vw)] overflow-y-auto font-mono text-xs"
          >
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Sheets & charts ({totalCount})
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sheetItems.length > 0 ? (
              <>
                <DropdownMenuLabel className="py-1 text-[10px] text-muted-foreground">
                  Sheets
                </DropdownMenuLabel>
                {sheetItems.map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    className={cn("truncate", item.isActive && "bg-accent")}
                    onClick={item.onSelect}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </>
            ) : null}
            {chartItems.length > 0 ? (
              <>
                {sheetItems.length > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuLabel className="py-1 text-[10px] text-muted-foreground">
                  Charts
                </DropdownMenuLabel>
                {chartItems.map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    className={cn("truncate", item.isActive && "bg-accent")}
                    onClick={item.onSelect}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

/**
 * Connect home — sheet/chart tabs on the left; integration/chart/dashboard + export on the right.
 */
export function ConnectHomeWorkspaceNav({ className, compact = false, onPanelManualOpen }) {
  const ctx = useMyStateV2();
  const dataSheets = ctx?.dataSheets || {};
  const chartSheets = ctx?.chartSheets || {};
  const activeSheetId = ctx?.activeSheetId;
  const activeChartSheetId = ctx?.activeChartSheetId;
  const rightPanelTab = ctx?.rightPanelTab ?? "";
  const rightPanelOpen = !!ctx?.rightPanelOpen;
  const connectHomeCenterView = normalizeConnectHomeCenterView(ctx?.connectHomeCenterView);
  const setConnectHomeCenterView = ctx?.setConnectHomeCenterView;
  const setActiveSheetId = ctx?.setActiveSheetId;
  const setActiveChartSheetId = ctx?.setActiveChartSheetId;
  const setChartSheets = ctx?.setChartSheets;
  const setLoadedChartBuilderSnapshot = ctx?.setLoadedChartBuilderSnapshot;
  const setLoadedChartMeta = ctx?.setLoadedChartMeta;
  const setRightPanelTab = ctx?.setRightPanelTab;
  const setRightPanelOpen = ctx?.setRightPanelOpen;
  const addNewChartAndActivate = ctx?.addNewChartAndActivate;
  const chartSnapshotFlusher = ctx?.chartSnapshotFlusher;
  const connectWorkspace = ctx?.connectWorkspace;
  const connectDataLakePullState = ctx?.connectDataLakePullState ?? {};
  const cancelConnectDataFeedPull = ctx?.cancelConnectDataFeedPull;

  const connectedData = ctx?.connectedData ?? [];
  const connectHomeAnalyzeActive = !!ctx?.connectHomeAnalyzeActive;
  const sheetPullViewActive =
    connectHomeCenterView !== CONNECT_HOME_CENTER_VIEW.CHARTS &&
    connectHomeCenterView !== CONNECT_HOME_CENTER_VIEW.DASHBOARD;
  const showCancelDataPull =
    sheetPullViewActive &&
    isConnectIntegrationWorkspace(connectWorkspace) &&
    isConnectUserDataPullActive(connectDataLakePullState, {
      analyzeActive: connectHomeAnalyzeActive,
    });
  const cancelPullKeepsDashboard = connectHomeAnySheetHasData(dataSheets, connectedData);

  const dataSheetIds = useMemo(() => Object.keys(dataSheets || {}), [dataSheets]);
  const chartSheetIds = useMemo(
    () =>
      Object.keys(chartSheets || {}).filter((id) => {
        const sheet = chartSheets[id];
        return sheet?.userCreated === true || sheet?.chartMeta?._id || sheet?.snapshot;
      }),
    [chartSheets],
  );

  const tableViewActive = connectHomeCenterView === CONNECT_HOME_CENTER_VIEW.SHEET;
  const chartViewActive = connectHomeCenterView === CONNECT_HOME_CENTER_VIEW.CHARTS;
  const dashboardViewActive = connectHomeCenterView === CONNECT_HOME_CENTER_VIEW.DASHBOARD;
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
      setConnectHomeCenterView?.(CONNECT_HOME_CENTER_VIEW.SHEET);
      setRightPanelTab?.((prev) =>
        prev === "charts" || prev === "dashboard" ? "integrations" : prev,
      );
    },
    [setActiveSheetId, setConnectHomeCenterView, setRightPanelTab],
  );

  const openChartPanel = useCallback(() => {
    onPanelManualOpen?.("charts");
    setConnectHomeCenterView?.(CONNECT_HOME_CENTER_VIEW.CHARTS);
    setRightPanelTab?.("charts");
    setRightPanelOpen?.(true);
  }, [onPanelManualOpen, setConnectHomeCenterView, setRightPanelOpen, setRightPanelTab]);

  const selectChart = useCallback(
    (id) => {
      activateChartSheet(id);
      openChartPanel();
    },
    [activateChartSheet, openChartPanel],
  );

  const openIntegrationsPanel = useCallback(() => {
    onPanelManualOpen?.("integrations");
    setRightPanelTab?.("integrations");
    setRightPanelOpen?.(true);
  }, [onPanelManualOpen, setRightPanelOpen, setRightPanelTab]);

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
    openChartPanel();
  }, [
    addNewChartAndActivate,
    persistActiveChartSnapshot,
    setChartSheets,
    setLoadedChartBuilderSnapshot,
    setLoadedChartMeta,
    openChartPanel,
  ]);

  const openDashboard = useCallback(() => {
    onPanelManualOpen?.("dashboard");
    setConnectHomeCenterView?.(CONNECT_HOME_CENTER_VIEW.DASHBOARD);
    setRightPanelTab?.("dashboard");
    setRightPanelOpen?.(true);
  }, [onPanelManualOpen, setConnectHomeCenterView, setRightPanelOpen, setRightPanelTab]);

  const openExport = useCallback(() => {
    onPanelManualOpen?.("export");
    setRightPanelTab?.("export");
    setRightPanelOpen?.(true);
  }, [onPanelManualOpen, setRightPanelOpen, setRightPanelTab]);

  const handleCancelDataPull = useCallback(() => {
    cancelConnectDataFeedPull?.();
  }, [cancelConnectDataFeedPull]);

  const workspaceTabItems = useMemo(() => {
    const items = [];
    for (const id of dataSheetIds) {
      items.push({
        key: `sheet-${id}`,
        kind: "sheet",
        label: dataSheets[id]?.name || id,
        isActive: tableViewActive && id === activeSheetId,
        onSelect: () => selectSheet(id),
      });
    }
    for (const id of chartSheetIds) {
      items.push({
        key: `chart-${id}`,
        kind: "chart",
        label: chartSheets[id]?.name || id,
        isActive: chartViewActive && id === activeChartSheetId,
        onSelect: () => selectChart(id),
      });
    }
    return items;
  }, [
    activeChartSheetId,
    activeSheetId,
    chartSheetIds,
    chartSheets,
    chartViewActive,
    dataSheetIds,
    dataSheets,
    selectChart,
    selectSheet,
    tableViewActive,
  ]);

  const textSize = compact ? "text-xs" : "text-sm";
  const gapClass = compact ? "gap-0.5" : "gap-1";

  return (
    <nav
      className={cn(
        "mb-2 flex min-w-0 items-end justify-between gap-2",
        compact && "mb-1 gap-1.5",
        className,
      )}
      aria-label="Workspace navigation"
    >
      <div className={cn("flex min-w-0 flex-1 items-end", gapClass)}>
        {showCancelDataPull ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="mb-[0.2rem] inline-flex shrink-0 self-center">
                  <AmberCancelButton
                    ariaLabel="Cancel data pull"
                    title="Cancel data pull"
                    onClick={handleCancelDataPull}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[14rem] text-xs">
                {cancelPullKeepsDashboard
                  ? "Cancel data pull and return to your sheet"
                  : "Cancel data pull and return to query builder"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
        <WorkspaceTabStrip
          items={workspaceTabItems}
          compact={compact}
          textSize={textSize}
          gapClass={gapClass}
        />
      </div>

      <div
        className="flex shrink-0 flex-col items-end gap-0.5"
        aria-labelledby="connect-workspace-actions-label"
      >
        <span
          id="connect-workspace-actions-label"
          className={cn(
            "font-mono font-medium leading-none text-muted-foreground",
            compact ? "text-[9px] tracking-wide" : "text-[10px] tracking-wide",
          )}
        >
          Add & export
        </span>
        <TooltipProvider delayDuration={200}>
          <div className={cn("flex flex-wrap items-center justify-end", gapClass)}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    actionChipBase,
                    textSize,
                    integrationsPanelActive && !chartViewActive && !dashboardViewActive
                      ? chipActive
                      : chipIdle,
                  )}
                  onClick={openIntegrationsPanel}
                >
                  Integration
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[14rem] text-xs">
                {WORKSPACE_ACTION_TOOLTIPS.integration}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(actionChipBase, textSize, chartViewActive ? chipActive : chipIdle)}
                  onClick={addChart}
                >
                  Chart
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[14rem] text-xs">
                {WORKSPACE_ACTION_TOOLTIPS.chart}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(actionChipBase, textSize, dashboardViewActive ? chipActive : chipIdle)}
                  onClick={openDashboard}
                >
                  Dashboard
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[14rem] text-xs">
                {WORKSPACE_ACTION_TOOLTIPS.dashboard}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(actionChipBase, textSize, exportActive ? chipActive : chipIdle)}
                  onClick={openExport}
                >
                  Export
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[14rem] text-xs">
                {WORKSPACE_ACTION_TOOLTIPS.export}
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </nav>
  );
}
