import {
  buildRequestCardQuerySummary,
  formatConnectRequestCardQuery,
  summarizeComposeWhereFilters,
} from "@/lib/connectHomeRequestQuery";
import { buildSourceComposeOperation } from "@/lib/projectPersistence";
import { collectLakePullSheetIds } from "@/lib/runYourself/patchDashboardChartSheets";

function genRequestCardId() {
  return `req-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Replace stale `source.compose` entries with the sheet's current (patched) provenance.
 * @param {object} sheet
 */
export function refreshForkOperationHistory(sheet) {
  const provenance = sheet?.provenance;
  const existing = Array.isArray(sheet?.operationHistory) ? sheet.operationHistory.filter(Boolean) : [];
  const nonSource = existing.filter((op) => op?.type !== "source.compose");

  if (provenance && (provenance.kind === "compose" || provenance.kind === "compose_browser_join")) {
    const sourceOp = buildSourceComposeOperation(provenance);
    return sourceOp ? [sourceOp, ...nonSource] : nonSource;
  }

  return existing.map((op) => {
    if (op?.type !== "source.compose" || !provenance) return op;
    return buildSourceComposeOperation(provenance) || op;
  });
}

/**
 * @param {object} sheet
 * @param {string} sheetId
 * @param {{ rowCount?: number; forkLabel?: string }} [opts]
 */
function buildComposeRequestCard(sheet, sheetId, opts = {}) {
  const prov = sheet?.provenance;
  if (!prov || prov.kind !== "compose") return null;

  const composeSpec = prov.composeSpec && typeof prov.composeSpec === "object" ? prov.composeSpec : {};
  const filters = prov.composeFilters && typeof prov.composeFilters === "object" ? prov.composeFilters : null;
  const whereSummary = summarizeComposeWhereFilters(filters);
  const selectItems = Array.isArray(composeSpec.select) ? composeSpec.select : [];
  const selectAliases = selectItems
    .map((i) => String(i?.alias || i?.column || "").trim())
    .filter(Boolean);
  const selectColumns = selectItems
    .map((i) => String(i?.column || "").trim())
    .filter(Boolean);
  const rowCount = opts.rowCount ?? sheet.rowCount ?? (Array.isArray(sheet.data) ? sheet.data.length : 0);

  const querySummary = buildRequestCardQuerySummary({
    lake: prov.lake,
    table: prov.table,
    composeSpec,
    selectAliases,
    hasWhere: whereSummary.hasWhere,
    whereText: whereSummary.text,
    composeRowLimit: prov.composeAthenaRowLimit ?? null,
  });

  return {
    id: genRequestCardId(),
    kind: "compose",
    createdAt: Date.now(),
    elapsedMs: null,
    forkReplay: true,
    forkLabel: opts.forkLabel || null,
    lake: prov.lake,
    table: prov.table,
    sheetId,
    sheetLabel: String(sheet.name || sheetId),
    selectAliases,
    selectColumns,
    hasWhere: whereSummary.hasWhere,
    whereText: whereSummary.text,
    composeRowLimit: prov.composeAthenaRowLimit ?? null,
    loadedRowCount: rowCount,
    querySummary,
  };
}

/**
 * @param {object} op
 */
function operationAnalysisSummary(op) {
  if (!op || typeof op !== "object") return "";
  if (op.type === "bucket.sheet") {
    const mode = String(op.bucketMode || "time");
    const col = String(op.bucketColumn || "value").trim();
    const aggs = Array.isArray(op.aggregations) ? op.aggregations : [];
    const aggText = aggs
      .map((a) => String(a?.fn || a?.aggregate || a?.function || "").trim())
      .filter(Boolean)
      .join(", ");
    return aggText ? `${mode} bucket · ${col} · ${aggText}` : `${mode} bucket · ${col}`;
  }
  if (op.type === "aggregate") return "Aggregate";
  if (op.type === "join.sheet") return "Join sheets";
  if (op.type === "filter.rows") return "Filter rows";
  if (op.type === "select.columns") return "Select columns";
  if (op.type === "refine.query") {
    const cols = Array.isArray(op.selectColumns) ? op.selectColumns.join(", ") : "";
    const scope = String(op.scope || "preview");
    return cols ? `Refine (${scope}): ${cols}` : `Refine (${scope})`;
  }
  if (op.type === "sort.rows") return "Sort rows";
  return String(op.type || "analysis").replace(/\./g, " ");
}

/**
 * @param {object} sheet
 * @param {string} sheetId
 * @param {number} rowCount
 */
function buildAnalysisRequestCards(sheet, sheetId, rowCount) {
  const history = refreshForkOperationHistory(sheet).filter((op) => op?.type !== "source.compose");
  if (!history.length) return [];

  return history.map((op) => ({
    id: genRequestCardId(),
    kind: "analysis",
    createdAt: Date.now(),
    elapsedMs: null,
    forkReplay: true,
    sheetId,
    sheetLabel: String(sheet.name || sheetId),
    loadedRowCount: rowCount,
    querySummary: operationAnalysisSummary(op),
    operationType: op.type,
  }));
}

/**
 * @param {object} card
 * @param {object} sheet
 * @param {string} sheetId
 * @param {Record<string, object>} allSheets
 * @param {number} rowCount
 */
function refreshExistingRequestCard(card, sheet, sheetId, allSheets, rowCount) {
  const next = {
    ...card,
    id: genRequestCardId(),
    createdAt: Date.now(),
    forkReplay: true,
    sheetId,
    sheetLabel: String(sheet.name || sheetId),
    loadedRowCount: rowCount,
  };

  if (next.refine?.sourceSheetId) {
    const src = allSheets[next.refine.sourceSheetId];
    next.refine = {
      ...next.refine,
      sourceSheetLabel: String(src?.name || next.refine.sourceSheetLabel || next.refine.sourceSheetId),
    };
  }

  if (next.join) {
    next.join = {
      ...next.join,
      leftSheetLabel: next.join.leftSheetId
        ? String(allSheets[next.join.leftSheetId]?.name || next.join.leftSheetLabel || next.join.leftSheetId)
        : next.join.leftSheetLabel,
      rightSheetLabel: next.join.rightSheetId
        ? String(allSheets[next.join.rightSheetId]?.name || next.join.rightSheetLabel || next.join.rightSheetId)
        : next.join.rightSheetLabel,
    };
  }

  const staleSummary = { ...next, querySummary: "" };
  next.querySummary = formatConnectRequestCardQuery(staleSummary, sheet) || next.querySummary || "";
  return next;
}

/**
 * @param {object} sheet
 * @param {string} sheetId
 * @param {Record<string, object>} allSheets
 * @param {number} rowCount
 * @param {string} [forkLabel]
 */
function refreshForkRequestCards(sheet, sheetId, allSheets, rowCount, forkLabel) {
  /** @type {Set<string>} */
  const lakePullIds = new Set();
  collectLakePullSheetIds(allSheets, sheetId, lakePullIds);

  if (lakePullIds.has(sheetId) && sheet?.provenance?.kind === "compose") {
    const card = buildComposeRequestCard(sheet, sheetId, { rowCount, forkLabel });
    return card ? [card] : [];
  }

  const cards = Array.isArray(sheet?.requestCards) ? sheet.requestCards : [];
  if (cards.length) {
    return cards.map((card) => refreshExistingRequestCard(card, sheet, sheetId, allSheets, rowCount));
  }

  return buildAnalysisRequestCards(sheet, sheetId, rowCount);
}

/**
 * Refresh SQL request cards + operation history after fork replay with new market/category filters.
 *
 * @param {{
 *   dataSheets: Record<string, object>;
 *   sheetOrder: string[];
 *   presentation?: { paramLabel?: string; analysisLabel?: string };
 * }} opts
 */
export function refreshForkSheetRequestMetadata({ dataSheets, sheetOrder, presentation }) {
  const sheets = { ...(dataSheets || {}) };
  const forkLabel =
    String(presentation?.paramLabel || presentation?.analysisLabel || "").trim() || "Run for yourself fork";

  for (const sheetId of sheetOrder) {
    const sheet = sheets[sheetId];
    if (!sheet) continue;

    const rowCount = sheet.rowCount ?? (Array.isArray(sheet.data) ? sheet.data.length : 0);
    const operationHistory = refreshForkOperationHistory(sheet);
    const requestCards = refreshForkRequestCards(sheet, sheetId, sheets, rowCount, forkLabel);

    sheets[sheetId] = {
      ...sheet,
      operationHistory,
      requestCards,
    };
  }

  return sheets;
}
