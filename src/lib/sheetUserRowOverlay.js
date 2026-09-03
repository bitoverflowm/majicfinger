import {
  normalizeRandomSampleConfig,
  RANDOM_SAMPLE_MODE_UNSEEDED,
} from "@/lib/dataLake/randomSample";

/**
 * User-edited cells must follow a stable row identity (e.g. `band`), never array index.
 *
 * Compose/Athena GROUP BY does not guarantee row order. Replaying `manual.cell.patch`
 * by `_origIndex` was rematching `id` / `label` onto the wrong bands after pull/reload.
 */

export const LYCHEE_ROW_ID_FIELD = "_lychee_row_id";
export const SHEET_ROW_IDENTITY_COLUMNS = ["band"];
export const USER_ORDER_COLUMNS = new Set(["id", "label"]);
const INTERNAL_ROW_FIELDS = new Set(["_origIndex", LYCHEE_ROW_ID_FIELD]);

/** Always persist small result sheets (bands/buckets). */
export const SHEET_ALWAYS_PERSIST_ROW_CAP = 250;
/** Persist user-edited compose sheets up to this many rows. */
export const SHEET_USER_EDIT_PERSIST_ROW_CAP = 5000;

/**
 * @param {object | null | undefined} sheet
 * @returns {{ size: number; mode: "seeded" | "unseeded"; seed?: string } | null}
 */
export function sheetComposeRandomSample(sheet) {
  const rs = sheet?.provenance?.composeSpec?.randomSample;
  if (!rs || typeof rs !== "object") return null;
  return normalizeRandomSampleConfig({ ...rs, enabled: true });
}

/**
 * Unseeded random-sample sheets always re-pull from Athena (even when n ≤ 250).
 * @param {object | null | undefined} sheet
 */
