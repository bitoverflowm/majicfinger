import { collectSheetClosureForCharts } from "@/lib/runYourself/collectSheetClosure";
import { patchProvenanceParameter } from "@/lib/runYourself/patchProvenanceParameter";
import {
  RUN_YOURSELF_ALL_CATEGORIES,
  resolveDashboardChartSlot,
} from "@/config/runYourselfDashboardCharts";

const KALSHI_CATEGORY_COLUMNS = ["kalshi_taxonomy_category", "category", "kalshi_event_ticker_category"];
const POLYMARKET_CATEGORY_COLUMNS = ["category", "subcategory", "tags"];

function cloneSheets(dataSheets) {
  return JSON.parse(JSON.stringify(dataSheets || {}));
}

function sheetLake(sheet) {
  return String(sheet?.provenance?.lake || "").trim().toLowerCase();
}

/**
 * Find leaf Athena compose sheets (actual lake pulls), not derived/bucket/CTE consumers.
 * @param {Record<string, object>} dataSheets
 * @param {string} sheetId
 * @param {Set<string>} [into]
 * @returns {Set<string>}
 */
export function collectLakePullSheetIds(dataSheets, sheetId, into = new Set()) {
  const sheet = dataSheets?.[sheetId];
  if (!sheet?.provenance || sheet.provenance.kind !== "compose") return into;

  const prov = sheet.provenance;
  const deps = Array.isArray(prov.serverSheetJoins) ? prov.serverSheetJoins : [];
  if (deps.length) {
    for (const dep of deps) {
      const depId = dep?.targetSheetId ? String(dep.targetSheetId) : "";
      if (depId && dataSheets[depId]) collectLakePullSheetIds(dataSheets, depId, into);
    }
    return into;
  }

  if (sheet.sourceSheetId && dataSheets[sheet.sourceSheetId]) {
    collectLakePullSheetIds(dataSheets, sheet.sourceSheetId, into);
    return into;
  }

  const hist = Array.isArray(sheet.operationHistory) ? sheet.operationHistory : [];
  for (const op of hist) {
    if (op?.type === "bucket.sheet" && op.sourceSheetId && dataSheets[op.sourceSheetId]) {
      collectLakePullSheetIds(dataSheets, String(op.sourceSheetId), into);
      return into;
    }
  }

  if (prov.lake && prov.table) into.add(String(sheetId));
  return into;
}

function categoryColumnsForLake(lake) {
  if (lake === "polymarket") return POLYMARKET_CATEGORY_COLUMNS;
  return KALSHI_CATEGORY_COLUMNS;
}

/**
 * @param {object} provenance
 * @param {string[]} categoryColumns
 */
function provenanceHasCategoryFilter(provenance, categoryColumns) {
  const cols = new Set(categoryColumns.map((c) => c.toLowerCase()));
  const scan = (filters) => {
    if (!Array.isArray(filters)) return false;
    return filters.some((f) => {
      const col = String(f?.column ?? f?.field ?? "").trim().toLowerCase();
      return cols.has(col);
    });
  };
  if (scan(provenance?.composeFilters?.and)) return true;
  if (scan(provenance?.composeFilters?.or)) return true;
  if (scan(provenance?.composeSpec?.where)) return true;
  return false;
}

/**
 * @param {object} provenance
 * @param {string} value
 * @param {string[]} categoryColumns
 */
function addCategoryFilter(provenance, value, categoryColumns) {
  const column = categoryColumns[0] || "kalshi_taxonomy_category";
  const filter = {
    id: `run-yourself-cat-${Date.now()}`,
    column,
    kind: "string",
    op: "eq",
    value,
  };
  const composeFilters = provenance.composeFilters && typeof provenance.composeFilters === "object"
    ? { ...provenance.composeFilters }
    : { and: [] };
  const and = Array.isArray(composeFilters.and) ? [...composeFilters.and] : [];
  and.push(filter);
  return {
    ...provenance,
    composeFilters: { ...composeFilters, and },
  };
}

/**
 * @param {object} sheet
 * @param {string} categoryValue
 * @param {"kalshi" | "polymarket" | "any"} [lakeScope]
 */
function patchSheetCategory(sheet, categoryValue, lakeScope = "any") {
  if (!sheet?.provenance) return sheet;
  const lake = sheetLake(sheet);
  if (lakeScope !== "any" && lake && lake !== lakeScope) return sheet;

  const value = String(categoryValue || "").trim();
  if (!value || value === RUN_YOURSELF_ALL_CATEGORIES) return sheet;

  const categoryColumns = categoryColumnsForLake(lake || lakeScope);
  let provenance = sheet.provenance;

  if (provenanceHasCategoryFilter(provenance, categoryColumns)) {
    provenance = patchProvenanceParameter(provenance, value, {
      patchKind: "category",
      extraColumns: categoryColumns,
    });
  } else {
    provenance = addCategoryFilter(provenance, value, categoryColumns);
  }

  return { ...sheet, provenance };
}

/**
 * @param {Record<string, object>} dataSheets
 * @param {object} chart
 * @param {{ kalshiCategory?: string; polymarketCategory?: string }} params
 * @param {import("@/config/runYourselfDashboardCharts").DashboardChartParameterMode} parameterMode
 */
export function patchSheetsForDashboardChart(dataSheets, chart, params, parameterMode) {
  if (parameterMode === "none") return dataSheets;

  const chartSheetIds = collectSheetClosureForCharts(dataSheets, [chart]);
  /** @type {Set<string>} */
  const patchTargets = new Set();
  for (const sheetId of chartSheetIds) {
    collectLakePullSheetIds(dataSheets, sheetId, patchTargets);
  }

  const out = { ...dataSheets };

  for (const sheetId of patchTargets) {
    let sheet = out[sheetId];
    if (!sheet) continue;

    if (parameterMode === "category_optional") {
      sheet = patchSheetCategory(sheet, params.kalshiCategory, "kalshi");
      if (!sheetLake(sheet)) {
        sheet = patchSheetCategory(sheet, params.kalshiCategory, "any");
      }
    } else if (parameterMode === "dual_category_optional") {
      sheet = patchSheetCategory(sheet, params.kalshiCategory, "kalshi");
      sheet = patchSheetCategory(sheet, params.polymarketCategory, "polymarket");
    }

    out[sheetId] = sheet;
  }

  return out;
}

/**
 * Apply per-chart parameters across a dashboard fork.
 *
 * @param {Record<string, object>} dataSheets
 * @param {object[]} sourceCharts
 * @param {object} dashboardLayout
 * @param {string} analysisId
 * @param {Record<string, { kalshiCategory?: string; polymarketCategory?: string }>} chartParameters
 */
export function patchDashboardSheetsByChart(
  dataSheets,
  sourceCharts,
  dashboardLayout,
  analysisId,
  chartParameters,
) {
  let out = cloneSheets(dataSheets);
  const chartsById = new Map(sourceCharts.map((c) => [String(c._id), c]));
  const rows = Array.isArray(dashboardLayout?.rows) ? dashboardLayout.rows : [];

  for (const row of rows) {
    if (row?.type !== "cards" || !Array.isArray(row.columns)) continue;
    for (const col of row.columns) {
      const chartId = col?.chart_id ? String(col.chart_id) : "";
      const chart = chartsById.get(chartId);
      if (!chart) continue;

      const slot = resolveDashboardChartSlot(analysisId, col);
      if (!slot || slot.parameterMode === "none") continue;

      const params = chartParameters[slot.key] || chartParameters[col.id] || {};
      out = patchSheetsForDashboardChart(out, chart, params, slot.parameterMode);
    }
  }

  return out;
}
