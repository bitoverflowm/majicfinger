import { parseNumberTypedCell } from "@/lib/coerceNumberTypedCells";
import { aggregateNumericValues } from "@/lib/sheetOperations/computeSummaryRow";
import { replayOperations } from "@/lib/projectPersistence";

export const MULTI_SHEET_SUMMARY_OPS = [
  "count_rows",
  "sum",
  "avg",
  "mean",
  "min",
  "max",
  "count",
  "count_distinct",
  "stdev",
  "median",
];

export const MULTI_SHEET_IDENTITY_COLUMNS = ["sheet", "source_sheet_id"];

function newMetricId() {
  return `msm-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * @returns {{ id: string; outputName: string; op: string; column: string | null }}
 */
export function createEmptyMultiSheetMetric() {
  return {
    id: newMetricId(),
    outputName: "",
    op: "avg",
    column: null,
  };
}

/**
 * @param {object | null | undefined} raw
 * @param {number} [idx]
 * @returns {{ id: string; outputName: string; op: string; column: string | null } | null}
 */
function normalizeMultiSheetMetric(raw, idx = 0) {
  if (!raw || typeof raw !== "object") return null;
  const op = MULTI_SHEET_SUMMARY_OPS.includes(raw.op) ? raw.op : "avg";
  const outputName = String(raw.outputName || "").trim();
  const columnRaw =
    raw.column != null
      ? String(raw.column).trim()
      : Array.isArray(raw.columns) && raw.columns[0]
        ? String(raw.columns[0]).trim()
        : "";
  return {
    id: String(raw.id || `msm-${idx}`),
    outputName,
    op,
    column: op === "count_rows" ? null : columnRaw || null,
  };
}

/**
 * @param {object | null | undefined} raw
 * @returns {{
 *   sourceSheetIds: string[];
 *   metrics: { id: string; outputName: string; op: string; column: string | null }[];
 *   resultSheetId: string | null;
 * }}
 */
export function normalizeMultiSheetSummaryConfig(raw) {
  const idsIn = Array.isArray(raw?.sourceSheetIds) ? raw.sourceSheetIds : [];
  const seen = new Set();
  const sourceSheetIds = [];
  for (const id of idsIn) {
    const sid = String(id || "").trim();
    if (!sid || seen.has(sid)) continue;
    seen.add(sid);
    sourceSheetIds.push(sid);
  }
  const metricsIn = Array.isArray(raw?.metrics) ? raw.metrics : [];
  const metrics = metricsIn.map((m, idx) => normalizeMultiSheetMetric(m, idx)).filter(Boolean);
  return {
    sourceSheetIds,
    metrics,
    resultSheetId: raw?.resultSheetId != null ? String(raw.resultSheetId).trim() || null : null,
  };
}

/**
 * @param {unknown[]} rows
 * @param {string} column
 * @returns {number[]}
 */
function finiteNumsFromColumn(rows, column) {
  const col = String(column || "").trim();
  if (!col) return [];
  const out = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const n = parseNumberTypedCell(row[col]);
    if (n != null) out.push(n);
  }
  return out;
}

/**
 * Evaluate one metric against one sheet's rows.
 * @param {object[]} rows
 * @param {{ op: string; column?: string | null }} metric
 * @returns {number | null}
 */
export function evaluateMultiSheetMetric(rows, metric) {
  const list = Array.isArray(rows) ? rows : [];
  const op = metric?.op === "mean" ? "avg" : String(metric?.op || "");
  if (op === "count_rows") return list.length;
  const column = String(metric?.column || "").trim();
  if (!column) return null;
  if (op === "count" || op === "count_distinct") {
    // Count non-empty cells (including non-numeric) for count; distinct on stringified values.
    const values = [];
    for (const row of list) {
      if (!row || typeof row !== "object") continue;
      const raw = row[column];
      if (raw == null || raw === "") continue;
      values.push(raw);
    }
    if (op === "count") return values.length;
    return new Set(values.map((v) => String(v))).size;
  }
  const nums = finiteNumsFromColumn(list, column);
  return aggregateNumericValues(nums, op);
}

/**
 * Build one summary row per selected source sheet.
 *
 * @param {Record<string, object> | null | undefined} dataSheets
 * @param {object | null | undefined} config
 * @returns {{
 *   rows: object[];
 *   columns: string[];
 *   errors: string[];
 *   metricColumns: string[];
 * }}
 */
export function computeMultiSheetSummary(dataSheets, config) {
  const cfg = normalizeMultiSheetSummaryConfig(config);
  /** @type {string[]} */
  const errors = [];
  if (!cfg.sourceSheetIds.length) {
    errors.push("Select at least one sheet.");
  }
  if (!cfg.metrics.length) {
    errors.push("Add at least one summary column.");
  }

  const metricColumns = [];
  const seenNames = new Set();
  for (const m of cfg.metrics) {
    const name = String(m.outputName || "").trim();
    if (!name) {
      errors.push("Each column needs a label.");
      continue;
    }
    if (MULTI_SHEET_IDENTITY_COLUMNS.includes(name)) {
      errors.push(`Column label "${name}" is reserved.`);
      continue;
    }
    if (seenNames.has(name)) {
      errors.push(`Duplicate column label "${name}".`);
      continue;
    }
    seenNames.add(name);
    if (m.op !== "count_rows" && !String(m.column || "").trim()) {
      errors.push(`Column "${name}" needs a source column.`);
      continue;
    }
    metricColumns.push(name);
  }

  if (errors.length) {
    return { rows: [], columns: [...MULTI_SHEET_IDENTITY_COLUMNS], errors, metricColumns: [] };
  }

  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  /** @type {object[]} */
  const rows = [];

  for (const sid of cfg.sourceSheetIds) {
    const sheet = sheets[sid];
    if (!sheet || typeof sheet !== "object") {
      errors.push(`Sheet "${sid}" was not found.`);
      continue;
    }
    const sheetRows = Array.isArray(sheet.data) ? sheet.data : [];
    /** @type {Record<string, unknown>} */
    const row = {
      sheet: String(sheet.name || sid),
      source_sheet_id: sid,
    };
    for (const metric of cfg.metrics) {
      const name = String(metric.outputName || "").trim();
      row[name] = evaluateMultiSheetMetric(sheetRows, metric);
    }
    rows.push(row);
  }

  return {
    rows,
    columns: [...MULTI_SHEET_IDENTITY_COLUMNS, ...metricColumns],
    errors,
    metricColumns,
  };
}

/** Ops that define the summary itself — not layered math/filter work on top. */
const MULTI_SHEET_BASE_OP_TYPES = new Set(["summary.multi_sheet", "source.compose"]);

/**
 * Follow-on ops recorded after (or alongside) a multi-sheet summary that must be
 * re-applied whenever the base summary is recomputed (save/load or live sync).
 *
 * @param {unknown[]} operationHistory
 * @returns {object[]}
 */
export function multiSheetSummaryFollowOnOperations(operationHistory) {
  return (Array.isArray(operationHistory) ? operationHistory : []).filter((op) => {
    const type = String(op?.type || "");
    return type && !MULTI_SHEET_BASE_OP_TYPES.has(type);
  });
}

/**
 * Recompute multi-sheet summary rows, then replay saved follow-on operations
 * (computed columns, buckets, etc.) so math on top of the summary survives reload.
 *
 * @param {Record<string, object> | null | undefined} dataSheets
 * @param {string} sheetId
 * @param {object | null | undefined} sheet
 * @param {object | null | undefined} [configOverride]
 * @returns {{
 *   rows: object[];
 *   columns: string[];
 *   errors: string[];
 *   metricColumns: string[];
 *   followOnOperations: object[];
 * } | null}
 */
export function recomputeMultiSheetSummaryWithHistory(
  dataSheets,
  sheetId,
  sheet,
  configOverride = null,
) {
  const cfg = configOverride || sheet?.multiSheetSummaryConfig;
  if (!cfg) return null;
  const computed = computeMultiSheetSummary(dataSheets, cfg);
  if (computed.errors.length) {
    return { ...computed, followOnOperations: [] };
  }
  const followOnOperations = multiSheetSummaryFollowOnOperations(sheet?.operationHistory);
  if (!followOnOperations.length) {
    return { ...computed, followOnOperations };
  }
  const rows = replayOperations({
    rows: computed.rows,
    operations: followOnOperations,
    dataSheets,
    activeSheetId: sheetId,
  });
  return {
    ...computed,
    rows: Array.isArray(rows) ? rows : computed.rows,
    followOnOperations,
  };
}

/**
 * Stable fingerprint for live-sync: base metrics + follow-on op identity.
 * @param {object[]} rows
 * @param {string[]} metricColumns
 * @param {object[]} followOnOperations
 */
export function multiSheetSummarySyncFingerprint(rows, metricColumns, followOnOperations) {
  const base = (Array.isArray(rows) ? rows : [])
    .map((r) => {
      const metrics = (Array.isArray(metricColumns) ? metricColumns : [])
        .map((c) => `${c}=${r?.[c]}`)
        .join(",");
      return `${r?.source_sheet_id}:${metrics}`;
    })
    .join("|");
  const follow = (Array.isArray(followOnOperations) ? followOnOperations : [])
    .map((op) => `${op?.type || ""}:${op?.id || ""}:${op?.column || ""}:${op?.ts || ""}`)
    .join(";");
  return `${base}##${follow}`;
}

