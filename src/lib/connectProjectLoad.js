import {
  finishConnectHomeProjectLoad,
  loadFullProjectFromApi,
} from "@/lib/hydrateProjectWorkspace";
import { scheduleConnectProjectSheetScroll } from "@/lib/connectHubScroll";
import { resetProjectWorkspaceState } from "@/lib/resetProjectWorkspaceState";
import { CONNECT_WORKSPACE } from "@/lib/connectHomeWorkspace";

export const PROJECT_LOAD_PROGRESS_MESSAGES = [
  "Loading data sheets…",
  "Fetching saved rows from the project store…",
  "Preparing sheet metadata and previews…",
  "Reconstructing workbook tabs…",
  "Re-running saved Data Lake queries…",
  "Hydrating rows into the grid…",
  "Large projects can take a moment. Still loading…",
];

export const CONNECT_PROJECT_LOAD_IDLE = {
  loading: false,
  progress: 0,
  message: "",
  dataSetId: null,
  projectName: "",
};

/**
 * @param {Function} setConnectProjectLoadState
 * @returns {{ bump: Function; startTicker: Function; stopTicker: Function }}
 */
export function createConnectProjectLoadTicker(setConnectProjectLoadState) {
  let intervalId = null;

  const stopTicker = () => {
    if (intervalId != null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  };

  const bump = (pct, message) => {
    setConnectProjectLoadState((prev) => ({
      ...prev,
      loading: true,
      progress: pct,
      message: message ?? prev.message,
    }));
  };

  const startTicker = ({ min = 18, max = 64 } = {}) => {
    stopTicker();
    let tick = 0;
    intervalId = window.setInterval(() => {
      tick += 1;
      setConnectProjectLoadState((prev) => {
        const current = Number.isFinite(Number(prev.progress)) ? Number(prev.progress) : min;
        if (current >= max) return { ...prev, message: PROJECT_LOAD_PROGRESS_MESSAGES[tick % PROJECT_LOAD_PROGRESS_MESSAGES.length] };
        const remaining = max - current;
        const step = Math.max(0.2, Math.min(1.8, remaining * 0.08));
        return {
          ...prev,
          loading: true,
          progress: Math.min(max, current + step),
          message: PROJECT_LOAD_PROGRESS_MESSAGES[tick % PROJECT_LOAD_PROGRESS_MESSAGES.length],
        };
      });
    }, 900);
  };

  return { bump, startTicker, stopTicker };
}

/**
 * Show loading UI only — workspace navigation happens after load succeeds.
 */
export function beginConnectProjectLoadShell({
  dataSetId,
  projectName = "",
  setConnectProjectLoadState,
  requestConnectWorkspace,
  setConnectHomeAnalyzeActive,
  requestConnectAnalyzeScroll,
}) {
  setConnectProjectLoadState({
    loading: true,
    progress: 6,
    message: "Preparing project load…",
    dataSetId: dataSetId != null ? String(dataSetId) : null,
    projectName: projectName || "",
  });
  requestConnectWorkspace?.(CONNECT_WORKSPACE.PROJECT);
  setConnectHomeAnalyzeActive?.(true);
  requestConnectAnalyzeScroll?.();
}

export function endConnectProjectLoad(setConnectProjectLoadState, { delayMs = 300 } = {}) {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      setConnectProjectLoadState(CONNECT_PROJECT_LOAD_IDLE);
      resolve();
    }, delayMs);
  });
}

/**
 * Load a saved project: reset stale state, fetch + hydrate, then open workspace.
 */
export async function runConnectProjectLoad({
  dataSetId,
  userId,
  projectName = "",
  preferredChartId = null,
  rightPanelTab = null,
  connectHomeCenterView = null,
  loadedDataMeta,
  setConnectProjectLoadState,
  setDataSheets,
  setActiveSheetId,
  setConnectedData,
  setConnectedCols,
  setDataTypes,
  setLoadedDataMeta,
  setLoadedDataId,
  setSavedCharts,
  setChartSheets,
  setActiveChartSheetId,
  setLoadedChartMeta,
  setLoadedChartBuilderSnapshot,
  setRefetchChartDashboardsTick,
  setViewing,
  requestConnectWorkspace,
  setConnectHomeAnalyzeActive,
  requestConnectAnalyzeScroll,
  setConnectHomeCenterView,
  setRightPanelTab,
  setRightPanelOpen,
  setChartDataOverride,
  setChartDataOverrideMeta,
  liveStreamActions,
  liveStreamState,
  onAlreadyLoaded,
}) {
  const { bump, startTicker, stopTicker } = createConnectProjectLoadTicker(setConnectProjectLoadState);

  beginConnectProjectLoadShell({
    dataSetId,
    projectName,
    setConnectProjectLoadState,
    requestConnectWorkspace,
    setConnectHomeAnalyzeActive,
    requestConnectAnalyzeScroll,
  });

  try {
    if (loadedDataMeta && dataSetId === loadedDataMeta._id) {
      bump(40, "Project already loaded. Refreshing project links…");
      setRefetchChartDashboardsTick?.((t) => (t || 0) + 1);
      bump(90, "Opening project workspace…");
      await onAlreadyLoaded?.();
      finishConnectHomeProjectLoad({
        setViewing,
        requestConnectWorkspace,
        setConnectHomeAnalyzeActive,
        requestConnectAnalyzeScroll,
        setRightPanelTab,
        setRightPanelOpen,
        rightPanelTab: rightPanelTab || undefined,
      });
      if (connectHomeCenterView) setConnectHomeCenterView?.(connectHomeCenterView);
      return;
    }

    bump(10, "Clearing previous project state…");
    resetProjectWorkspaceState({
      setDataSheets,
      setActiveSheetId,
      setConnectedData,
      setConnectedCols,
      setDataTypes,
      setChartSheets,
      setActiveChartSheetId,
      setLoadedChartMeta,
      setLoadedChartBuilderSnapshot,
      setSavedCharts,
      setLoadedDataMeta,
      setLoadedDataId,
      setChartDataOverride,
      setChartDataOverrideMeta,
      liveStreamActions,
      liveStreamState,
    });

    bump(18, "Loading data sheets…");
    startTicker({ min: 18, max: 64 });

    await loadFullProjectFromApi({
      dataSetId,
      userId,
      preferredChartId: preferredChartId || null,
      setDataSheets,
      setActiveSheetId,
      setConnectedData,
      setLoadedDataMeta,
      setLoadedDataId,
      setSavedCharts,
      setChartSheets,
      setActiveChartSheetId,
      setLoadedChartMeta,
      setLoadedChartBuilderSnapshot,
      setRefetchChartDashboardsTick,
      onRehydrateProgress: (message) => bump(72, message),
    });

    stopTicker();
    bump(96, "Opening project workspace…");

    finishConnectHomeProjectLoad({
      setViewing,
      requestConnectWorkspace,
      setConnectHomeAnalyzeActive,
      requestConnectAnalyzeScroll,
      setRightPanelTab,
      setRightPanelOpen,
      rightPanelTab: rightPanelTab || undefined,
    });
    if (connectHomeCenterView) setConnectHomeCenterView?.(connectHomeCenterView);

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        scheduleConnectProjectSheetScroll();
      });
    }
  } catch (err) {
    stopTicker();
    setConnectProjectLoadState(CONNECT_PROJECT_LOAD_IDLE);
    throw err;
  } finally {
    stopTicker();
    await endConnectProjectLoad(setConnectProjectLoadState);
  }
}
