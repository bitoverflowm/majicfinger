import { CONNECT_WORKSPACE } from "@/lib/connectHomeWorkspace";
import { scheduleConnectProjectSheetScroll } from "@/lib/connectHubScroll";

/**
 * Shared helpers to load a saved DataSet (project) into sheet + chart workspace state.
 * Used by the nav (open project / open chart) and dashboard composer (open dashboard).
 */

/**
 * @param {object} ds DataSet document from `/api/dataSets/dataSet/:id`
 * @param {{ setDataSheets?: Function; setActiveSheetId?: Function; setConnectedData?: Function }} setters
 */
export function applyDataSetToWorkspace(ds, { setDataSheets, setActiveSheetId, setConnectedData }) {
  const incomingSheets = ds?.data_sheets && typeof ds.data_sheets === "object" ? ds.data_sheets : null;
  if (incomingSheets && Object.keys(incomingSheets).length > 0) {
    const normalizedSheets = Object.entries(incomingSheets).reduce((acc, [sheetId, sheet]) => {
      const mode = sheet?.storageMode === "provenance" ? "provenance" : "inline";
      acc[sheetId] = {
        ...sheet,
        data: Array.isArray(sheet?.data) ? sheet.data : [],
        storageMode: mode,
        rehydrationStatus: mode === "provenance" ? (sheet?.rehydrationStatus || "preview") : "complete",
      };
      return acc;
    }, {});
    setDataSheets?.(normalizedSheets);
    const firstId = Object.keys(incomingSheets)[0];
    setActiveSheetId?.(firstId);
    const firstRows = normalizedSheets?.[firstId]?.data || [];
    setConnectedData?.(firstRows);
    return;
  }
  const rows = Array.isArray(ds?.data) ? ds.data : [];
  const fallback = { "sheet-1": { name: "Sheet 1", data: rows, provenance: null } };
  setDataSheets?.(fallback);
  setActiveSheetId?.("sheet-1");
  setConnectedData?.(rows);
}

/**
 * First chart_id referenced in dashboard layout (visual order).
 * @param {object} layout
 * @returns {string|null}
 */
export function firstDashboardLayoutChartId(layout) {
  if (!layout || typeof layout !== "object") return null;
  const rows = Array.isArray(layout.rows) ? layout.rows : [];
  for (const row of rows) {
    if (!row || row.type !== "cards" || !Array.isArray(row.columns)) continue;
    for (const col of row.columns) {
      if (col?.chart_id != null && String(col.chart_id).trim() !== "") {
        return String(col.chart_id);
      }
    }
  }
  return null;
}

/**
 * Fetch full chart documents for a data set and populate `chartSheets` + active chart.
 * @param {object} opts
 * @param {string} opts.dataSetId
 * @param {string} opts.userId
 * @param {string|null} [opts.preferredChartId]
 * @param {Function} [opts.setSavedCharts]
 * @param {Function} [opts.setChartSheets]
 * @param {Function} [opts.setActiveChartSheetId]
 * @param {Function} [opts.setLoadedChartMeta]
 * @param {Function} [opts.setLoadedChartBuilderSnapshot]
 */
export async function hydrateChartSheetsForDataSet({
  dataSetId,
  userId,
  preferredChartId = null,
  setSavedCharts,
  setChartSheets,
  setActiveChartSheetId,
  setLoadedChartMeta,
  setLoadedChartBuilderSnapshot,
}) {
  let allCharts = [];
  if (userId) {
    try {
      const freshRes = await fetch(`/api/charts?uid=${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const freshJson = await freshRes.json();
      if (freshJson?.success && Array.isArray(freshJson?.data)) {
        allCharts = freshJson.data;
        setSavedCharts?.(freshJson.data);
      }
    } catch {
      /* keep allCharts = [] */
    }
  }
  const scoped = (allCharts || []).filter((chart) => String(chart?.data_set_id) === String(dataSetId));
  if (!scoped.length) {
    setChartSheets?.({
      "chart-1": { name: "Chart 1", snapshot: null, chartMeta: null },
    });
    setActiveChartSheetId?.("chart-1");
    setLoadedChartMeta?.(null);
    setLoadedChartBuilderSnapshot?.(null);
    return;
  }

  const detailed = await Promise.all(
    scoped.map(async (meta) => {
      try {
        const res = await fetch(`/api/charts/chart/${meta._id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const json = await res.json();
        const full = json?.data || null;
        const cp0 = Array.isArray(full?.chart_properties) ? full.chart_properties[0] : full?.chart_properties;
        const snapshot = cp0?.rechartsBuilder || null;
        return { meta: full || meta, snapshot };
      } catch {
        return { meta, snapshot: null };
      }
    }),
  );

  const nextSheets = {};
  detailed.forEach((entry, idx) => {
    const id = `chart-${idx + 1}`;
    nextSheets[id] = {
      name: entry?.meta?.chart_name || `Chart ${idx + 1}`,
      chartMeta: entry?.meta || null,
      snapshot: entry?.snapshot || null,
    };
  });
  setChartSheets?.(nextSheets);
  const preferred =
    detailed.find((d) => String(d?.meta?._id) === String(preferredChartId)) || detailed[0];
  const activeId =
    Object.keys(nextSheets).find((k) => nextSheets[k]?.chartMeta?._id === preferred?.meta?._id) ||
    "chart-1";
  setActiveChartSheetId?.(activeId);
  setLoadedChartMeta?.(preferred?.meta || null);
  setLoadedChartBuilderSnapshot?.(preferred?.snapshot || null);
}

