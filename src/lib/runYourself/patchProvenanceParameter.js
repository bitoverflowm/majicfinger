/**
 * Patch saved compose provenance filters when user picks a new ticker/market.
 */

const TICKER_COLUMN_NAMES = new Set([
  "ticker",
  "market_ticker",
  "event_ticker",
  "market",
  "market_id",
]);

function normalizeCol(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function isTickerColumn(column) {
  const n = normalizeCol(column);
  return TICKER_COLUMN_NAMES.has(n) || n.endsWith("_ticker");
}

/**
 * @param {object} filter
 * @param {string} newValue
 * @returns {object}
 */
function patchFilterValue(filter, newValue) {
  if (!filter || typeof filter !== "object") return filter;
  const col = filter.column ?? filter.field ?? filter.leftColumn;
  if (!isTickerColumn(col)) return filter;
  return {
    ...filter,
    value: newValue,
    values: Array.isArray(filter.values) ? [newValue] : filter.values,
    rightValue: newValue,
  };
}

/**
 * @param {object[] | null | undefined} filters
 * @param {string} newValue
 * @returns {object[] | null}
 */
function patchFilterList(filters, newValue) {
  if (!Array.isArray(filters) || !filters.length) return filters || null;
  return filters.map((f) => patchFilterValue(f, newValue));
}

/**
 * @param {object} provenance
 * @param {string} tickerOrMarket
 * @param {string[]} [extraColumns]
 * @returns {object}
 */
export function patchProvenanceParameter(provenance, tickerOrMarket, extraColumns = []) {
  if (!provenance || typeof provenance !== "object") return provenance;
  const value = String(tickerOrMarket || "").trim();
  if (!value) return provenance;

  const cols = new Set([...TICKER_COLUMN_NAMES, ...extraColumns.map(normalizeCol)]);

  const patchComposeFilters = (composeFilters) => {
    if (!composeFilters || typeof composeFilters !== "object") return composeFilters;
    const next = { ...composeFilters };
    if (Array.isArray(next.and)) next.and = patchFilterList(next.and, value);
    if (Array.isArray(next.or)) next.or = patchFilterList(next.or, value);
    return next;
  };

  const patchComposeSpec = (spec) => {
    if (!spec || typeof spec !== "object") return spec;
    const next = { ...spec };
    if (Array.isArray(next.where)) next.where = patchFilterList(next.where, value);
    if (next.filters) next.filters = patchComposeFilters(next.filters);
    return next;
  };

  return {
    ...provenance,
    composeFilters: patchComposeFilters(provenance.composeFilters),
    composeSpec: patchComposeSpec(provenance.composeSpec),
  };
}

/**
 * Patch all compose sheets in a data_sheets map.
 * @param {Record<string, object>} dataSheets
 * @param {string} value
 * @param {string[]} tickerColumns
 */
export function patchAllSheetProvenance(dataSheets, value, tickerColumns = []) {
  const out = { ...(dataSheets || {}) };
  for (const [id, sheet] of Object.entries(out)) {
    if (!sheet?.provenance) continue;
    out[id] = {
      ...sheet,
      provenance: patchProvenanceParameter(sheet.provenance, value, tickerColumns),
    };
  }
  return out;
}
