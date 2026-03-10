/** Keys that must stay as strings (ERC1155 tokens, condition IDs, etc.) */
const TOKEN_ID_KEYS = new Set([
  "conditionid", "condition_id", "clobtokenids", "clob_token_ids",
  "asset_id", "assetid", "market", "market_id", "marketid",
]);

function isTokenIdKey(key) {
  if (!key || typeof key !== "string") return false;
  const k = key.toLowerCase();
  if (TOKEN_ID_KEYS.has(k)) return true;
  if (k.endsWith("_conditionid") || k.endsWith("_condition_id")) return true;
  if (k.endsWith("_clobtokenids") || k.endsWith("_clob_token_ids")) return true;
  if (k.endsWith("_asset_id") || k.endsWith("_assetid")) return true;
  return false;
}

/** Long digit-only strings (>15 chars) are token IDs - keep as string to avoid precision loss */
function isLongTokenId(value) {
  const s = typeof value === "string" ? value.trim() : String(value);
  return /^\d{16,}$/.test(s) || /^0x[a-fA-F0-9]{16,}$/.test(s);
}

/**
 * Coerce a single cell value to the correct runtime type for charts/grid:
 * - Date-like strings or timestamps → Date
 * - Numeric strings or numbers → number (int or float)
 * - "true"/"false" (case-insensitive) → boolean
 * - Token IDs, condition IDs, long digit strings → keep as string (no truncation)
 * - Otherwise → string
 */
function coerceCell(value, key) {
  if (value === null || value === undefined) return value;
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return value;

  const s = typeof value === "string" ? value.trim() : String(value);

  // Preserve token/condition IDs: never coerce to number (avoids precision loss)
  if (isTokenIdKey(key) || isLongTokenId(value)) return s;

  if (s === "true") return true;
  if (s === "false") return false;

  const num = Number(s);
  if (s !== "" && !Number.isNaN(num) && Number.isFinite(num)) return num;

  // ISO date or common date strings
  const iso = /^\d{4}-\d{2}-\d{2}(T|\s)/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (iso) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
  }
  // Unix timestamp (seconds or ms) - but not if it looks like a token ID (long)
  if (/^\d{10,13}$/.test(s)) {
    const ts = parseInt(s, 10);
    const ms = ts < 1e12 ? ts * 1000 : ts;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return typeof value === "string" ? value : String(value);
}

/**
 * Coerce all values in an array of row objects so that dates, numbers,
 * and booleans are proper types. Used when data is pulled from APIs.
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Array<Record<string, unknown>>}
 */
export function coerceDataTypes(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const out = [];
  const keys = Object.keys(rows[0]);
  for (const row of rows) {
    const next = {};
    for (const k of keys) {
      next[k] = coerceCell(row[k], k);
    }
    out.push(next);
  }
  return out;
}