export function sheetHasUnseededRandomSample(sheet) {
  const sample = sheetComposeRandomSample(sheet);
  return sample?.mode === RANDOM_SAMPLE_MODE_UNSEEDED;
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {string | null}
 */
export function sheetRowIdentityKey(row) {
  if (!row || typeof row !== "object") return null;
  for (const col of SHEET_ROW_IDENTITY_COLUMNS) {
    const v = row[col];
    if (v != null && String(v).trim() !== "") return `${col}:${String(v).trim()}`;
  }
  const rid = row[LYCHEE_ROW_ID_FIELD];
  if (rid != null && String(rid).trim() !== "") return `rid:${String(rid)}`;
  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {Record<string, string> | null}
 */
export function sheetRowIdentityFields(row) {
  if (!row || typeof row !== "object") return null;
  for (const col of SHEET_ROW_IDENTITY_COLUMNS) {
    const v = row[col];
    if (v != null && String(v).trim() !== "") return { [col]: String(v).trim() };
  }
  return null;
}

/**
 * @param {object | null | undefined} sheet
 * @returns {boolean}
 */
export function sheetHasUserRowEdits(sheet) {
  if (sheet?.userRowOverlay && typeof sheet.userRowOverlay === "object") {
    if (Object.keys(sheet.userRowOverlay).length > 0) return true;
  }
  const hist = Array.isArray(sheet?.operationHistory) ? sheet.operationHistory : [];
  if (hist.some((op) => op?.type === "manual.cell.patch" || op?.type === "manual.row.delete" || op?.type === "manual.sheet.replace")) {
    return true;
  }
  const types = sheet?.dataTypes && typeof sheet.dataTypes === "object" ? sheet.dataTypes : {};
  return Object.values(types).some((t) => t === "id" || t === "_id");
}

/**
 * Small / user-edited sheets keep their JSON rows in Mongo instead of recipe-only replay.
 * @param {object | null | undefined} sheet
 * @returns {boolean}
 */
export function sheetShouldKeepPersistedRows(sheet) {
  if (!sheet || typeof sheet !== "object") return false;
  if (sheet.saveMeta?.persistRows === true && sheetHasUserRowEdits(sheet)) return true;
  if (sheet.userRowOverlay && Object.keys(sheet.userRowOverlay).length > 0) return true;
  const n = Array.isArray(sheet.data) ? sheet.data.length : 0;
  // Unseeded random samples must re-run Athena on every project load — never freeze via size cap.
  if (sheetHasUnseededRandomSample(sheet)) {
    if (sheetHasUserRowEdits(sheet) && n > 0 && n <= SHEET_USER_EDIT_PERSIST_ROW_CAP) return true;
    return false;
  }
  if (n > 0 && n <= SHEET_ALWAYS_PERSIST_ROW_CAP) return true;
  if (sheetHasUserRowEdits(sheet) && n > 0 && n <= SHEET_USER_EDIT_PERSIST_ROW_CAP) return true;
  return false;
}

/**
 * @param {unknown[]} rows
 * @param {Iterable<string> | null | undefined} sourceKeys — columns produced by the query / bands
 * @returns {Record<string, Record<string, unknown>>}
 */
export function buildUserRowOverlay(rows, sourceKeys) {
  const overlay = {};
  const source = new Set(sourceKeys || []);
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = sheetRowIdentityKey(row);
    if (!key || !row || typeof row !== "object") continue;
    const extra = {};
    for (const [col, value] of Object.entries(row)) {
      if (INTERNAL_ROW_FIELDS.has(col)) continue;
      const isUserOrder = USER_ORDER_COLUMNS.has(col);
      if (source.has(col) && !isUserOrder) continue;
      extra[col] = value;
    }
    if (Object.keys(extra).length) overlay[key] = extra;
  }
  return overlay;
}

/**
 * @param {Record<string, Record<string, unknown>> | null | undefined} a
 * @param {Record<string, Record<string, unknown>> | null | undefined} b
 */
export function mergeUserRowOverlays(a, b) {
  const out = { ...(a && typeof a === "object" ? a : {}) };
  for (const [key, extra] of Object.entries(b && typeof b === "object" ? b : {})) {
    out[key] = { ...(out[key] || {}), ...(extra || {}) };
  }
  return out;
}

/**
 * Attach overlay from current rows onto each sheet (call before stripping row payloads).
 * @param {Record<string, object>} dataSheets
 */
export function attachUserRowOverlays(dataSheets) {
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  let changed = false;
  const next = {};
  for (const [id, sheet] of Object.entries(sheets)) {
    const rows = Array.isArray(sheet?.data) ? sheet.data : [];
    if (!rows.length) {
      next[id] = sheet;
      continue;
    }
    const built = buildUserRowOverlay(rows, null);
    if (!Object.keys(built).length) {
      next[id] = sheet;
      continue;
    }
    const merged = mergeUserRowOverlays(sheet.userRowOverlay, built);
    next[id] = { ...sheet, userRowOverlay: merged };
    changed = true;
  }
  return changed ? next : sheets;
}

/**
 * Copy user columns onto fresh query rows by identity. Never zip by array index.
 * @param {object[]} freshRows
 * @param {object[] | null | undefined} previousRows
 * @param {Record<string, Record<string, unknown>> | null | undefined} overlay
 * @param {Iterable<string> | null | undefined} sourceKeys
 */
export function overlayUserColumnsByIdentity(freshRows, previousRows, overlay, sourceKeys) {
  const fresh = Array.isArray(freshRows) ? freshRows : [];
  if (!fresh.length) return fresh;
  const source = new Set(
    sourceKeys && typeof sourceKeys[Symbol.iterator] === "function"
      ? sourceKeys
      : fresh[0] && typeof fresh[0] === "object"
        ? Object.keys(fresh[0])
        : [],
  );
  const fromPrev = buildUserRowOverlay(previousRows, source);
  const merged = mergeUserRowOverlays(overlay, fromPrev);
  if (!Object.keys(merged).length) return fresh;

  return fresh.map((row) => {
    if (!row || typeof row !== "object") return row;
    const extra = merged[sheetRowIdentityKey(row)];
    if (!extra) return row;
    const next = { ...row };
    for (const [col, value] of Object.entries(extra)) {
      if (INTERNAL_ROW_FIELDS.has(col)) continue;
      const isUserOrder = USER_ORDER_COLUMNS.has(col);
      if (source.has(col) && !isUserOrder) continue;
      next[col] = value;
    }
    return next;
  });
}

/**
 * @param {object[]} rows
 * @param {{ rowKey?: unknown; column?: string; value?: unknown; identity?: Record<string, string> }} op
 * @returns {object[]}
 */
export function applyManualCellPatchByIdentity(rows, op) {
  const list = Array.isArray(rows) ? rows : [];
  const col = String(op?.column || "");
  if (!col) return list;
  const identity = op?.identity && typeof op.identity === "object" ? op.identity : null;
  const rowKey = op?.rowKey;
  const hasBand = list.some((row) => row && row.band != null && String(row.band).trim() !== "");

  const matchIdentity = (row) => {
    if (!identity) return false;
    return Object.entries(identity).every(([k, v]) => String(row?.[k] ?? "").trim() === String(v ?? "").trim());
  };

  const matchLycheeId = (row) =>
    rowKey != null &&
    row?.[LYCHEE_ROW_ID_FIELD] != null &&
    String(row[LYCHEE_ROW_ID_FIELD]) === String(rowKey);

  let matched = false;
  const next = list.map((row, idx) => {
    if (!row || typeof row !== "object") return row;
    if (matchIdentity(row) || matchLycheeId(row)) {
      matched = true;
      return { ...row, [col]: op.value };
    }
    return row;
  });
  if (matched) return next;

  // Legacy index patches: refuse when rows have a stable identity (would scramble bands).
  if (hasBand || list.some((row) => row?.[LYCHEE_ROW_ID_FIELD] != null)) {
    return list;
  }

  return list.map((row, idx) => {
    const key = row?._lychee_row_id ?? row?._origIndex ?? idx;
    return String(key) === String(rowKey) ? { ...row, [col]: op.value } : row;
  });
}
