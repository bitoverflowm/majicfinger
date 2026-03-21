/**
 * Lychee data lake — Parquet smoke tests for the Polymarket panel.
 *
 * `NEXT_PUBLIC_DATA_LAKE_BASE_URL` must be the HTTPS URL ending at the `polymarket`
 * folder (contains `markets/` and `trades/`). Example:
 *   https://becker.s3.us-east-1.amazonaws.com/becker/data/polymarket
 *
 * `path` is only the suffix (not shown in the UI). Change these if you move files in S3.
 */
export const DATA_LAKE_SAMPLE_OPTIONS = [
  {
    id: "sample-markets",
    label: "Sample markets data",
    path: "markets/markets_0_10000.parquet",
  },
  {
    id: "sample-trades",
    label: "Sample trades data",
    path: "trades/trades_61810000_61820000.parquet",
  },
];

export function getDataLakeBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_DATA_LAKE_BASE_URL;
  if (!raw || typeof raw !== "string") return "";
  return raw.replace(/\/$/, "");
}

/** When true, samples load via `/api/data-lake/parquet` using server AWS creds (private bucket OK). */
export function isDataLakeS3ProxyEnabled() {
  return typeof process !== "undefined" && process.env.NEXT_PUBLIC_DATA_LAKE_USE_S3_PROXY === "true";
}

export function buildParquetUrl(pathFromRoot) {
  const base = getDataLakeBaseUrl();
  if (!base) return "";
  const p = String(pathFromRoot).replace(/^\//, "");
  return `${base}/${p}`;
}
