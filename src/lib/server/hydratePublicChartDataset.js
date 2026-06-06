import { getAthenaAccessForUserId } from "@/lib/athenaAccess";
import { inferDefaultBuilderSnapshot } from "@/lib/inferDefaultBuilderSnapshot";
import {
  collectChartSnapshotColumnsBySheetId,
  primarySheetIdForChartSnapshot,
  projectRowObjectsToColumnSet,
} from "@/lib/chartSnapshotDataDeps";
import {
  buildRehydrateSheetRequestBody,
  buildSheetProvenanceGraphForRehydrate,
  runRehydrateSheetCore,
} from "@/lib/dataLake/rehydrateSheetCore";

function cloneLeanDoc(doc) {
  try {
    return typeof structuredClone === "function" ? structuredClone(doc) : JSON.parse(JSON.stringify(doc));
  } catch {
    return { ...(doc || {}) };
  }
}

/**
 * @param {any} sheet
 */
export function sheetNeedsLakeRehydrate(sheet) {
  if (!sheet || typeof sheet !== "object") return false;
  const prov = sheet.provenance;
  if (!prov || prov.kind !== "compose") return false;
  if (sheet.storageMode === "provenance") return true;
  const full = Math.max(0, Number(sheet.fullRowCount || sheet.rowCount || 0));
  const have = Array.isArray(sheet.data) ? sheet.data.length : 0;
  if (full > 0 && have > 0 && have < full) return true;
  return false;
}

function isJoinDependencyOfAnotherCandidate(sheetId, candidates, dataSheets) {
  for (const other of candidates) {
    if (other === sheetId) continue;
    const joins = dataSheets?.[other]?.provenance?.serverSheetJoins || [];
    if (joins.some((j) => String(j?.targetSheetId || "") === String(sheetId))) return true;
  }
  return false;
}

/**
 * For public chart/dashboard views: re-run saved lake queries so charts match full data,
 * then trim each sheet to columns referenced by the chart snapshot (smaller JSON).
 *
 * @param {any} chartLean
 * @param {any} dataSetLean
 * @returns {Promise<any>}
 */
export async function hydrateDataSetForPublicChartViewer(chartLean, dataSetLean) {
  const out = cloneLeanDoc(dataSetLean);
  const dataSheets = out?.data_sheets && typeof out.data_sheets === "object" ? out.data_sheets : {};
  out.data_sheets = dataSheets;

  const cp = Array.isArray(chartLean?.chart_properties) ? chartLean.chart_properties[0] : chartLean?.chart_properties;
  const fallbackRowsFromSheets =
    Object.values(dataSheets || {}).find((s) => Array.isArray(s?.data) && s.data.length)?.data || [];
  const baseRows = Array.isArray(out.data) ? out.data : [];
  const rowsForFallback = baseRows.length ? baseRows : fallbackRowsFromSheets;
  const rechartsBuilderRaw =
    cp && typeof cp === "object" && cp.rechartsBuilder && cp.rechartsBuilder.v === 1
      ? cp.rechartsBuilder
      : inferDefaultBuilderSnapshot(rowsForFallback);
  const primaryId = primarySheetIdForChartSnapshot(dataSheets, rechartsBuilderRaw);
  const colsBySheet = collectChartSnapshotColumnsBySheetId(rechartsBuilderRaw, primaryId);

  const access = await getAthenaAccessForUserId(chartLean?.user_id);
  /** @type {Set<string>} */
  let candidates = new Set();
  for (const sid of colsBySheet.keys()) {
    if (sheetNeedsLakeRehydrate(dataSheets[sid])) candidates.add(sid);
  }
  candidates = new Set([...candidates].filter((sid) => !isJoinDependencyOfAnotherCandidate(sid, candidates, dataSheets)));

  for (const sheetId of candidates) {
    const sheet = dataSheets[sheetId];
    if (!sheet?.provenance || sheet.provenance.kind !== "compose") continue;
    const colSet = colsBySheet.get(sheetId);
    try {
      const sheetGraph = buildSheetProvenanceGraphForRehydrate(dataSheets, sheetId);
      const body = buildRehydrateSheetRequestBody({
        sheetId,
        provenance: sheet.provenance,
        sheetGraph,
        sheet,
      });
      const json = await runRehydrateSheetCore(body, access);
      let rows = Array.isArray(json?.rows) ? json.rows : [];
      if (colSet && colSet.size > 0) rows = projectRowObjectsToColumnSet(rows, colSet);
      dataSheets[sheetId] = {
        ...sheet,
        data: rows,
        storageMode: "inline",
        rehydrationStatus: "complete",
        rowCount: rows.length,
        fullRowCount: json?.rowCount ?? rows.length,
        columns: Array.isArray(json?.columns) ? json.columns : sheet.columns,
      };
    } catch {
      /* keep preview / inline data if Athena is unavailable */
    }
  }

  for (const [sheetId, sheet] of Object.entries(dataSheets)) {
    if (candidates.has(sheetId)) continue;
    const colSet = colsBySheet.get(sheetId);
    if (!colSet || colSet.size === 0 || !Array.isArray(sheet?.data)) continue;
    dataSheets[sheetId] = {
      ...sheet,
      data: projectRowObjectsToColumnSet(sheet.data, colSet),
    };
  }

  const primaryRows = dataSheets[primaryId]?.data;
  if (Array.isArray(primaryRows) && primaryRows.length) {
    const pCols = colsBySheet.get(primaryId);
    out.data = pCols && pCols.size > 0 ? projectRowObjectsToColumnSet(primaryRows, pCols) : primaryRows;
  }

  return out;
}
