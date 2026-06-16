import { isColumnAllowedOnLakeTable } from "@/lib/dataLake/lakeTableColumns";
import { DEFAULT_SNAPSHOT_CHECKPOINTS } from "@/lib/sheetOperations/quant/columnInference";

function uniqueStrings(list) {
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const s = String(item || "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** @param {object | null | undefined} sheet */
export function inferMetricColumnsFromPreviewSheet(sheet) {
  const rows = Array.isArray(sheet?.data) ? sheet.data : [];
  const keys = new Set();
  for (const row of rows.slice(0, 20)) {
    if (!row || typeof row !== "object") continue;
    for (const k of Object.keys(row)) {
      if (!k.startsWith("selected_") || k === "selected_progress_value") continue;
      keys.add(k.slice("selected_".length));
    }
  }
  return [...keys];
}

/** @param {object | null | undefined} sheet */
export function inferCheckpointsFromPreviewSheet(sheet) {
  const rows = Array.isArray(sheet?.data) ? sheet.data : [];
  const cps = new Set();
  for (const row of rows) {
    const v = row?.lifecycle_checkpoint;
    if (v == null || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) cps.add(n);
  }
  const sorted = [...cps].sort((a, b) => a - b);
  return sorted.length ? sorted : null;
}

function filterJoinTableColumns(lake, table, columns) {
  const L = String(lake || "kalshi").toLowerCase();
  const T = String(table || "trades").toLowerCase();
  return uniqueStrings(
    (Array.isArray(columns) ? columns : []).filter((c) => isColumnAllowedOnLakeTable(L, T, c)),
  );
}

function inferJoinTableColumns(join, quant) {
  const lake = join.lake || "kalshi";
  const table = join.table || "trades";
  const progressColumn = String(quant.progressColumn || "").trim();

  const saved = filterJoinTableColumns(lake, table, join.columns);
  if (saved.length) return saved;

  const fromMetrics = filterJoinTableColumns(lake, table, quant.metricColumns);
  const out = uniqueStrings([progressColumn, ...fromMetrics]);
  return out.length ? out : ["created_time"];
}

function parentSheetColumns(dataSheets, rootSheetId) {
  const parent = dataSheets?.[rootSheetId];
  if (!parent) return [];
  if (Array.isArray(parent.columns) && parent.columns.length) return parent.columns;
  const row = Array.isArray(parent.data) ? parent.data[0] : null;
  return row && typeof row === "object" ? Object.keys(row) : [];
}

/**
 * Fill gaps in a saved quant Athena op so reload matches the original run.
 * @param {{
 *   sheet: object;
 *   operation: object;
 *   dataSheets?: Record<string, object>;
 *   rootSheetId?: string;
 * }}
 */
export function restoreQuantAthenaReplayConfig({ sheet, operation, dataSheets, rootSheetId }) {
  const op = operation && typeof operation === "object" ? operation : {};
  const join = { ...(op.join && typeof op.join === "object" ? op.join : {}) };
  const quant = {
    mode: "snapshot",
    snapshotRule: "latest_before",
    endRule: "auto",
    ...(op.quant && typeof op.quant === "object" ? op.quant : {}),
  };

  const previewMetrics = inferMetricColumnsFromPreviewSheet(sheet);
  const parentCols = parentSheetColumns(dataSheets, rootSheetId);

  if (!Array.isArray(quant.metricColumns) || !quant.metricColumns.length) {
    if (previewMetrics.length) {
      quant.metricColumns = previewMetrics;
    } else if (parentCols.length) {
      const group = String(quant.groupColumn || join.leftKeyColumn || "ticker").trim();
      quant.metricColumns = parentCols.filter((c) => c !== group);
    }
  }
  quant.metricColumns = uniqueStrings(quant.metricColumns);

  const previewCheckpoints = inferCheckpointsFromPreviewSheet(sheet);
  if (!Array.isArray(quant.checkpoints) || !quant.checkpoints.length) {
    quant.checkpoints = previewCheckpoints || DEFAULT_SNAPSHOT_CHECKPOINTS;
  }

  if (!quant.endRule || quant.endRule === "auto") {
    const endCol =
      quant.endColumn ||
      (previewMetrics.includes("close_time") ? "close_time" : "") ||
      (parentCols.includes("close_time") ? "close_time" : "");
    if (endCol) {
      quant.endRule = "column";
      quant.endColumn = endCol;
      if (!quant.metricColumns.includes(endCol)) {
        quant.metricColumns = uniqueStrings([...quant.metricColumns, endCol]);
      }
    }
  }

  if (quant.endRule === "column" && quant.endColumn) {
    const endCol = String(quant.endColumn).trim();
    if (endCol && !quant.metricColumns.includes(endCol)) {
      quant.metricColumns = uniqueStrings([...quant.metricColumns, endCol]);
    }
  }

  if (!quant.groupColumn) {
    quant.groupColumn = join.leftKeyColumn || "ticker";
  }

  if (!quant.joinValueColumn) {
    const priceLike = previewMetrics.find((c) => /^(yes_price|no_price|price|probability)$/i.test(c));
    if (priceLike) quant.joinValueColumn = priceLike;
    else if (previewMetrics.includes("yes_price")) quant.joinValueColumn = "yes_price";
  }

  const joinColumns = inferJoinTableColumns(join, quant);

  return { join: { ...join, columns: joinColumns }, quant };
}
