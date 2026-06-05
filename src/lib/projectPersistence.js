import { isLakeBigintColumnName } from "@/lib/dataLake/lakeTableColumns";
import { normalizeLakeBigintCellValue } from "@/lib/dataLake/lakeBigintNormalize";
import { aggregateBucketRows } from "@/lib/sheetOperations/aggregateBucketRows";
import { compareConditionValues } from "@/lib/ifElseConditionValues";

export const PROJECT_FULL_DATA_SAFE_BYTES = 12 * 1024 * 1024;
export const PROJECT_PREVIEW_ROW_LIMIT = 50000;
export const PROJECT_MIN_PREVIEW_ROW_LIMIT = 25;

function jsonStringifySafe(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return "null";
  }
}

export function estimateJsonBytes(value) {
  const str = jsonStringifySafe(value);
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str).length;
  }
  return str.length;
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function hashJson(value) {
  return hashString(jsonStringifySafe(value));
}

function stableSheetForRevision(sheet) {
  if (!sheet || typeof sheet !== "object") return sheet;
  const saveMeta = sheet.saveMeta && typeof sheet.saveMeta === "object"
    ? { ...sheet.saveMeta }
    : null;
  if (saveMeta) delete saveMeta.savedAt;
  return {
    ...sheet,
    saveMeta,
  };
}

export function buildProjectRevision(project) {
  const sheets = project?.data_sheets && typeof project.data_sheets === "object" ? project.data_sheets : {};
  const sheetHashes = Object.entries(sheets)
    .sort(([a], [b]) => String(a).localeCompare(String(b)))
    .map(([sheetId, sheet]) => [sheetId, hashJson(stableSheetForRevision(sheet))]);
  return hashJson({
    data_set_name: project?.data_set_name || "",
    labels: Array.isArray(project?.labels) ? project.labels : [],
    source: project?.source || "",
    sheetHashes,
  });
}

export function buildProjectDeltaPayload({ baseProject, currentPayload }) {
  const baseSheets = baseProject?.data_sheets && typeof baseProject.data_sheets === "object" ? baseProject.data_sheets : {};
  const nextSheets = currentPayload?.data_sheets && typeof currentPayload.data_sheets === "object" ? currentPayload.data_sheets : {};
  const changedSheets = {};
  const deletedSheetIds = [];

  for (const [sheetId, sheet] of Object.entries(nextSheets)) {
    const before = baseSheets[sheetId];
    if (!before || hashJson(stableSheetForRevision(before)) !== hashJson(stableSheetForRevision(sheet))) {
      changedSheets[sheetId] = sheet;
    }
  }

  for (const sheetId of Object.keys(baseSheets)) {
    if (!Object.prototype.hasOwnProperty.call(nextSheets, sheetId)) {
      deletedSheetIds.push(sheetId);
    }
  }

  const changedTopLevel = {};
  for (const key of ["data_set_name", "labels", "source"]) {
    if (hashJson(baseProject?.[key]) !== hashJson(currentPayload?.[key])) {
      changedTopLevel[key] = currentPayload?.[key];
    }
  }

  const hasChanges =
    Object.keys(changedSheets).length > 0 ||
    deletedSheetIds.length > 0 ||
    Object.keys(changedTopLevel).length > 0;

  return {
    baseRevision: baseProject?.save_revision || buildProjectRevision(baseProject || {}),
    patch: {
      ...changedTopLevel,
      changedSheets,
      deletedSheetIds,
      last_saved_date: currentPayload?.last_saved_date || new Date(),
    },
    hasChanges,
    changedSheetCount: Object.keys(changedSheets).length,
    deletedSheetCount: deletedSheetIds.length,
  };
}

export function inferColumnsFromRows(rows) {
  const seen = new Set();
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    for (const k of Object.keys(row)) {
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
    if (out.length >= 500) break;
  }
  return out;
}