/**
 * After project load (or Athena rehydrate), rebuild every multi-sheet summary tab
 * including follow-on math so charts can read those columns before the grid mounts.
 *
 * @param {Record<string, object> | null | undefined} dataSheets
 * @returns {Record<string, object>}
 */
export function recomputeAllMultiSheetSummarySheets(dataSheets) {
  const base = dataSheets && typeof dataSheets === "object" ? { ...dataSheets } : {};
  let changed = false;
  for (const [sid, sheet] of Object.entries(base)) {
    const cfg = sheet?.multiSheetSummaryConfig;
    if (!cfg || !Array.isArray(cfg.sourceSheetIds) || !cfg.sourceSheetIds.length) continue;
    if (!Array.isArray(cfg.metrics) || !cfg.metrics.length) continue;
    const resultId = String(cfg.resultSheetId || sid);
    if (resultId !== sid) continue;
    const out = recomputeMultiSheetSummaryWithHistory(base, sid, sheet);
    if (!out || out.errors.length) continue;
    base[sid] = {
      ...sheet,
      data: out.rows,
      dataTypes: {
        ...(sheet.dataTypes || {}),
        ...Object.fromEntries((out.metricColumns || []).map((c) => [c, "number"])),
      },
    };
    changed = true;
  }
  return changed ? base : dataSheets && typeof dataSheets === "object" ? dataSheets : {};
}