/**
 * Fetch a saved project by id and hydrate sheet + chart workspace (same core path as nav "Open project").
 * @param {object} opts
 * @param {string} opts.dataSetId
 * @param {string} [opts.userId]
 * @param {Function} [opts.setDataSheets]
 * @param {Function} [opts.setActiveSheetId]
 * @param {Function} [opts.setConnectedData]
 * @param {Function} [opts.setLoadedDataMeta]
 * @param {Function} [opts.setLoadedDataId]
 * @param {Function} [opts.setSavedCharts]
 * @param {Function} [opts.setChartSheets]
 * @param {Function} [opts.setActiveChartSheetId]
 * @param {Function} [opts.setLoadedChartMeta]
 * @param {Function} [opts.setLoadedChartBuilderSnapshot]
 * @param {Function} [opts.setRefetchChartDashboardsTick]
 */
export async function loadFullProjectFromApi({
  dataSetId,
  userId,
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
}) {
  if (!dataSetId) throw new Error("Missing project id");
  const response = await fetch(`/api/dataSets/dataSet/${dataSetId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const res = await response.json().catch(() => ({}));
  if (!response.ok || !res?.data) {
    throw new Error(res?.message || "Failed to load project");
  }
  applyDataSetToWorkspace(res.data, { setDataSheets, setActiveSheetId, setConnectedData });
  setLoadedDataMeta?.(res.data);
  const rid = res.data?._id ?? dataSetId;
  if (rid != null) setLoadedDataId?.(rid);
  await hydrateChartSheetsForDataSet({
    dataSetId,
    userId,
    setSavedCharts,
    setChartSheets,
    setActiveChartSheetId,
    setLoadedChartMeta,
    setLoadedChartBuilderSnapshot,
  });
  setRefetchChartDashboardsTick?.((t) => (t || 0) + 1);
}

/**
 * After sheets/charts are hydrated, mount the project in Connect home (core dashboard).
 */
export function finishConnectHomeProjectLoad({
  setViewing,
  requestConnectWorkspace,
  setConnectHomeAnalyzeActive,
  requestConnectAnalyzeScroll,
  setRightPanelTab,
  setRightPanelOpen,
  rightPanelTab = null,
  scroll = true,
}) {
  setViewing?.("connectDataHome");
  requestConnectWorkspace?.(CONNECT_WORKSPACE.PROJECT, { scroll });
  setConnectHomeAnalyzeActive?.(true);
  if (scroll) {
    requestConnectAnalyzeScroll?.();
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        scheduleConnectProjectSheetScroll();
      });
    }
  }
  const panelTab = rightPanelTab ?? "requestHistory";
  setRightPanelTab?.(panelTab);
  setRightPanelOpen?.(true);
}

/**
 * Fetch project + hydrate workspace, then show it in Connect home.
 */
export async function openProjectInConnectHome({
  dataSetId,
  userId,
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
  setViewing,
  requestConnectWorkspace,
  setConnectHomeAnalyzeActive,
  requestConnectAnalyzeScroll,
  setRightPanelTab,
  setRightPanelOpen,
  rightPanelTab = null,
  scroll = true,
}) {
  await loadFullProjectFromApi({
    dataSetId,
    userId,
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
  });
  finishConnectHomeProjectLoad({
    setViewing,
    requestConnectWorkspace,
    setConnectHomeAnalyzeActive,
    requestConnectAnalyzeScroll,
    setRightPanelTab,
    setRightPanelOpen,
    rightPanelTab,
    scroll,
  });
}
