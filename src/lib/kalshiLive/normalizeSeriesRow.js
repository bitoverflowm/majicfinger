function jsonCell(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {Record<string, unknown>}
 */
export function normalizeKalshiLiveSeriesRow(raw) {
  if (!raw || typeof raw !== "object") return {};
  const s = /** @type {Record<string, unknown>} */ (raw);

  const str = (k) => {
    const v = s[k];
    if (v == null) return "";
    return String(v);
  };
  const num = (k) => {
    const v = s[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    ticker: str("ticker"),
    frequency: str("frequency"),
    title: str("title"),
    category: str("category"),
    tags: jsonCell(s.tags),
    settlement_sources: jsonCell(s.settlement_sources),
    contract_url: str("contract_url"),
    contract_terms_url: str("contract_terms_url"),
    fee_type: str("fee_type"),
    fee_multiplier: num("fee_multiplier"),
    additional_prohibitions: jsonCell(s.additional_prohibitions),
    product_metadata: jsonCell(s.product_metadata),
    volume_fp: str("volume_fp"),
    last_updated_ts: str("last_updated_ts"),
  };
}

/**
 * @param {unknown[]} seriesList
 * @param {string[]} selectedColumns
 */
export function projectKalshiLiveSeriesRows(seriesList, selectedColumns) {
  const cols =
    Array.isArray(selectedColumns) && selectedColumns.length ? selectedColumns : null;
  return (Array.isArray(seriesList) ? seriesList : []).map((raw) => {
    const row = normalizeKalshiLiveSeriesRow(
      /** @type {Record<string, unknown>} */ (raw),
    );
    if (!cols) return row;
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const c of cols) {
      if (Object.prototype.hasOwnProperty.call(row, c)) out[c] = row[c];
    }
    return out;
  });
}
