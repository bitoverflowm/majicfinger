import { CONNECT_WORKSPACE } from "@/lib/connectHomeWorkspace";
import { scheduleConnectProjectSheetScroll } from "@/lib/connectHubScroll";
import { normalizeBuilderSnapshot } from "@/lib/chartBundle";
import { inferDefaultBuilderSnapshot } from "@/lib/inferDefaultBuilderSnapshot";
import { rehydrateProjectProvenanceSheets } from "@/lib/rehydrateProjectProvenanceSheets";
import {
  pickInitialActiveSheetId,
  replayProjectDerivedSheets,
} from "@/lib/replayProjectDerivedSheets";
import { stripProvenanceRowPayloadForLoad } from "@/lib/projectPersistence";

/**
 * Shared helpers to load a saved DataSet (project) into sheet + chart workspace state.
 * Used by the nav (open project / open chart) and dashboard composer (open dashboard).
 */

export function applyDataSetToWorkspace(ds, { setDataSheets, setActiveSheetId, setConnectedData }) {
  const incomingSheets = ds?.data_sheets && typeof ds.data_sheets === "object" ? ds.data_sheets : null;
  if (incomingSheets && Object.keys(incomingSheets).length > 0) {
    const normalizedSheets = Object.entries(incomingSheets).reduce((acc, [sheetId, sheet]) => {
      const mode =
        sheet?.storageMode === "provenance"
          ? "provenance"
          : sheet?.storageMode === "derived"
            ? "derived"
            : "inline";
      acc[sheetId] = {
        ...sheet,
        data: Array.isArray(sheet?.data) ? sheet.data : [],
        storageMode: mode,
        rehydrationStatus:
          mode === "provenance" || mode === "derived"
            ? sheet?.rehydrationStatus || "pending"
            : "complete",
      };
      return acc;
    }, {});
    setDataSheets?.(normalizedSheets);
    const firstId = pickInitialActiveSheetId(normalizedSheets) || Object.keys(incomingSheets)[0];
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
  dataSheets = null,
  legacyRows = [],
}) {
  let allCharts = [];
  if (userId) {
    try {
      const chartListUrl = dataSetId
        ? `/api/charts?uid=${encodeURIComponent(userId)}&data_set_id=${encodeURIComponent(dataSetId)}`
        : `/api/charts?uid=${encodeURIComponent(userId)}`;
      const freshRes = await fetch(chartListUrl, {
        method: "GET",
        credentials: "same-origin",
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
          credentials: "same-origin",
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

  const rowsForNormalize = Array.isArray(legacyRows) && legacyRows.length
    ? legacyRows
    : Object.values(dataSheets || {}).find((s) => Array.isArray(s?.data) && s.data.length)?.data || [];

  const normalizeSnapshot = (snapshot) => {
    if (snapshot?.v === 1) {
      return normalizeBuilderSnapshot(snapshot, rowsForNormalize, dataSheets || {});
    }
    return inferDefaultBuilderSnapshot(rowsForNormalize);
  };

  const nextSheets = {};
  detailed.forEach((entry, idx) => {
    const id = `chart-${idx + 1}`;
    nextSheets[id] = {
      name: entry?.meta?.chart_name || `Chart ${idx + 1}`,
      chartMeta: entry?.meta || null,
      snapshot: entry?.snapshot ? normalizeSnapshot(entry.snapshot) : null,
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
  setLoadedChartBuilderSnapshot?.(
    preferred?.snapshot ? normalizeSnapshot(preferred.snapshot) : null,
  );
}

function yieldToPaint() {
  if (typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

function applyActiveSheetFromSheets(allSheets, preferredSheetId, setters) {
  const { setDataSheets, setActiveSheetId, setConnectedData } = setters;
  if (!allSheets || !setDataSheets) return;
  setDataSheets({ ...allSheets });
  const activeKey =
    (preferredSheetId && Array.isArray(allSheets[preferredSheetId]?.data) && allSheets[preferredSheetId].data.length
      ? preferredSheetId
      : null) || pickInitialActiveSheetId(allSheets);
  if (activeKey) {
    setActiveSheetId?.(activeKey);
    setConnectedData?.(Array.isArray(allSheets[activeKey]?.data) ? allSheets[activeKey].data : []);
  }
}

export async function loadFullProjectFromApi({
  dataSetId,
  userId,
  preferredChartId = null,
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
  onRehydrateProgress,
}) {
  if (!dataSetId) throw new Error("Missing project id");
  const response = await fetch(`/api/dataSets/dataSet/${dataSetId}`, {
    method: "GET",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
  });
  const res = await response.json().catch(() => ({}));
  if (!response.ok || !res?.data) {
    throw new Error(res?.message || "Failed to load project");
  }

  const stripped = stripProvenanceRowPayloadForLoad(res.data);
  const incomingSheets =
    stripped?.data_sheets && typeof stripped.data_sheets === "object" ? stripped.data_sheets : null;
  const preferredSheetId = incomingSheets ? pickInitialActiveSheetId(incomingSheets) : null;

  applyDataSetToWorkspace(stripped, { setDataSheets, setActiveSheetId, setConnectedData });
  setLoadedDataMeta?.(stripped);

  const rid = stripped?._id ?? dataSetId;
  if (rid != null) setLoadedDataId?.(rid);

  await yieldToPaint();

  await hydrateChartSheetsForDataSet({
    dataSetId,
    userId,
    preferredChartId,
    setSavedCharts,
    setChartSheets,
    setActiveChartSheetId,
    setLoadedChartMeta,
    setLoadedChartBuilderSnapshot,
    dataSheets: incomingSheets,
    legacyRows: stripped?.data,
  });

  if (incomingSheets && Object.keys(incomingSheets).length && setDataSheets) {
    onRehydrateProgress?.("Re-running saved Data Lake queries…");
    let workingSheets = { ...incomingSheets };
    Object.entries(stripped?.data_sheets || {}).forEach(([id, sheet]) => {
      workingSheets[id] = { ...sheet, ...(workingSheets[id] || {}) };
    });

    try {
      workingSheets = await rehydrateProjectProvenanceSheets(workingSheets, {
        onSheetDone: (_sheetId, _updated, allSheets) => {
          workingSheets = allSheets;
        },
      });
      onRehydrateProgress?.("Replaying derived sheet filters…");
      workingSheets = replayProjectDerivedSheets(workingSheets);
      applyActiveSheetFromSheets(workingSheets, preferredSheetId, {
        setDataSheets,
        setActiveSheetId,
        setConnectedData,
      });
    } catch (e) {
      console.warn("[loadFullProjectFromApi] Sheet replay failed:", e?.message || e);
      workingSheets = replayProjectDerivedSheets(workingSheets);
      applyActiveSheetFromSheets(workingSheets, preferredSheetId, {
        setDataSheets,
        setActiveSheetId,
        setConnectedData,
      });
    }
  }

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
