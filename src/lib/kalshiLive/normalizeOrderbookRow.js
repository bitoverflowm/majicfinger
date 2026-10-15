import { parseKalshiFixedPointCount } from "@/lib/kalshiLive/kalshiFixedPoint";

/** @param {unknown} v */
function coerceDollars(v) {
  if (v == null || v === "") return null;
  const n = Number(typeof v === "string" ? v.trim() : v);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {string} ticker
 * @param {"yes" | "no"} side
 * @param {unknown} level
 * @param {number} levelIndex
 * @returns {Record<string, unknown> | null}
 */
function normalizeLevel(ticker, side, level, levelIndex) {
  if (!Array.isArray(level) || level.length < 2) return null;
  return {
    ticker: String(ticker || ""),
    side,
    price_dollars: coerceDollars(level[0]),
    quantity_fp: parseKalshiFixedPointCount(level[1]),
    level_index: levelIndex,
  };
}

/**
 * Flatten orderbook_fp.yes_dollars / no_dollars into one row per price level.
 *
 * @param {string} ticker
 * @param {unknown} orderbookFp
 * @returns {Record<string, unknown>[]}
 */
export function normalizeKalshiLiveOrderbook(ticker, orderbookFp) {
  const book =
    orderbookFp && typeof orderbookFp === "object"
      ? /** @type {Record<string, unknown>} */ (orderbookFp)
      : {};
  const yes = Array.isArray(book.yes_dollars) ? book.yes_dollars : [];
  const no = Array.isArray(book.no_dollars) ? book.no_dollars : [];

  /** @type {Record<string, unknown>[]} */
  const rows = [];
  yes.forEach((level, i) => {
    const row = normalizeLevel(ticker, "yes", level, i);
    if (row) rows.push(row);
  });
  no.forEach((level, i) => {
    const row = normalizeLevel(ticker, "no", level, i);
    if (row) rows.push(row);
  });
  return rows;
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string[] | undefined} selectedColumns
 */
export function projectKalshiLiveOrderbookRows(rows, selectedColumns) {
  void selectedColumns;
  return (Array.isArray(rows) ? rows : []).map((raw) => ({ ...raw }));
}
