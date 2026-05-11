export const PROJECT_FULL_DATA_SAFE_BYTES = 12 * 1024 * 1024;
export const PROJECT_PREVIEW_ROW_LIMIT = 1000;
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

  const sheets = payload?.data_sheets || {};
  const warnings = Object.entries(sheets)
    .filter(([, sheet]) => sheet?.storageMode === "provenance" && !sheet?.provenance)
    .map(([sheetId, sheet]) => `Sheet "${sheet?.name || sheetId}" is too large and has no Data Lake provenance; only its preview can be saved.`);

  return {
    payload,
    mode: "hybrid",
    estimatedBytes,
    warnings,
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
      if (dataType === "number") value = Number(value);
      else if (dataType === "boolean") value = Boolean(value);
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
  return list;
}

export function replayOperations({ rows, operations }) {
  return (Array.isArray(operations) ? operations : []).reduce((acc, op) => {
    return isSqlMappableOperation(op) ? acc : applyBrowserOperationToRows(acc, op);
  }, Array.isArray(rows) ? rows : []);
}
