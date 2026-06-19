import { buildPublicChartBundle, normalizeBuilderSnapshot } from "@/lib/chartBundle";
import { reduceRowsForChartLineFilters } from "@/lib/chartLineFilters";
import { chartSnapshotHash } from "@/lib/chartPublishStaleness";
import {
  primarySheetIdForChartSnapshot,
  dataSheetsReferencedBySnapshot,
} from "@/lib/chartSnapshotDataDeps";
import {
  MATERIALIZATION_MODE_LIVE_LAKE,
  MATERIALIZATION_MODE_SNAPSHOT,
  PUBLISHED_BUNDLE_FILTER_ROW_CAP,
  PUBLISHED_BUNDLE_MAX_BYTES,
  PUBLISHED_BUNDLE_MAX_ROWS,
  PUBLISHED_BUNDLE_META_VERSION,
} from "@/lib/publishedChartBundleConfig";
import { estimateJsonBytes } from "@/lib/projectPersistence";
import { buildChartColumnHashBySheet, buildChartSheetLineage } from "@/lib/server/buildChartLineage";
import { hydrateDataSetForPublicChartViewer } from "@/lib/server/hydratePublicChartDataset";
import { trimChartBundleForStorage } from "@/lib/server/publicDashboardHydration";

function cloneJson(value) {
  try {
    return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

/**
 * Apply chart-line-filter row reduction on the primary chart sheet only.
 * @param {Record<string, object>} dataSheets
 * @param {object} snapshot
 * @param {string} primaryId
 */
function applyChartFilterRowReduction(dataSheets, snapshot, primaryId) {
  const filters = snapshot?.chartLineFilters;
  if (!Array.isArray(filters) || !filters.length || !primaryId) return dataSheets;

  const primarySheet = dataSheets[primaryId];
  if (!primarySheet || !Array.isArray(primarySheet.data) || !primarySheet.data.length) {
    return dataSheets;
  }

  const reduced = reduceRowsForChartLineFilters(primarySheet.data, filters, {
    cap: PUBLISHED_BUNDLE_FILTER_ROW_CAP,
  });

  return {
    ...dataSheets,
    [primaryId]: {
      ...primarySheet,
      data: reduced,
      rowCount: reduced.length,
      previewRowCount: reduced.length,
    },
  };
}

function mergeWorkspaceDataSheets(dataSetLean, workspaceDataSheets) {
  if (!workspaceDataSheets || typeof workspaceDataSheets !== "object") {
    return dataSetLean;
  }
  const out = cloneJson(dataSetLean);
  const sheets =
    out?.data_sheets && typeof out.data_sheets === "object" ? { ...out.data_sheets } : {};
  for (const [sheetId, ws] of Object.entries(workspaceDataSheets)) {
    if (!ws || typeof ws !== "object" || !Array.isArray(ws.data) || !ws.data.length) continue;
    sheets[sheetId] = {
      ...(sheets[sheetId] || {}),
      ...ws,
      data: ws.data,
      storageMode: ws.storageMode || sheets[sheetId]?.storageMode || "derived",
      rehydrationStatus: "complete",
      rowCount: ws.data.length,
      fullRowCount: ws.fullRowCount ?? ws.data.length,
    };
  }
  out.data_sheets = sheets;
  return out;
}

function countBundleRows(bundle) {
  const top = Array.isArray(bundle?.rows) ? bundle.rows.length : 0;
  if (top > 0) return top;
  let max = 0;
  for (const sheet of Object.values(bundle?.dataSheets || {})) {
    const n = Array.isArray(sheet?.data) ? sheet.data.length : 0;
    if (n > max) max = n;
  }
  return max;
}

/**
 * Hydrate workbook data, materialize a chart-specific publish bundle, and decide snapshot vs live_lake.
 *
 * @param {{
 *   chartLean: object;
 *   dataSetLean: object;
 *   userId?: unknown;
 *   prehydratedDataSet?: object | null;
 *   skipHydration?: boolean;
 *   workspaceDataSheets?: Record<string, object> | null;
 * }} params
 */
export async function materializeChartBundle({
  chartLean,
  dataSetLean,
  userId,
  prehydratedDataSet = null,
  skipHydration = false,
  workspaceDataSheets = null,
}) {
  const started = Date.now();
  /** @type {string[]} */
  const warnings = [];

  const chart = cloneJson(chartLean);
  if (userId != null && chart.user_id == null) {
    chart.user_id = userId;
  }

  let hydrated;
  const baseDataSet = mergeWorkspaceDataSheets(cloneJson(dataSetLean), workspaceDataSheets);
  if (skipHydration && prehydratedDataSet) {
    hydrated = cloneJson(prehydratedDataSet);
  } else if (prehydratedDataSet) {
    hydrated = await hydrateDataSetForPublicChartViewer(chart, cloneJson(prehydratedDataSet));
  } else {
    hydrated = await hydrateDataSetForPublicChartViewer(chart, baseDataSet);
  }

  const cp = Array.isArray(chart.chart_properties) ? chart.chart_properties[0] : chart.chart_properties;
  const snapshotRaw =
    cp?.rechartsBuilder?.v === 1 ? cp.rechartsBuilder : hydrated?.rechartsBuilder || null;

  const dataSheets = hydrated?.data_sheets && typeof hydrated.data_sheets === "object" ? hydrated.data_sheets : {};
  const primaryId = primarySheetIdForChartSnapshot(dataSheets, snapshotRaw);

  const reducedSheets = applyChartFilterRowReduction(dataSheets, snapshotRaw, primaryId);
  const dataSetForBundle = {
    ...hydrated,
    data_sheets: reducedSheets,
    data: reducedSheets[primaryId]?.data || hydrated.data,
  };

  let bundle = buildPublicChartBundle(chart, dataSetForBundle);
  bundle = trimChartBundleForStorage(bundle);

  const rowCount = countBundleRows(bundle);
  const byteEstimate = estimateJsonBytes(bundle);
  let materialization_mode = MATERIALIZATION_MODE_SNAPSHOT;

  const primaryRows = reducedSheets[primaryId]?.data;
  if (!Array.isArray(primaryRows) || !primaryRows.length) {
    warnings.push(`Primary chart sheet (${primaryId || "unknown"}) has no rows after hydration`);
  }

  if (rowCount === 0 && Array.isArray(snapshotRaw?.chartLineFilters) && snapshotRaw.chartLineFilters.length) {
    warnings.push("Chart line filters produced no matching rows in the publish snapshot");
  }

  if (rowCount > PUBLISHED_BUNDLE_MAX_ROWS || byteEstimate > PUBLISHED_BUNDLE_MAX_BYTES) {
    materialization_mode = MATERIALIZATION_MODE_LIVE_LAKE;
    warnings.push(
      `Chart data exceeds publish snapshot limits (${rowCount} rows, ~${Math.round(byteEstimate / 1024)}KB). Using live lake mode.`,
    );
    bundle = {
      chart: bundle.chart,
      rows: [],
      dataSheets: {},
      rechartsBuilder: bundle.rechartsBuilder,
    };
  }

  const snapshot = bundle.chart?.rechartsBuilder || bundle.rechartsBuilder || snapshotRaw;
  const lineage = buildChartSheetLineage(dataSetLean?.data_sheets || dataSheets, chart);
  const columnHashBySheet = buildChartColumnHashBySheet(
    dataSetLean?.data_sheets || dataSheets,
    chart,
    snapshot,
  );

  const meta = {
    version: PUBLISHED_BUNDLE_META_VERSION,
    materialization_mode,
    published_at: new Date().toISOString(),
    source_data_set_id: dataSetLean?._id ? String(dataSetLean._id) : chart.data_set_id ? String(chart.data_set_id) : null,
    source_data_set_saved_at: dataSetLean?.last_saved_date
      ? new Date(dataSetLean.last_saved_date).toISOString()
      : null,
    snapshot_hash: chartSnapshotHash(chart),
    column_hash_by_sheet: columnHashBySheet,
    row_count: rowCount,
    byte_estimate: byteEstimate,
    lineage,
    hydration_ms: Date.now() - started,
    public_slug: chart.public_slug || null,
    is_public: !!chart.is_public,
  };

  return {
    bundle,
    meta,
    warnings,
    materialization_mode,
    empty_snapshot: materialization_mode === MATERIALIZATION_MODE_SNAPSHOT && rowCount === 0,
  };
}

/**
 * Build a public API payload from a stored published bundle on a chart document.
 * @param {object} chartLean
 */
export function publicPayloadFromPublishedBundle(chartLean) {
  const bundle = chartLean?.published_bundle;
  const meta = chartLean?.published_bundle_meta;
  if (!bundle?.chart || meta?.materialization_mode !== MATERIALIZATION_MODE_SNAPSHOT) {
    return null;
  }
  const rows = Array.isArray(bundle.rows) ? bundle.rows : [];
  const dataSheets = bundle.dataSheets && typeof bundle.dataSheets === "object" ? bundle.dataSheets : {};
  const hasData =
    rows.length > 0 ||
    Object.values(dataSheets).some((s) => Array.isArray(s?.data) && s.data.length > 0);
  if (!hasData) return null;

  const rb = bundle.rechartsBuilder || bundle.chart?.rechartsBuilder;
  const scopedSheets = dataSheetsReferencedBySnapshot(dataSheets, rb);
  const normalizedRb = normalizeBuilderSnapshot(rb, rows, scopedSheets);

  return {
    chart: {
      ...bundle.chart,
      rechartsBuilder: normalizedRb,
      chart_properties: Array.isArray(bundle.chart.chart_properties)
        ? bundle.chart.chart_properties.map((cp, idx) =>
            idx === 0 && cp && typeof cp === "object"
              ? { ...cp, rechartsBuilder: normalizedRb }
              : cp,
          )
        : bundle.chart.chart_properties,
    },
    rows,
    dataSheets: scopedSheets,
    _cacheHit: true,
  };
}

export function publicChartCacheControl(cacheHit) {
  if (cacheHit) {
    return "public, s-maxage=3600, stale-while-revalidate=86400";
  }
  return "public, s-maxage=120, stale-while-revalidate=600";
}
