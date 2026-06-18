/**
 * Derive which sheet columns a saved Recharts builder snapshot may read.
 * Used to trim public embed / dashboard payloads after full lake rehydrate.
 */
import { resolvePersistedFullRowCount } from "@/lib/projectPersistence";

/**
 * @param {unknown} key
 * @returns {string}
 */
export function deScopeChartColumnKey(key) {
  const s = String(key || "").trim();
  const i = s.indexOf("::");
  return i > -1 ? s.slice(i + 2).trim() : s;
}

/**
 * @param {Record<string, unknown>} dataSheets
 * @returns {string}
 */
export function primarySheetIdForChartData(dataSheets) {
  const entries = Object.entries(dataSheets || {});
  const withData = entries.find(([, s]) => Array.isArray(s?.data) && s.data.length);
  return withData?.[0] || entries[0]?.[0] || "sheet-1";
}

/**
 * Prefer the sheet explicitly referenced by a saved builder snapshot (scoped axis keys).
 *
 * @param {Record<string, unknown>} dataSheets
 * @param {Record<string, unknown> | null | undefined} snapshot
 * @returns {string}
 */
export function primarySheetIdForChartSnapshot(dataSheets, snapshot) {
  const defaultId = primarySheetIdForChartData(dataSheets);
  if (!snapshot || typeof snapshot !== "object") return defaultId;

  const pickScoped = (key) => {
    const raw = String(key || "");
    const idx = raw.indexOf("::");
    if (idx > -1) return raw.slice(0, idx).trim() || null;
    return null;
  };

  for (const key of [snapshot.selX, ...(Array.isArray(snapshot.selY) ? snapshot.selY : [])]) {
    const sid = pickScoped(key);
    if (sid && dataSheets?.[sid]) return sid;
  }
  if (snapshot.barSeriesColumn) {
    const sid = pickScoped(snapshot.barSeriesColumn);
    if (sid && dataSheets?.[sid]) return sid;
  }

  const colsBySheet = collectChartSnapshotColumnsBySheetId(snapshot, defaultId);
  for (const sid of colsBySheet.keys()) {
    if (dataSheets?.[sid]) return sid;
  }
  return defaultId;
}

/**
 * Pick the workspace active sheet for public embeds (prefer chart snapshot primary, then first sheet with rows).
 *
 * @param {Record<string, unknown>} dataSheets
 * @param {Record<string, unknown> | null | undefined} snapshot
 * @returns {string}
 */
export function resolveEmbedActiveSheetId(dataSheets, snapshot) {
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  const entries = Object.entries(sheets);
  if (!entries.length) return "sheet-1";
  const primaryId = primarySheetIdForChartSnapshot(sheets, snapshot);
  const resolvedPrimary = resolveChartSheetId(primaryId, sheets, null);
  if (resolvedPrimary && sheets[resolvedPrimary]) return resolvedPrimary;
  const withData = entries.find(([, sheet]) => Array.isArray(sheet?.data) && sheet.data.length);
  return withData?.[0] || entries[0][0];
}

/**
 * Saved builder keys often use workspace sheet ids (e.g. `relative_position::col`) while public
 * datasets persist generic ids (`sheet-1::col`). Map missing ids onto a sheet that has data.
 *
 * @param {string | null | undefined} requestedSheetId
 * @param {Record<string, unknown>} dataSheets
 * @param {string | null | undefined} activeSheetId
 * @returns {string}
 */
export function resolveChartSheetId(requestedSheetId, dataSheets, activeSheetId) {
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  const req = String(requestedSheetId || "").trim();
  if (req && sheets[req]) return req;
  const active = String(activeSheetId || "").trim();
  if (active && sheets[active]) return active;
  const withData = Object.entries(sheets).find(([, sheet]) => Array.isArray(sheet?.data) && sheet.data.length);
  if (withData) return withData[0];
  const first = Object.keys(sheets)[0];
  return first || req || active || "sheet-1";
}