/**
 * Union of column names across selected sheets (first-row keys + columns meta).
 * @param {Record<string, object> | null | undefined} dataSheets
 * @param {string[]} sourceSheetIds
 * @returns {string[]}
 */
export function collectMultiSheetColumnUnion(dataSheets, sourceSheetIds) {
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  const keys = new Set();
  for (const id of sourceSheetIds || []) {
    const sid = String(id || "").trim();
    const sheet = sheets[sid];
    if (!sheet) continue;
    const rows = Array.isArray(sheet.data) ? sheet.data : [];
    if (rows[0] && typeof rows[0] === "object") {
      for (const k of Object.keys(rows[0])) {
        if (k && !k.startsWith("_")) keys.add(k);
      }
    }
    const cols = Array.isArray(sheet.columns) ? sheet.columns : [];
    for (const c of cols) {
      const name = typeof c === "string" ? c : c?.field || c?.name || "";
      if (name && !String(name).startsWith("_")) keys.add(String(name));
    }
  }
  return [...keys].sort((a, b) => a.localeCompare(b));
}

/**
 * @param {Record<string, object> | null | undefined} dataSheets
 * @param {string[]} sourceSheetIds
 * @param {string} column
 * @returns {string[]} sheet ids missing the column
 */
export function sheetsMissingColumn(dataSheets, sourceSheetIds, column) {
  const col = String(column || "").trim();
  if (!col) return [];
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  const missing = [];
  for (const id of sourceSheetIds || []) {
    const sid = String(id || "").trim();
    const sheet = sheets[sid];
    if (!sheet) {
      missing.push(sid);
      continue;
    }
    const union = collectMultiSheetColumnUnion({ [sid]: sheet }, [sid]);
    if (!union.includes(col)) missing.push(sid);
  }
  return missing;
}
