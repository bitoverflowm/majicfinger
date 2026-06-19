import { hashJson } from "@/lib/projectPersistence";

/**
 * @param {object | null | undefined} chartLean
 */
export function extractChartRechartsBuilder(chartLean) {
  const cp = Array.isArray(chartLean?.chart_properties)
    ? chartLean.chart_properties[0]
    : chartLean?.chart_properties;
  if (cp?.rechartsBuilder?.v === 1) return cp.rechartsBuilder;
  if (chartLean?.rechartsBuilder?.v === 1) return chartLean.rechartsBuilder;
  return null;
}

/**
 * @param {object | null | undefined} chartLean
 */
export function chartSnapshotHash(chartLean) {
  const rb = extractChartRechartsBuilder(chartLean);
  return rb ? hashJson(rb) : "";
}

/**
 * @param {object | null | undefined} chartLean
 * @param {object | null | undefined} dataSetLean
 */
export function isPublishedChartBundleStale(chartLean, dataSetLean) {
  if (!chartLean?.is_public) return false;
  const meta = chartLean?.published_bundle_meta;
  if (!meta || typeof meta !== "object") return true;

  const currentHash = chartSnapshotHash(chartLean);
  if (meta.snapshot_hash && currentHash && meta.snapshot_hash !== currentHash) {
    return true;
  }

  const dsSaved = dataSetLean?.last_saved_date;
  const pubSaved = meta.source_data_set_saved_at;
  if (dsSaved && pubSaved) {
    const dsMs = new Date(dsSaved).getTime();
    const pubMs = new Date(pubSaved).getTime();
    if (Number.isFinite(dsMs) && Number.isFinite(pubMs) && dsMs > pubMs) {
      return true;
    }
  }

  const storedCols = meta.column_hash_by_sheet;
  if (storedCols && typeof storedCols === "object" && dataSetLean?.data_sheets) {
    for (const [sheetId, hash] of Object.entries(storedCols)) {
      const cur = dataSetLean.data_sheets[sheetId]?.saveMeta?.columnHash;
      if (cur && hash && String(cur) !== String(hash)) return true;
    }
  }

  return false;
}

/**
 * @param {object | null | undefined} chartLean
 */
export function publishedChartServeMode(chartLean) {
  const meta = chartLean?.published_bundle_meta;
  if (meta?.materialization_mode) return meta.materialization_mode;
  if (chartLean?.published_bundle?.chart) return "snapshot";
  return null;
}

/**
 * @param {object | null | undefined} chartLean
 */
export function chartHasPublishedSnapshot(chartLean) {
  const mode = publishedChartServeMode(chartLean);
  if (mode !== "snapshot") return false;
  const bundle = chartLean?.published_bundle;
  if (!bundle?.chart) return false;
  const rows = Array.isArray(bundle.rows) ? bundle.rows.length : 0;
  if (rows > 0) return true;
  return Object.values(bundle.dataSheets || {}).some(
    (s) => Array.isArray(s?.data) && s.data.length > 0,
  );
}