/**
 * Recharts reads `row[scopedKey]` directly. Plain sheet rows only store column names — copy values
 * onto scoped keys when cross-sheet merge falls back to connectedData.
 *
 * @param {unknown[]} rows
 * @param {string[]} keys
 * @param {Record<string, unknown>} dataSheets
 * @param {string | null | undefined} activeSheetId
 * @returns {unknown[]}
 */
export function aliasScopedColumnKeysOnRows(rows, keys, dataSheets, activeSheetId) {
  if (!Array.isArray(rows) || !rows.length) return rows;
  const keyList = [...new Set((keys || []).map((k) => String(k || "").trim()).filter(Boolean))];
  if (!keyList.length) return rows;
  return rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return row;
    const next = { ...row };
    for (const key of keyList) {
      if (next[key] != null && next[key] !== "") continue;
      const splitIdx = key.indexOf("::");
      const column = splitIdx > 0 ? key.slice(splitIdx + 2) : key;
      if (column && Object.prototype.hasOwnProperty.call(row, column)) {
        next[key] = row[column];
      }
    }
    return next;
  });
}

/**
 * Trim multi-sheet projects to only sheets referenced by the chart snapshot.
 *
 * @param {Record<string, unknown>} dataSheets
 * @param {Record<string, unknown> | null | undefined} snapshot
 * @returns {Record<string, unknown>}
 */
export function dataSheetsReferencedBySnapshot(dataSheets, snapshot) {
  const defaultId = primarySheetIdForChartData(dataSheets);
  const colsBySheet = collectChartSnapshotColumnsBySheetId(snapshot, defaultId);
  const out = {};
  for (const sid of colsBySheet.keys()) {
    if (dataSheets?.[sid]) out[sid] = dataSheets[sid];
  }
  return Object.keys(out).length ? out : dataSheets || {};
}

/**
 * Map sheetId -> Set of physical column names referenced by the snapshot.
 *
 * @param {Record<string, unknown> | null | undefined} snapshot
 * @param {string} defaultSheetId
 * @returns {Map<string, Set<string>>}
 */
export function collectChartSnapshotColumnsBySheetId(snapshot, defaultSheetId, dataSheets = null) {
  const s = snapshot && typeof snapshot === "object" ? snapshot : {};
  const def = String(defaultSheetId || "sheet-1").trim() || "sheet-1";
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : null;
  /** @type {Map<string, Set<string>>} */
  const bySheet = new Map();

  const targetSheetId = (sheetId) => {
    const sid = String(sheetId || "").trim() || def;
    if (!sheets) return sid;
    return sheets[sid] ? sid : def;
  };

  const add = (scopedKey) => {
    const raw = String(scopedKey || "").trim();
    if (!raw) return;
    let sheetId = def;
    let col = raw;
    const idx = raw.indexOf("::");
    if (idx > -1) {
      sheetId = raw.slice(0, idx).trim() || def;
      col = raw.slice(idx + 2).trim();
    }
    sheetId = targetSheetId(sheetId);
    if (!col || col.startsWith("_")) return;
    if (!bySheet.has(sheetId)) bySheet.set(sheetId, new Set());
    bySheet.get(sheetId).add(col);
  };

  if (s.selX) add(s.selX);
  for (const y of Array.isArray(s.selY) ? s.selY : []) add(y);
  if (s.selZ) add(s.selZ);
  if (s.selColorCol) add(s.selColorCol);
  if (s.lineSeriesColumn) add(s.lineSeriesColumn);
  if (s.barSeriesColumn) add(s.barSeriesColumn);
  if (s.chartFilterColumn) add(s.chartFilterColumn);
  if (s.rainbowLegendLabelColumn) add(s.rainbowLegendLabelColumn);
  for (const c of Array.isArray(s.tooltipExtraColumns) ? s.tooltipExtraColumns : []) add(c);

  if (s.chartConfig && typeof s.chartConfig === "object") {
    for (const k of Object.keys(s.chartConfig)) add(k);
  }
  if (s.lineColorOverrides && typeof s.lineColorOverrides === "object") {
    for (const k of Object.keys(s.lineColorOverrides)) {
      if (/^line:\d+$/i.test(String(k))) continue;
      add(k);
    }
  }
  if (Array.isArray(s.chartLineFilters)) {
    for (const f of s.chartLineFilters) {
      if (f?.column) add(f.column);
    }
  }
  if (Array.isArray(s.referenceLines)) {
    for (const r of s.referenceLines) {
      if (r?.axis === "x" && r?.fromColumn) add(r.fromColumn);
    }
  }

  if (!bySheet.size) {
    const fb = new Set();
    const x = deScopeChartColumnKey(s.selX);
    if (x && !x.startsWith("_")) fb.add(x);
    for (const y of Array.isArray(s.selY) ? s.selY : []) {
      const c = deScopeChartColumnKey(y);
      if (c && !c.startsWith("_")) fb.add(c);
    }
    if (fb.size) bySheet.set(def, fb);
  }

  return bySheet;
}

