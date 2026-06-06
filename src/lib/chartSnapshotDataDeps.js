/**
 * Derive which sheet columns a saved Recharts builder snapshot may read.
 * Used to trim public embed / dashboard payloads after full lake rehydrate.
 */

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
export function collectChartSnapshotColumnsBySheetId(snapshot, defaultSheetId) {
  const s = snapshot && typeof snapshot === "object" ? snapshot : {};
  const def = String(defaultSheetId || "sheet-1").trim() || "sheet-1";
  /** @type {Map<string, Set<string>>} */
  const bySheet = new Map();

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
