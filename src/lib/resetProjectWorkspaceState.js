/**
 * Clear in-memory workspace before loading a different saved project.
 */

export function resetProjectWorkspaceState(setters = {}) {
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
    liveStreamActions,
    liveStreamState,
  } = setters;

  const streamsBySheetId = liveStreamState?.streamsBySheetId || {};
  Object.entries(streamsBySheetId).forEach(([sheetId, stream]) => {
    if (stream?.isRunning || stream?.connecting) {
      liveStreamActions?.stop?.(sheetId);
    }
  });

  setDataSheets?.({
    "sheet-1": {
      name: "Sheet 1",
      data: [],
      provenance: null,
      requestCards: [],
      operationHistory: [],
    },
  });
  setActiveSheetId?.("sheet-1");
  setConnectedData?.([]);
  setConnectedCols?.([]);
  setDataTypes?.({});

  setChartSheets?.({
    "chart-1": { name: "Chart 1", snapshot: null, chartMeta: null },
  });
  setActiveChartSheetId?.("chart-1");
  setLoadedChartMeta?.(null);
  setLoadedChartBuilderSnapshot?.(null);
  setSavedCharts?.([]);
  setLoadedDataMeta?.(null);
  setLoadedDataId?.(null);
  setChartDataOverride?.(null);
  setChartDataOverrideMeta?.(null);
}
