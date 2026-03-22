/**
 * Lychee data lake — Parquet samples for Becker-backed panels.
 *
 * Polymarket: `NEXT_PUBLIC_DATA_LAKE_BASE_URL` = HTTPS URL ending at the `polymarket` folder.
 * Kalshi: `NEXT_PUBLIC_KALSHI_DATA_LAKE_BASE_URL` optional; else derived from polymarket URL by swapping `polymarket` → `kalshi`.
 *
 * Proxy: `NEXT_PUBLIC_DATA_LAKE_USE_S3_PROXY=true` + server `DATA_LAKE_S3_KEY_PREFIX` (polymarket).
 * Kalshi uses same bucket; prefix is `DATA_LAKE_KALSHI_S3_KEY_PREFIX` or `…/polymarket` → `…/kalshi`.
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

/** Relative paths under `becker/data/kalshi/` (same layout as polymarket: markets/, trades/). */
export const KALSHI_DATA_LAKE_SAMPLE_OPTIONS = [
  {
    id: "kalshi-sample-markets",
    label: "Sample markets data",
    path: "markets/markets_5630000_5640000.parquet",
  },
  {
    id: "kalshi-sample-markets-2",
    label: "Sample markets data (alt)",
    path: "markets/markets_5850000_5860000.parquet",
  },
  {
    id: "kalshi-sample-trades",
    label: "Sample trades data",
    path: "trades/trades_15370000_15380000.parquet",
  },
  {
    id: "kalshi-sample-trades-2",
    label: "Sample trades data (alt)",
    path: "trades/trades_26780000_26790000.parquet",
  },
];

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

/** When true, samples load via `/api/data-lake/parquet` using server AWS creds (private bucket OK). */
export function isDataLakeS3ProxyEnabled() {
  return typeof process !== "undefined" && process.env.NEXT_PUBLIC_DATA_LAKE_USE_S3_PROXY === "true";
}

export function buildParquetUrl(pathFromRoot, baseUrl) {
  const base = (baseUrl ?? getDataLakeBaseUrl()).replace(/\/$/, "");
  if (!base) return "";
  const p = String(pathFromRoot).replace(/^\//, "");
  return `${base}/${p}`;
}

/**
 * @typedef {"polymarket" | "kalshi"} DataLakeDataset
 */

/** @param {DataLakeDataset} dataset */
export function getDataLakeDatasetConfig(dataset) {
  if (dataset === "kalshi") {
    return {
      sampleOptions: KALSHI_DATA_LAKE_SAMPLE_OPTIONS,
      getBaseUrl: getKalshiDataLakeBaseUrl,
      proxyLake: "kalshi",
    };
  }
  return {
    sampleOptions: DATA_LAKE_SAMPLE_OPTIONS,
    getBaseUrl: getDataLakeBaseUrl,
    proxyLake: "polymarket",
  };
}