function genOperationId(type) {
  return `${String(type || "op").replace(/[^a-z0-9_.-]+/gi, "-")}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createSheetOperation(type, payload = {}) {
  return {
    id: payload.id || genOperationId(type),
    ts: payload.ts || Date.now(),
    type,
    ...payload,
  };
}

export function buildSourceComposeOperation(provenance) {
  if (!provenance || typeof provenance !== "object") return null;
  if (provenance.kind !== "compose" && provenance.kind !== "compose_browser_join") return null;
  return createSheetOperation("source.compose", {
    provenance,
    lake: provenance.lake,
    table: provenance.table,
  });
}

export function normalizeOperationHistory(sheet) {
  const existing = Array.isArray(sheet?.operationHistory) ? sheet.operationHistory.filter(Boolean) : [];
  const hasSource = existing.some((op) => op?.type === "source.compose");
  const source = hasSource ? null : buildSourceComposeOperation(sheet?.provenance);
  return source ? [source, ...existing] : existing;
}

export function appendSheetOperation(dataSheets, sheetId, operation) {
  if (!sheetId || !operation) return dataSheets;
  const sheets = dataSheets || {};
  const sheet = sheets[sheetId];
  if (!sheet) return dataSheets;
  const history = normalizeOperationHistory(sheet);
  return {
    ...sheets,
    [sheetId]: {
      ...sheet,
      operationHistory: [...history, operation],
    },
  };
}

export function isIfElseComputedOperation(op) {
  return op?.type === "computed.column" && op?.expression?.kind === "if-else";
}

export function replaceSheetOperation(dataSheets, sheetId, operationId, nextOperation) {
  if (!sheetId || !operationId || !nextOperation) return dataSheets;
  const sheets = dataSheets || {};
  const sheet = sheets[sheetId];
  if (!sheet) return dataSheets;
  const history = normalizeOperationHistory(sheet);
  return {
    ...sheets,
    [sheetId]: {
      ...sheet,
      operationHistory: history.map((op) =>
        op?.id === operationId
          ? { ...nextOperation, id: operationId, ts: Date.now() }
          : op,
      ),
    },
  };
}

function sheetColumns(sheet, rows) {
  return Array.isArray(sheet?.columns) && sheet.columns.length
    ? sheet.columns
    : inferColumnsFromRows(rows);
}

function buildSheetRecord(sheetId, sheet, rows, { storageMode, previewLimit, estimatedFullBytes }) {
  const rowList = Array.isArray(rows) ? rows : [];
  const data = storageMode === "inline" ? rowList : rowList.slice(0, previewLimit);
  const columns = sheetColumns(sheet, rowList);
  const operationHistory = normalizeOperationHistory(sheet);
  const savedAt = new Date().toISOString();
  return {
    name: String(sheet?.name || sheetId),
    data,
    storageMode,
    rowCount: rowList.length,
    fullRowCount: rowList.length,
    previewRowCount: data.length,
    columns,
    dataTypes: sheet?.dataTypes || null,
    provenance: sheet?.provenance ?? null,
    operationHistory,
    requestCards: Array.isArray(sheet?.requestCards) ? sheet.requestCards : [],
    rehydrationStatus: storageMode === "provenance" ? "preview" : "complete",
    saveMeta: {
      truncated: storageMode === "provenance",
      savedAt,
      estimatedFullBytes,
      previewHash: hashJson(data),
      columnHash: hashJson(columns),
    },
  };
}

function buildSheets(dataSheets, previewLimit, forceProvenance) {
  const entries = Object.entries(dataSheets || {});
  return entries.reduce((acc, [sheetId, sheet]) => {
    const rows = Array.isArray(sheet?.data) ? sheet.data : [];
    const name = String(sheet?.name || sheetId);
    const hasData = rows.length > 0;
    const hasName = !!name.trim();
    if (!hasData && !hasName) return acc;
    const estimatedFullBytes = estimateJsonBytes(rows);
    const shouldProvenance =
      forceProvenance &&
      (rows.length > previewLimit || estimatedFullBytes > 1024 * 1024);
    acc[sheetId] = buildSheetRecord(sheetId, sheet, rows, {
      storageMode: shouldProvenance ? "provenance" : "inline",
      previewLimit,
      estimatedFullBytes,
    });
    return acc;
  }, {});
}

function shrinkProvenancePreviewsUntilWithinBudget(payload, safeBytes) {
  let next = payload;
  let estimatedBytes = estimateJsonBytes(next);
  let previewLimit = PROJECT_MIN_PREVIEW_ROW_LIMIT;

  while (estimatedBytes > safeBytes && previewLimit >= 0) {
    const sheets = next?.data_sheets && typeof next.data_sheets === "object" ? next.data_sheets : {};
    const trimmedSheets = Object.entries(sheets).reduce((acc, [sheetId, sheet]) => {
      const rows = Array.isArray(sheet?.data) ? sheet.data : [];
      const isProvenance = sheet?.storageMode === "provenance";
      acc[sheetId] = {
        ...sheet,
        data: isProvenance ? rows.slice(0, previewLimit) : rows,
        previewRowCount: isProvenance ? Math.min(rows.length, previewLimit) : sheet?.previewRowCount,
        saveMeta: {
          ...(sheet?.saveMeta || {}),
          previewHash: isProvenance ? hashJson(rows.slice(0, previewLimit)) : sheet?.saveMeta?.previewHash,
        },
      };
      return acc;
    }, {});
    next = {
      ...next,
      data: Array.isArray(next?.data) ? next.data.slice(0, previewLimit) : [],
      data_sheets: trimmedSheets,
    };
    estimatedBytes = estimateJsonBytes(next);
    if (previewLimit === 0) break;
    previewLimit = Math.floor(previewLimit / 2);
  }

  return { payload: next, estimatedBytes };
}

function convertLargestInlineSheetsToPreview(payload, safeBytes) {
  let next = payload;
  let estimatedBytes = estimateJsonBytes(next);
  const sheets = next?.data_sheets && typeof next.data_sheets === "object" ? next.data_sheets : {};
  const candidates = Object.entries(sheets)
    .filter(([, sheet]) => sheet?.storageMode !== "provenance" && Array.isArray(sheet?.data) && sheet.data.length > PROJECT_MIN_PREVIEW_ROW_LIMIT)
    .map(([sheetId, sheet]) => [sheetId, sheet, estimateJsonBytes(sheet.data)])
    .sort((a, b) => b[2] - a[2]);

  for (const [sheetId, sheet, estimatedFullBytes] of candidates) {
    if (estimatedBytes <= safeBytes) break;
    const previewRows = sheet.data.slice(0, PROJECT_MIN_PREVIEW_ROW_LIMIT);
    next = {
      ...next,
      data_sheets: {
        ...(next.data_sheets || {}),
        [sheetId]: {
          ...sheet,
          data: previewRows,
          storageMode: "provenance",
          previewRowCount: previewRows.length,
          rehydrationStatus: "preview",
          saveMeta: {
            ...(sheet.saveMeta || {}),
            truncated: true,
            estimatedFullBytes,
            previewHash: hashJson(previewRows),
            columnHash: sheet.saveMeta?.columnHash || hashJson(sheet.columns || inferColumnsFromRows(previewRows)),
          },
        },
      },
    };
    estimatedBytes = estimateJsonBytes(next);
  }

  return { payload: next, estimatedBytes };
}

export function prepareProjectDataPayload({
  projectName,
  connectedData,
  dataSheets,
  baseFields = {},
  safeBytes = PROJECT_FULL_DATA_SAFE_BYTES,
}) {
  const inlineSheets = buildSheets(dataSheets, PROJECT_PREVIEW_ROW_LIMIT, false);
  const inlinePayload = {
    data_set_name: projectName,
    data: Array.isArray(connectedData) ? connectedData : [],
    data_sheets: inlineSheets,
    ...baseFields,
  };
  const inlineBytes = estimateJsonBytes(inlinePayload);
  if (inlineBytes <= safeBytes) {
    return {
      payload: inlinePayload,
      mode: "inline",
      estimatedBytes: inlineBytes,
      warnings: [],
    };
  }

  let previewLimit = PROJECT_PREVIEW_ROW_LIMIT;
  let payload = null;
  let estimatedBytes = Number.POSITIVE_INFINITY;

  while (previewLimit >= PROJECT_MIN_PREVIEW_ROW_LIMIT) {
    const sheets = buildSheets(dataSheets, previewLimit, true);
    const legacyData = Array.isArray(connectedData) ? connectedData.slice(0, previewLimit) : [];
    payload = {
      data_set_name: projectName,
      data: legacyData,
      data_sheets: sheets,
      ...baseFields,
    };
    estimatedBytes = estimateJsonBytes(payload);
    if (estimatedBytes <= safeBytes) break;
    previewLimit = Math.floor(previewLimit / 2);
  }

  const previewTrimmed = estimatedBytes > safeBytes ? shrinkProvenancePreviewsUntilWithinBudget(payload, safeBytes) : { payload, estimatedBytes };
  const final = previewTrimmed.estimatedBytes > safeBytes
    ? convertLargestInlineSheetsToPreview(previewTrimmed.payload, safeBytes)
    : previewTrimmed;
  const sheets = final.payload?.data_sheets || {};
  const warnings = Object.entries(sheets)
    .filter(([, sheet]) => sheet?.storageMode === "provenance" && !sheet?.provenance)
    .map(([sheetId, sheet]) => `Sheet "${sheet?.name || sheetId}" is too large and has no Data Lake provenance; only its preview can be saved.`);

  return {
    payload: final.payload,
    mode: "hybrid",
    estimatedBytes: final.estimatedBytes,
    warnings: final.estimatedBytes > safeBytes
      ? [...warnings, "Project is still large after preview truncation; save may fail until external storage is added."]
      : warnings,
  };
}

export function summarizeDataSetForList(ds) {
  if (!ds || typeof ds !== "object") return ds;
  const source = typeof ds.toObject === "function" ? ds.toObject() : ds;
  const dataSheets = source.data_sheets && typeof source.data_sheets === "object" ? source.data_sheets : {};
  const summarizedSheets = Object.entries(dataSheets).reduce((acc, [sheetId, sheet]) => {
    const preview = Array.isArray(sheet?.data) ? sheet.data.slice(0, 25) : [];
    acc[sheetId] = {
      name: sheet?.name || sheetId,
      data: preview,
      storageMode: sheet?.storageMode || "inline",
      rowCount: sheet?.rowCount ?? sheet?.fullRowCount ?? (Array.isArray(sheet?.data) ? sheet.data.length : 0),
      fullRowCount: sheet?.fullRowCount ?? sheet?.rowCount ?? (Array.isArray(sheet?.data) ? sheet.data.length : 0),
      previewRowCount: preview.length,
      columns: Array.isArray(sheet?.columns) ? sheet.columns : inferColumnsFromRows(preview),
      provenance: sheet?.provenance ?? null,
      operationHistory: Array.isArray(sheet?.operationHistory) ? sheet.operationHistory : [],
      requestCards: Array.isArray(sheet?.requestCards) ? sheet.requestCards : [],
      rehydrationStatus: sheet?.rehydrationStatus || (sheet?.storageMode === "provenance" ? "preview" : "complete"),
      saveMeta: sheet?.saveMeta || null,
    };
    return acc;
  }, {});
  return {
    ...source,
    data: Array.isArray(source.data) ? source.data.slice(0, 25) : [],
    data_sheets: summarizedSheets,
  };
}

export function isSqlMappableOperation(op) {
  return [
    "source.compose",
    "select.columns",
    "filter.rows",
    "sort.rows",
    "limit.rows",
    "join.sheet",
    "aggregate",
  ].includes(String(op?.type || ""));
}

export function applyOperationToComposeSpec(composeSpec, op) {
  const next = { ...(composeSpec || {}) };
  if (!op || typeof op !== "object") return next;
  if (op.type === "select.columns" && Array.isArray(op.columns)) {
    next.select = op.columns;
  }
  if (op.type === "sort.rows" && Array.isArray(op.orderBy)) {
    next.orderBy = op.orderBy;
  }
  if (op.type === "limit.rows" && Number.isFinite(Number(op.limit))) {
    next.limit = Math.max(1, Math.floor(Number(op.limit)));
  }
  return next;
}

export function applyBrowserOperationToRows(rows, op) {
  const list = Array.isArray(rows) ? rows : [];
  if (!op || typeof op !== "object") return list;
  if (op.type === "bucket.sheet") {
    const bucketed = aggregateBucketRows(list, {
      bucketColumn: op.bucketColumn,
      bucketOutputColumn: op.bucketOutputColumn,
      bucketMode: op.bucketMode,
      timeInterval: op.timeInterval,
      numericBucketSize: op.numericBucketSize,
      passthroughColumns: op.passthroughColumns,
      aggregations: op.aggregations,
    });
    return bucketed.length ? bucketed : list;
  }
  if (op.type === "delete.column") {
    const col = String(op.column || "");
    return list.map((row) => {
      if (!row || typeof row !== "object") return row;
      const next = { ...row };
      delete next[col];
      return next;
    });
  }
  if (op.type === "rename.column") {
    const from = String(op.from || "");
    const to = String(op.to || "");
    if (!from || !to) return list;
    return list.map((row) => {
      if (!row || typeof row !== "object") return row;
      const next = { ...row, [to]: row[from] };
      delete next[from];
      return next;
    });
  }
  if (op.type === "cast.column") {
    const col = String(op.column || "");
    const dataType = String(op.dataType || "text");
    return list.map((row) => {
      if (!row || typeof row !== "object") return row;
      let value = row[col];
      if (dataType === "number") {
        value = isLakeBigintColumnName(col) ? normalizeLakeBigintCellValue(value) : Number(value);
      } else if (dataType === "boolean") value = Boolean(value);
      else if (dataType === "dateString") value = value ? new Date(value).toISOString() : value;
      else if (dataType === "text") value = String(value ?? "");
      return { ...row, [col]: value };
    });
  }
  if (op.type === "manual.cell.patch") {
    const rowKey = op.rowKey;
    const col = String(op.column || "");
    return list.map((row, idx) => {
      const key = row?._lychee_row_id ?? row?._origIndex ?? idx;
      return String(key) === String(rowKey) ? { ...row, [col]: op.value } : row;
    });
  }
  if (op.type === "manual.row.delete") {
    const rowKey = op.rowKey;
    return list.filter((row, idx) => {
      const key = row?._lychee_row_id ?? row?._origIndex ?? idx;
      return String(key) !== String(rowKey);
    });
  }
  if (op.type === "computed.column") {
    return applyComputedColumnOperation(list, op);
  }
  return list;
}

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function populationStdDev(values) {
  const nums = (Array.isArray(values) ? values : []).map(finiteNumber).filter((v) => v != null);
  if (!nums.length) return null;
  const mean = nums.reduce((sum, v) => sum + v, 0) / nums.length;
  const variance = nums.reduce((sum, v) => sum + (v - mean) ** 2, 0) / nums.length;
  const out = Math.sqrt(variance);
  return Number.isFinite(out) ? out : null;
}

function rollingPopulationStdDev(rows, column, idx, windowSize) {
  const n = Math.max(2, Math.floor(Number(windowSize) || 0));
  const start = idx - n + 1;
  if (start < 0) return null;
  const values = [];
  for (let i = start; i <= idx; i += 1) {
    const v = finiteNumber(rows?.[i]?.[column]);
    if (v == null) return null;
    values.push(v);
  }
  return populationStdDev(values);
}

function applyBinaryMath(op, a, b) {
  if (op === "add") return a + b;
  if (op === "subtract") return a - b;
  if (op === "multiply") return a * b;
  if (op === "divide") return b === 0 ? null : a / b;
  if (op === "abs") return Math.abs(a);
  return null;
}

function rawComputedValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const n = Number(text);
  return Number.isFinite(n) ? n : text;
}

function resolveComputedOperand(row, operand) {
  const spec = operand && typeof operand === "object" ? operand : { kind: "raw", value: "" };
  if (spec.kind === "column") return row?.[spec.column];
  if (spec.kind === "operation") {
    const base = row?.[spec.column];
    const rhs = spec.operandKind === "column" ? row?.[spec.operandColumn] : rawComputedValue(spec.operandValue);
    const a = finiteNumber(base);
    const b = finiteNumber(rhs);
    if (a == null || b == null) return null;
    const value = applyBinaryMath(spec.op, a, b);
    return Number.isFinite(value) ? value : null;
  }
  return rawComputedValue(spec.value);
}

function evaluateIfElseComputed(row, expr) {
  const clauses = Array.isArray(expr?.clauses) ? expr.clauses : [];
  for (const clause of clauses) {
    const condition = clause?.condition;
    if (!condition?.leftColumn) continue;
    const left = row?.[condition.leftColumn];
    const right = condition.rightKind === "column"
      ? row?.[condition.rightColumn]
      : condition.rightValue;
    if (compareConditionValues(left, condition.operator, right)) {
      return resolveComputedOperand(row, clause.then);
    }
  }
  return resolveComputedOperand(row, expr?.else);
}

function applyComputedColumnOperation(rows, op) {
  const out = String(op?.column || "").trim();
  const expr = op?.expression && typeof op.expression === "object" ? op.expression : null;
  if (!out || !expr) return rows;

  if (expr.kind === "manual-empty-column") {
    return rows.map((row) => (row && typeof row === "object" ? { ...row, [out]: "" } : row));
  }

  if (expr.kind === "binary") {
    const left = String(expr.leftColumn || "");
    const right = String(expr.rightColumn || "");
    const opName = String(expr.op || "");
    return rows.map((row) => {
      if (!row || typeof row !== "object") return row;
      const a = finiteNumber(row[left]) ?? 0;
      const b = opName === "abs" ? 0 : finiteNumber(row[right]) ?? 0;
      const value = applyBinaryMath(opName, a, b);
      return { ...row, [out]: Number.isFinite(value) ? value : null };
    });
  }

  if (expr.kind === "relative-row") {
    const base = String(expr.baseColumn || "");
    const rowRef = String(expr.rowRef || "previous");
    const opName = String(expr.op || "");
    return rows.map((row, idx) => {
      if (!row || typeof row !== "object") return row;
      const refIdx = rowRef === "next" ? idx + 1 : idx - 1;
      const ref = rows[refIdx];
      if (!ref) return { ...row, [out]: null };
      const a = finiteNumber(row[base]);
      const b = finiteNumber(ref[base]);
      if (a == null || b == null) return { ...row, [out]: null };
      const value = applyBinaryMath(opName, a, b);
      return { ...row, [out]: Number.isFinite(value) ? value : null };
    });
  }

  if (expr.kind === "standard-deviation") {
    const source = String(expr.sourceColumn || "");
    if (expr.mode === "rolling") {
      return rows.map((row, idx) => (
        row && typeof row === "object"
          ? { ...row, [out]: rollingPopulationStdDev(rows, source, idx, expr.window) }
          : row
      ));
    }
    const value = populationStdDev(rows.map((row) => row?.[source]));
    return rows.map((row) => (row && typeof row === "object" ? { ...row, [out]: value } : row));
  }

  if (expr.kind === "cumulative-sum") {
    const source = String(expr.sourceColumn || "");
    let running = 0;
    return rows.map((row) => {
      if (!row || typeof row !== "object") return row;
      const v = finiteNumber(row[source]);
      if (v == null) return { ...row, [out]: null };
      running += v;
      return { ...row, [out]: running };
    });
  }

  if (expr.kind === "if-else") {
    return rows.map((row) => (
      row && typeof row === "object"
        ? { ...row, [out]: evaluateIfElseComputed(row, expr) }
        : row
    ));
  }

  return rows;
}

export function replayOperations({ rows, operations }) {
  return (Array.isArray(operations) ? operations : []).reduce((acc, op) => {
    return isSqlMappableOperation(op) ? acc : applyBrowserOperationToRows(acc, op);
  }, Array.isArray(rows) ? rows : []);
}
