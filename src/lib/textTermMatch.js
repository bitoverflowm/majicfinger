/**
 * Attribute keyword tags on titles match a whole word or phrase.
 * "Elon" matches "Elon Musk" and does not match "Barcelona".
 * Ticker and id columns stay substring matches.
 */

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Lowercase RE2 / JS source. Boundaries are the ends of the string or a non-letter, non-digit. */
export function textTermRegexpSource(term) {
  const needle = String(term ?? "").trim().toLowerCase();
  return `(^|[^a-z0-9])${escapeRegExp(needle)}([^a-z0-9]|$)`;
}

export function textTermMatches(text, term) {
  const needle = String(term ?? "").trim();
  if (!needle) return false;
  return new RegExp(textTermRegexpSource(needle), "i").test(String(text ?? ""));
}

/** Title-like columns use whole words. Tickers and token ids stay substrings. */
export function columnUsesWholeTerm(columnId) {
  const id = String(columnId || "");
  if (/(^|_)(ticker|tickers|token|tokens)($|_)/i.test(id)) return false;
  return /title|question|rules|description|subtitle/i.test(id) || /(^|_)name($|_)/i.test(id);
}

export function cellMatchesTextTerm(columnId, raw, term) {
  const needle = String(term ?? "").trim().toLowerCase();
  if (!needle) return false;
  if (columnUsesWholeTerm(columnId)) return textTermMatches(raw, needle);
  return String(raw ?? "").toLowerCase().includes(needle);
}
