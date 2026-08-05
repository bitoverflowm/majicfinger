/**
 * Clear in-memory workspace before loading a different saved project
 * or starting a brand-new project.
 */

import { flushSync } from "react-dom";

import { isDefaultOrphanSheetName } from "@/lib/projectPersistence";

/** Fresh blank starter — never reuse a module-level object (avoids shared mutation / React bailout). */
export function createBlankDataSheets() {
  return {
    "sheet-1": {
      name: "Sheet 1",
      data: [],
      provenance: null,
      requestCards: [],
      operationHistory: [],
    },
  };
}

export function createBlankChartSheets() {
  return {
    "chart-1": { name: "Chart 1", snapshot: null, chartMeta: null },
  };
}

/**
 * Drop empty default-named tabs ("Sheet 1", "Sheet 2", …) once real sheets exist.
 * Prevents the New Project starter tab from lingering beside pulled market sheets.
 *
 * @param {Record<string, object> | null | undefined} dataSheets
 * @returns {Record<string, object>}
 */
export function pruneEmptyDefaultNamedSheets(dataSheets) {
  const sheets =
    dataSheets && typeof dataSheets === "object" ? { ...dataSheets } : {};
  const ids = Object.keys(sheets);
  if (ids.length <= 1) return sheets;

  const hasRealSheet = ids.some((id) => {
    const s = sheets[id];
    if (!s || typeof s !== "object") return false;
    if (!isDefaultOrphanSheetName(s.name)) return true;
    if (Array.isArray(s.data) && s.data.length > 0) return true;
    if (s.provenance) return true;
    if (Array.isArray(s.requestCards) && s.requestCards.length > 0) return true;
    if (Array.isArray(s.operationHistory) && s.operationHistory.length > 0) return true;
    return false;
  });
  if (!hasRealSheet) return sheets;

  for (const id of ids) {
    const s = sheets[id];
    if (!s || typeof s !== "object") continue;
    if (!isDefaultOrphanSheetName(s.name)) continue;
    const rows = Array.isArray(s.data) ? s.data.length : 0;
    if (rows > 0) continue;
    if (s.provenance) continue;
    if (Array.isArray(s.requestCards) && s.requestCards.length > 0) continue;
    if (Array.isArray(s.operationHistory) && s.operationHistory.length > 0) continue;
    delete sheets[id];
  }

  if (!Object.keys(sheets).length) return createBlankDataSheets();
  return sheets;
}

/**
 * Stop WS streams + REST live polls and clear their React state.
 */
export function stopAllLiveWorkspaceActivity({
  liveStreamActions,
  liveStreamState,
  liveFeedActions,
  liveFeedState,
  setLiveStreamState,
  setLiveFeedState,
  cancelConnectDataFeedPull,
} = {}) {
  cancelConnectDataFeedPull?.();

  const streamsBySheetId = liveStreamState?.streamsBySheetId || {};
  Object.keys(streamsBySheetId).forEach((sheetId) => {
    liveStreamActions?.stop?.(sheetId);
  });
  // stop() without id clears manager refs even if React state was already empty
  liveStreamActions?.stop?.();
  setLiveStreamState?.({ streamsBySheetId: {} });

  const feedsById = liveFeedState?.feedsById || {};
  Object.keys(feedsById).forEach((feedId) => {
    liveFeedActions?.stop?.(feedId);
  });
  liveFeedActions?.stop?.();
  setLiveFeedState?.({ feedsById: {} });
}

/**
 * @param {object} setters
 * @param {{ clearSavedChartsList?: boolean }} [options]
 */
