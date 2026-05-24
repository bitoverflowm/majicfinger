/** Columns that hold human-readable labels — never treat as a time axis. */
const CATEGORICAL_LABEL_KEY =
  /^(title|name|label|market_name|question|caption|description|event_title|market_title|subtitle)$/i;

/**
 * @param {string} key Column name or `sheetId::column`
 * @returns {boolean}
 */
export function isCategoricalLabelColumn(key) {
  const raw = String(key || "").trim();
  if (!raw) return false;
  const col = raw.includes("::") ? raw.slice(raw.indexOf("::") + 2) : raw;
  if (CATEGORICAL_LABEL_KEY.test(col)) return true;
  if (/date|time|timestamp|datetime|_at$/i.test(col)) return false;
  return /(?:^|_)(title|name|label|question|caption|description)(?:$|_)/i.test(col);
}

/**
 * Prose market titles must not be fed through `Date.parse` / temporal heuristics.
 * @param {unknown} value
 * @returns {boolean}
 */
export function looksLikeProseLabelValue(value) {
  if (value == null || value === "") return false;
  if (typeof value === "number" && Number.isFinite(value)) return false;
  const s = String(value).trim();
  if (!s) return false;
  if (s.length > 72) return true;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length >= 4) return true;
  if (words.length >= 2 && /[?]/.test(s)) return true;
  if (/\b(will|the|and|for|in|on|at|by|vs|versus)\b/i.test(s) && words.length >= 3) return true;
  return false;
}
