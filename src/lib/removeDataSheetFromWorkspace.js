/**
 * Remove a data sheet from workspace state (tabs, rows, chart scoped keys).
 */

function sortSheetIds(ids) {
  return [...ids].sort((a, b) => {
    const na = parseInt(String(a).replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(String(b).replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });
}

function findRefineSourceFromHistory(sheet) {
  const hist = Array.isArray(sheet?.operationHistory) ? sheet.operationHistory : [];
  for (const op of hist) {
    if (op?.type === "refine.query" && op?.sourceSheetId) return String(op.sourceSheetId);
  }
  return sheet?.sourceSheetId ? String(sheet.sourceSheetId) : null;
}

/** Sheets that depend on `rootId` via sourceSheetId (transitive). */
export function collectDependentSheetIds(dataSheets, rootId) {
  const dependents = new Set();
  const visit = (id) => {
    for (const [sid, sheet] of Object.entries(dataSheets || {})) {
      if (dependents.has(sid) || sid === rootId) continue;
      const src = findRefineSourceFromHistory(sheet);
      if (src === id) {
        dependents.add(sid);
        visit(sid);
      }
    }
  };
  visit(String(rootId || ""));
  return dependents;
}

function remapScopedSheetKey(raw, idMap) {
  const v = String(raw || "");
  const idx = v.indexOf("::");
  if (idx <= 0) return v;
  const oldPrefix = v.slice(0, idx);
  const col = v.slice(idx + 2);
  const mappedPrefix = idMap[oldPrefix];
  if (!mappedPrefix) return v;
  return `${mappedPrefix}::${col}`;
}

function remapChartBuilderSnapshot(snap, idMap) {
  if (!snap || typeof snap !== "object") return snap;
  const next = { ...snap };
  if (next.selX) next.selX = remapScopedSheetKey(next.selX, idMap);
  if (Array.isArray(next.selY)) next.selY = next.selY.map((k) => remapScopedSheetKey(k, idMap));
  if (next.lineSeriesColumn) {
    next.lineSeriesColumn = remapScopedSheetKey(next.lineSeriesColumn, idMap);
  }
  if (next.chartFilterColumn) {
    next.chartFilterColumn = remapScopedSheetKey(next.chartFilterColumn, idMap);
  }
  if (next.chartConfig && typeof next.chartConfig === "object") {
    const cfg = {};
    Object.entries(next.chartConfig).forEach(([k, val]) => {
      cfg[remapScopedSheetKey(k, idMap)] = val;
    });
    next.chartConfig = cfg;
  }
  if (next.lineColorOverrides && typeof next.lineColorOverrides === "object") {
    const overrides = {};
    Object.entries(next.lineColorOverrides).forEach(([k, val]) => {
      overrides[remapScopedSheetKey(k, idMap)] = val;
    });
    next.lineColorOverrides = overrides;
  }
  return next;
}

export function remapChartSheetsForSheetIdMap(prevCharts, idMap) {
  if (!idMap || !Object.keys(idMap).length) return prevCharts;
  const p = prevCharts || {};
  const out = {};
  Object.entries(p).forEach(([chartId, chartSheet]) => {
    const existingSnapshot = chartSheet?.snapshot || null;
    const chartMeta = chartSheet?.chartMeta || null;
    const cp0 = Array.isArray(chartMeta?.chart_properties)
      ? chartMeta.chart_properties[0]
      : chartMeta?.chart_properties;
    const existingMetaSnap =
      cp0 && typeof cp0 === "object" ? cp0?.rechartsBuilder || null : null;
    const remappedSnapshot = remapChartBuilderSnapshot(existingSnapshot, idMap);
    const remappedMetaSnap = remapChartBuilderSnapshot(existingMetaSnap, idMap);
    let remappedMeta = chartMeta;
    if (chartMeta && cp0 && typeof cp0 === "object") {
      const chartProps = Array.isArray(chartMeta.chart_properties)
        ? [...chartMeta.chart_properties]
        : [cp0];
      chartProps[0] = { ...cp0, rechartsBuilder: remappedMetaSnap };
      remappedMeta = { ...chartMeta, chart_properties: chartProps };
    }
    out[chartId] = {
      ...chartSheet,
      snapshot: remappedSnapshot,
      chartMeta: remappedMeta,
    };
  });
  return out;
}

/**
 * @param {Record<string, object> | null | undefined} dataSheets
 * @param {string} sheetId
 * @param {string | null | undefined} activeSheetId
 * @returns {{
 *   dataSheets: Record<string, object>,
 *   activeSheetId: string,
 *   connectedData: unknown[],
 *   idMap: Record<string, string> | null,
 *   resetToEmptySheet: boolean,
 *   deletedSheetIds: string[],
 * } | null}
 */
export function computeRemoveDataSheetResult(dataSheets, sheetId, activeSheetId) {
  if (!sheetId) return null;
  const prev = dataSheets || {};
  if (!prev[sheetId]) return null;

  const toDelete = new Set([String(sheetId)]);
  for (const dep of collectDependentSheetIds(prev, sheetId)) {
    toDelete.add(dep);
  }

  const withoutDeleted = { ...prev };
  for (const id of toDelete) {
    delete withoutDeleted[id];
  }
  const remainingKeys = sortSheetIds(Object.keys(withoutDeleted));

  if (remainingKeys.length === 0) {
    const clearedName = String(prev[sheetId]?.name || "").trim() || "Sheet 1";
    return {
      dataSheets: {
        "sheet-1": {
          name: clearedName,
          data: [],
          provenance: null,
          requestCards: [],
          operationHistory: [],
        },
      },
      activeSheetId: "sheet-1",
      connectedData: [],
      idMap: null,
      resetToEmptySheet: true,
      deletedSheetIds: [...toDelete],
    };
  }

  const nextActive =
    activeSheetId && withoutDeleted[activeSheetId]
      ? activeSheetId
      : remainingKeys[0];
  const rows = withoutDeleted[nextActive]?.data;

  return {
    dataSheets: withoutDeleted,
    activeSheetId: nextActive,
    connectedData: Array.isArray(rows) ? rows : [],
    idMap: null,
    resetToEmptySheet: false,
    deletedSheetIds: [...toDelete],
  };
}

/**
 * @param {{
 *   sheetId: string,
 *   dataSheets?: Record<string, object>,
 *   activeSheetId?: string | null,
 *   setDataSheets?: (next: Record<string, object> | ((prev: Record<string, object>) => Record<string, object>)) => void,
 *   setActiveSheetId?: (id: string) => void,
 *   setConnectedData?: (rows: unknown[]) => void,
 *   setChartSheets?: (fn: (prev: Record<string, object>) => Record<string, object>) => void,
 *   liveStreamActions?: { stop?: (sheetId: string) => void },
 * }} params
 * @returns {ReturnType<typeof computeRemoveDataSheetResult>}
 */
export function removeDataSheetFromWorkspace({
  sheetId,
  dataSheets,
  activeSheetId,
  setDataSheets,
  setActiveSheetId,
  setConnectedData,
  setChartSheets,
  liveStreamActions,
}) {
  const result = computeRemoveDataSheetResult(dataSheets, sheetId, activeSheetId);
  if (!result || !setDataSheets) return null;

  for (const id of result.deletedSheetIds || [sheetId]) {
    liveStreamActions?.stop?.(id);
  }
  setDataSheets(result.dataSheets);
  setActiveSheetId?.(result.activeSheetId);
  setConnectedData?.(result.connectedData);

  if (setChartSheets && result.idMap) {
    setChartSheets((prevCharts) => remapChartSheetsForSheetIdMap(prevCharts, result.idMap));
  }

  return result;
}
