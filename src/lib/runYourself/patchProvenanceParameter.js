/**
 * Patch saved compose provenance filters when user picks a new ticker/market or category.
 */

const TICKER_COLUMN_NAMES = new Set([
  "ticker",
  "market_ticker",
  "event_ticker",
  "market",
  "market_id",
]);

const CATEGORY_COLUMN_NAMES = new Set([
  "category",
  "kalshi_taxonomy_category",
  "kalshi_event_ticker_category",
]);

function normalizeCol(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function isTickerColumn(column, extraColumns = []) {
  const n = normalizeCol(column);
  if (TICKER_COLUMN_NAMES.has(n) || n.endsWith("_ticker")) return true;
  return extraColumns.map(normalizeCol).includes(n);
}

function isCategoryColumn(column, extraColumns = []) {
  const n = normalizeCol(column);
  if (CATEGORY_COLUMN_NAMES.has(n)) return true;
  return extraColumns.map(normalizeCol).includes(n);
}

/**
 * @param {object} filter
 * @param {string} newValue
 * @param {"ticker" | "category"} patchKind
 * @param {string[]} [extraColumns]
 * @returns {object}
 */
function patchFilterValue(filter, newValue, patchKind, extraColumns = []) {
  if (!filter || typeof filter !== "object") return filter;
  const col = filter.column ?? filter.field ?? filter.leftColumn;
  const matches =
    patchKind === "category"
      ? isCategoryColumn(col, extraColumns)
      : isTickerColumn(col, extraColumns);
  if (!matches) return filter;
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
 * @param {"ticker" | "category"} patchKind
 * @param {string[]} [extraColumns]
 * @returns {object[] | null}
 */
function patchFilterList(filters, newValue, patchKind, extraColumns = []) {
  if (!Array.isArray(filters) || !filters.length) return filters || null;
  return filters.map((f) => patchFilterValue(f, newValue, patchKind, extraColumns));
}

/**
 * @param {object} provenance
 * @param {string} value
 * @param {{ patchKind?: "ticker" | "category"; extraColumns?: string[] }} [options]
 * @returns {object}
 */
export function patchProvenanceParameter(provenance, value, options = {}) {
  if (!provenance || typeof provenance !== "object") return provenance;
  const paramValue = String(value || "").trim();
  if (!paramValue) return provenance;

  const patchKind = options.patchKind === "category" ? "category" : "ticker";
  const extraColumns = Array.isArray(options.extraColumns) ? options.extraColumns : [];

  const patchComposeFilters = (composeFilters) => {
    if (!composeFilters || typeof composeFilters !== "object") return composeFilters;
    const next = { ...composeFilters };
    if (Array.isArray(next.and)) next.and = patchFilterList(next.and, paramValue, patchKind, extraColumns);
    if (Array.isArray(next.or)) next.or = patchFilterList(next.or, paramValue, patchKind, extraColumns);
    return next;
  };

  const patchComposeSpec = (spec) => {
    if (!spec || typeof spec !== "object") return spec;
    const next = { ...spec };
    if (Array.isArray(next.where)) next.where = patchFilterList(next.where, paramValue, patchKind, extraColumns);
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
 * @param {{ patchKind?: "ticker" | "category"; tickerColumns?: string[]; categoryColumns?: string[] }} [options]
 */
export function patchAllSheetProvenance(dataSheets, value, options = {}) {
  const patchKind = options.patchKind === "category" ? "category" : "ticker";
  const extraColumns =
    patchKind === "category"
      ? options.categoryColumns || []
      : options.tickerColumns || [];

  const out = { ...(dataSheets || {}) };
  for (const [id, sheet] of Object.entries(out)) {
    if (!sheet?.provenance) continue;
    out[id] = {
      ...sheet,
      provenance: patchProvenanceParameter(sheet.provenance, value, { patchKind, extraColumns }),
    };
  }
  return out;
}
