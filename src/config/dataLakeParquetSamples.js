/**
 * Lychee data lake — Athena-backed samples for Becker / DuckDB panels.
 *
 * Loads bounded `SELECT * … LIMIT` via `/api/data-lake/athena-query`, then ingests rows into
 * DuckDB-WASM as a view (see `ingestAthenaResultAsView`).
 *
 * Legacy public HTTPS + Parquet proxy envs (`NEXT_PUBLIC_DATA_LAKE_BASE_URL`, etc.) are unused
 * by these samples; Parquet proxy remains available for other flows (see `parquet.js`).
 */

/** @typedef {{ id: string; label: string; table: "markets" | "trades" | "blocks" }} AthenaSampleOption */

/** @type {AthenaSampleOption[]} */
export const ATHENA_POLYMARKET_SAMPLE_OPTIONS = [
  { id: "athena-pm-markets", label: "Markets", table: "markets" },
  { id: "athena-pm-blocks", label: "Blocks", table: "blocks" },
  { id: "athena-pm-trades", label: "Trades", table: "trades" },
];

/** Kalshi has no blocks table in Glue — markets + trades only. */
/** @type {AthenaSampleOption[]} */
export const ATHENA_KALSHI_SAMPLE_OPTIONS = [
  { id: "athena-kal-markets", label: "Markets", table: "markets" },
  { id: "athena-kal-trades", label: "Trades", table: "trades" },
];

/** Fixed server row cap for integration samples (matches product expectation). */
export const ATHENA_SAMPLE_ROW_LIMIT = 100;

/** Default max rows for subscriber Athena pulls (select + compose) and for DuckDB materialization of Athena JSON; server/env may raise further up to 500k. */
export const ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT = 50000;

/** AG Grid shows this many rows per page; full dataset stays in sheet state for charts and transforms. */
export const SHEET_GRID_PAGE_SIZE = 100;

/** Row cap for embedded demo (`body.demo` / `isDemo`) — Polymarket & Kalshi historical pulls only. */
export const ATHENA_DEMO_ROW_LIMIT = 10;

/**
 * @typedef {"polymarket" | "kalshi"} DataLakeDataset
 */

/** @param {DataLakeDataset} dataset */
export function getDataLakeDatasetConfig(dataset) {
  if (dataset === "kalshi") {
    return {
      sampleOptions: ATHENA_KALSHI_SAMPLE_OPTIONS,
      lake: "kalshi",
    };
  }
  return {
    sampleOptions: ATHENA_POLYMARKET_SAMPLE_OPTIONS,
    lake: "polymarket",
  };
}

/**
 * Glue table names available for joins / Athena in the UI (Kalshi has no blocks table).
 * @param {DataLakeDataset} dataset
 * @returns {("markets" | "trades" | "blocks")[]}
 */
export function glueTableNamesForDataset(dataset) {
  return dataset === "kalshi" ? ["markets", "trades"] : ["markets", "trades", "blocks"];
}

// --- Optional: direct Parquet URLs (other features / docs) ---

export function getDataLakeBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_DATA_LAKE_BASE_URL;
  if (!raw || typeof raw !== "string") return "";
  return raw.replace(/\/$/, "");
}

export function getKalshiDataLakeBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_KALSHI_DATA_LAKE_BASE_URL;
  if (raw && typeof raw === "string") return raw.replace(/\/$/, "");
  const pm = getDataLakeBaseUrl();
  if (!pm) return "";
  if (/\/polymarket$/i.test(pm)) return pm.replace(/\/polymarket$/i, "/kalshi");
  return pm.replace(/polymarket/gi, "kalshi");
}

export function isDataLakeS3ProxyEnabled() {
  return typeof process !== "undefined" && process.env.NEXT_PUBLIC_DATA_LAKE_USE_S3_PROXY === "true";
}

export function buildParquetUrl(pathFromRoot, baseUrl) {
  const base = (baseUrl ?? getDataLakeBaseUrl()).replace(/\/$/, "");
  if (!base) return "";
  const p = String(pathFromRoot).replace(/^\//, "");
  return `${base}/${p}`;
}
