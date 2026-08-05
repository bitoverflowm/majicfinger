/**
 * Clear in-memory workspace before loading a different saved project
 * or starting a brand-new project.
 */

const BLANK_DATA_SHEETS = {
  "sheet-1": {
    name: "Sheet 1",
    data: [],
    provenance: null,
    requestCards: [],
    operationHistory: [],
  },
};

const BLANK_CHART_SHEETS = {
  "chart-1": { name: "Chart 1", snapshot: null, chartMeta: null },
};

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
    setActiveChartDashboardId,
    setChartDashboardDraft,
    setLoadedPresentationMeta,
    setConnectedPresentation,
    setDataSetName,
    setConnectHomeCenterView,
    liveStreamActions,
    liveStreamState,
    liveFeedActions,
    liveFeedState,
    setLiveStreamState,
    setLiveFeedState,
    cancelConnectDataFeedPull,
  } = setters;

  const { clearSavedChartsList = true } = options;

  stopAllLiveWorkspaceActivity({
    liveStreamActions,
    liveStreamState,
    liveFeedActions,
    liveFeedState,
    setLiveStreamState,
    setLiveFeedState,
    cancelConnectDataFeedPull,
  });

  setDataSheets?.(BLANK_DATA_SHEETS);
  setActiveSheetId?.("sheet-1");
  setConnectedData?.([]);
  setConnectedCols?.([]);
  setDataTypes?.({});

  setChartSheets?.(BLANK_CHART_SHEETS);
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