/**
 * @param {unknown[]} rows
 * @param {Set<string>} columnSet
 * @returns {unknown[]}
 */
export function projectRowObjectsToColumnSet(rows, columnSet) {
  if (!Array.isArray(rows) || !columnSet || columnSet.size === 0) return rows;
  const cols = [...columnSet];
  return rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return row;
    const next = {};
    for (const c of cols) {
      if (Object.prototype.hasOwnProperty.call(row, c)) next[c] = row[c];
    }
    return next;
  });
}

function sheetIdsReferencedByChart(chartLean, workspaceDataSheets) {
  const cp = Array.isArray(chartLean?.chart_properties)
    ? chartLean.chart_properties[0]
    : chartLean?.chart_properties;
  const snapshot = cp?.rechartsBuilder?.v === 1 ? cp.rechartsBuilder : null;
  const defaultId = primarySheetIdForChartSnapshot(workspaceDataSheets || {}, snapshot);
  const colsBySheet = collectChartSnapshotColumnsBySheetId(snapshot, defaultId);
  if (colsBySheet.size) return [...colsBySheet.keys()];
  return defaultId ? [defaultId] : [];
}

function sheetHasUsableChartRows(sheet) {
  if (!sheet || typeof sheet !== "object") return false;
  const rows = Array.isArray(sheet.data) ? sheet.data.length : 0;
  if (rows === 0) return false;
  const full = resolvePersistedFullRowCount(sheet, rows);
  const isProvenance =
    sheet.storageMode === "provenance" ||
    (sheet?.provenance && typeof sheet.provenance === "object" && sheet.provenance.kind === "compose");
  if (isProvenance) {
    if (sheet.rehydrationStatus === "complete") return true;
    if (full > 0) return rows >= full;
    return rows > 0;
  }
  return true;
}

/**
 * Per-chart workspace readiness — only tracks sheets referenced by the saved snapshot.
 *
 * @param {object | null | undefined} chartLean
 * @param {Record<string, unknown> | null | undefined} workspaceDataSheets
 * @returns {{ sheetIds: string[]; sig: string; ready: boolean }}
 */
export function getChartWorkspaceDependencyState(chartLean, workspaceDataSheets) {
  const sheets =
    workspaceDataSheets && typeof workspaceDataSheets === "object" ? workspaceDataSheets : {};
  const sheetIds = sheetIdsReferencedByChart(chartLean, sheets);
  if (!sheetIds.length) {
    return { sheetIds: [], sig: "", ready: false };
  }

  const parts = [];
  let ready = true;
  for (const sid of sheetIds) {
    const sheet = sheets[sid];
    const rows = Array.isArray(sheet?.data) ? sheet.data.length : 0;
    const full = resolvePersistedFullRowCount(sheet, rows);
    const status = String(sheet?.rehydrationStatus || "");
    const usable = sheetHasUsableChartRows(sheet);
    if (!usable) ready = false;
    parts.push(`${sid}:${rows}:${full}:${status}:${usable ? 1 : 0}`);
  }

  return { sheetIds, sig: parts.sort().join("|"), ready };
}