export function resetProjectWorkspaceState(setters = {}, options = {}) {
  const {
    setDataSheets,
    setActiveSheetId,
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
    setActiveChartDashboardId,
    setChartDashboardDraft,
    setLoadedPresentationMeta,
    setConnectedPresentation,
    setDataSetName,
    setConnectHomeCenterView,
    setConnectHomePullDestination,
    liveStreamActions,
    liveStreamState,
    liveFeedActions,
    liveFeedState,
<<<<<<< HEAD
    setLiveStreamState,
    setLiveFeedState,
    cancelConnectDataFeedPull,
=======
>>>>>>> c9a151e6b6f99a668d347fec8189e0429eed0e36
  } = setters;

  const { clearSavedChartsList = true } = options;

<<<<<<< HEAD
  stopAllLiveWorkspaceActivity({
    liveStreamActions,
    liveStreamState,
    liveFeedActions,
    liveFeedState,
    setLiveStreamState,
    setLiveFeedState,
    cancelConnectDataFeedPull,
=======
  const feedsById = liveFeedState?.feedsById || {};
  Object.entries(feedsById).forEach(([feedId, feed]) => {
    if (feed?.isRunning || feed?.connecting) {
      liveFeedActions?.stop?.(feedId);
    }
  });
  // Stop any remaining ephemeral feeds the state map missed.
  liveFeedActions?.stop?.();

  setDataSheets?.({
    "sheet-1": {
      name: "Sheet 1",
      data: [],
      provenance: null,
      requestCards: [],
      operationHistory: [],
    },
>>>>>>> c9a151e6b6f99a668d347fec8189e0429eed0e36
  });

  // flushSync so later setConnectedData / live ticks cannot merge into stale sheets.
  // Do NOT call setConnectedData here — it is a sheet merge helper and can re-add tabs.
  const applyBlankWorkspace = () => {
    setDataSheets?.(createBlankDataSheets());
    setActiveSheetId?.("sheet-1");
    setConnectedCols?.([]);
    setDataTypes?.({});

    setChartSheets?.(createBlankChartSheets());
    setActiveChartSheetId?.("chart-1");
    setLoadedChartMeta?.(null);
    setLoadedChartBuilderSnapshot?.(null);
    if (clearSavedChartsList) {
      setSavedCharts?.([]);
    }
    setLoadedDataMeta?.(null);
    setLoadedDataId?.(null);
    setChartDataOverride?.(null);
    setChartDataOverrideMeta?.(null);
    setActiveChartDashboardId?.(null);
    setChartDashboardDraft?.(null);
    setLoadedPresentationMeta?.(null);
    setConnectedPresentation?.(null);
    setDataSetName?.("");
    setConnectHomeCenterView?.("sheet");
    // First pull after New Project should replace the blank starter, not add beside it.
    setConnectHomePullDestination?.("replace");
  };

  if (typeof flushSync === "function") {
    flushSync(applyBlankWorkspace);
  } else {
    applyBlankWorkspace();
  }
}

/**
 * True when the workspace has work the user would lose on a hard wipe.
 */
export function workspaceHasUnsavedProgress({
  dataSheets,
  chartSheets,
  connectedData,
  chartDashboardDraft,
  loadedDataMeta,
  liveFeedState,
  liveStreamState,
} = {}) {
  if (loadedDataMeta?._id) return true;
  if (Array.isArray(connectedData) && connectedData.length > 0) return true;
  if (chartDashboardDraft && typeof chartDashboardDraft === "object") return true;

  for (const sheet of Object.values(dataSheets || {})) {
    if (!sheet || typeof sheet !== "object") continue;
    if (Array.isArray(sheet.data) && sheet.data.length > 0) return true;
    if (sheet.provenance) return true;
    if (Array.isArray(sheet.requestCards) && sheet.requestCards.length > 0) return true;
    if (Array.isArray(sheet.operationHistory) && sheet.operationHistory.length > 0) return true;
    const name = String(sheet.name || "").trim();
    if (name && !/^Sheet\s+\d+$/i.test(name)) return true;
  }

  for (const sheet of Object.values(chartSheets || {})) {
    if (!sheet || typeof sheet !== "object") continue;
    if (sheet.snapshot || sheet.chartMeta?._id || sheet.userCreated) return true;
  }

  const feeds = liveFeedState?.feedsById || {};
  if (Object.keys(feeds).length > 0) return true;

  const streams = liveStreamState?.streamsBySheetId || {};
  if (
    Object.values(streams).some((s) => s?.isRunning || s?.connecting || s?.config)
  ) {
    return true;
  }

  return false;
}
