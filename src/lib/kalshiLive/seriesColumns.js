/** @typedef {{ name: string; type: string; description: string; label?: string }} KalshiLiveSeriesColumn */

export const KALSHI_LIVE_SERIES_COLUMNS = [
  { name: "ticker", type: "string", description: "Series ticker identifier" },
  { name: "frequency", type: "string", description: "Human-readable recurrence (weekly, daily, one-off, …)" },
  { name: "title", type: "string", description: "Series title (use with event titles for full context)" },
  { name: "category", type: "string", description: "Category this series belongs to" },
  { name: "tags", type: "string", description: "JSON array of subject tags" },
  { name: "settlement_sources", type: "string", description: "JSON array of official settlement sources" },
  { name: "contract_url", type: "string", description: "Link to original contract filing" },
  { name: "contract_terms_url", type: "string", description: "URL to current contract terms" },
  {
    name: "fee_type",
    type: "string",
    description: "Fee structure: quadratic | quadratic_with_maker_fees | flat",
  },
  { name: "fee_multiplier", type: "number", description: "Multiplier applied to fee calculations" },
  {
    name: "additional_prohibitions",
    type: "string",
    description: "JSON array of additional trading prohibitions",
  },
  { name: "product_metadata", type: "string", description: "JSON object of internal product metadata" },
  {
    name: "volume_fp",
    type: "number",
    label: "Volume",
    description:
      "Total contracts traded across all events in this series. Single-series pulls request this when Volume is selected; Series List always includes volume from the API.",
  },
  { name: "last_updated_ts", type: "timestamp", description: "When series metadata was last updated (ISO 8601)" },
];

/** @param {KalshiLiveSeriesColumn | string} col */
export function getKalshiLiveSeriesColumnLabel(col) {
  const name = typeof col === "string" ? col : col.name;
  const fromCol = typeof col === "object" && col.label ? col.label : null;
  return fromCol || name;
}

/** Selecting Volume requests include_volume on the API. */
export function kalshiLiveSeriesWantsIncludeVolume(selectedColumns) {
  return Array.isArray(selectedColumns) && selectedColumns.includes("volume_fp");
}
