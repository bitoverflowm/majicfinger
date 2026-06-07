import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import mongoose from "mongoose";
import { buildPublicChartBundle } from "@/lib/chartBundle";
import { dataSheetsReferencedBySnapshot } from "@/lib/chartSnapshotDataDeps";
import { hydrateDataSetForPublicChartViewer } from "@/lib/server/hydratePublicChartDataset";
import {
  attachCardGridSheetRows,
  hydrateCardGridSheetsForPublicDashboard,
} from "@/lib/server/hydrateDashboardCardGridSheets";
import { applyCardGridSnapshotsToSheets } from "@/lib/server/dashboardCardGridSnapshots";
import { clampCardGridRowLimit } from "@/lib/dashboardCardGrid";

export function collectChartIdsFromLayout(layout) {
  const ids = new Set();
  if (!layout || typeof layout !== "object") return ids;
  const rows = Array.isArray(layout.rows) ? layout.rows : [];
  for (const row of rows) {
    if (!row || row.type !== "cards" || !Array.isArray(row.columns)) continue;
    for (const col of row.columns) {
      if (col?.chart_id && mongoose.Types.ObjectId.isValid(String(col.chart_id))) {
        ids.add(String(col.chart_id));
      }
    }
  }
  return ids;
}

function cloneJson(value) {
  try {
    return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

/** Trim bundle to sheets referenced by the chart snapshot (smaller publish cache). */
export function trimChartBundleForStorage(bundle) {
  if (!bundle || typeof bundle !== "object") return bundle;
  const chart = bundle.chart || {};
  const rb = chart.rechartsBuilder || bundle.rechartsBuilder;
  const dataSheets = bundle.dataSheets && typeof bundle.dataSheets === "object" ? bundle.dataSheets : {};
  const scopedSheets = dataSheetsReferencedBySnapshot(dataSheets, rb);
  return {
    chart,
    rows: Array.isArray(bundle.rows) ? bundle.rows : [],
    dataSheets: scopedSheets,
    meta: bundle.meta || {},
  };
}

export function hydrateLayoutWithChartBundles(layout, chartBundlesById, dataSheets = {}) {
  if (!layout || typeof layout !== "object") return { version: 1, rows: [] };
  const withCardRows = attachCardGridSheetRows(layout, dataSheets);
  const rows = Array.isArray(withCardRows.rows) ? withCardRows.rows : [];
  const nextRows = rows.map((row) => {
    if (row?.type === "cardGrid") return row;
    if (!row || row.type !== "cards" || !Array.isArray(row.columns)) return row;
    const columns = row.columns.map((col) => {
      if (!col || !col.chart_id) {
        return { ...col, chartPayload: null, chartLink: null };
      }
      const id = String(col.chart_id);
      const bundle = chartBundlesById.get(id);
      const meta = bundle?.meta;
      return {
        ...col,
        chartPayload: bundle
          ? { chart: bundle.chart, rows: bundle.rows, dataSheets: bundle.dataSheets }
          : null,
        chartLink:
          meta?.is_public && meta?.public_slug
            ? { mode: "chart_public", slug: meta.public_slug }
            : null,
      };
    });
    return { ...row, columns };
  });
  return { ...withCardRows, rows: nextRows };
}

function dataSheetsFromCardGridSnapshots(layout, snapshots) {
  if (!snapshots || typeof snapshots !== "object") return {};
  const limits = new Map();
  const rows = Array.isArray(layout?.rows) ? layout.rows : [];
  for (const row of rows) {
    if (!row || row.type !== "cardGrid" || !row.sheetId) continue;
    const sheetId = String(row.sheetId).trim();
    if (!sheetId) continue;
    const limit = clampCardGridRowLimit(row.rowLimit);
    limits.set(sheetId, Math.max(limits.get(sheetId) || 0, limit));
  }
  /** @type {Record<string, object>} */
  const dataSheets = {};
  for (const [sheetId, limit] of limits) {
    const saved = Array.isArray(snapshots[sheetId]) ? snapshots[sheetId] : [];
    if (!saved.length) continue;
    const data = saved.slice(0, limit);
    dataSheets[sheetId] = {
      data,
      storageMode: "inline",
      rehydrationStatus: "complete",
      rowCount: data.length,
    };
  }
  return dataSheets;
}

function mapFromPublishedBundles(publishedChartBundles, chartIds) {
  const map = new Map();
  if (!publishedChartBundles || typeof publishedChartBundles !== "object") return map;
  for (const cid of chartIds) {
    const raw = publishedChartBundles[cid];
    if (!raw?.chart) continue;
    map.set(cid, {
      chart: raw.chart,
      rows: Array.isArray(raw.rows) ? raw.rows : [],
      dataSheets: raw.dataSheets && typeof raw.dataSheets === "object" ? raw.dataSheets : {},
      meta: raw.meta && typeof raw.meta === "object" ? raw.meta : {},
    });
  }
  return map;
}

export function publishedBundlesCoverAllCharts(chartIds, publishedChartBundles) {
  if (!chartIds.size) return true;
  if (!publishedChartBundles || typeof publishedChartBundles !== "object") return false;
  for (const cid of chartIds) {
    if (!publishedChartBundles[cid]?.chart) return false;
  }
  return true;
}

/**
 * Build chart bundles in parallel with dataset hydration deduped by data_set_id.
 * @returns {Promise<Map<string, object>>}
 */
export async function buildChartBundlesParallel(chartIds, userId) {
  const ids = [...chartIds];
  if (!ids.length) return new Map();

  const charts = await Chart.find({ _id: { $in: ids }, user_id: userId }).lean();
  const chartById = new Map(charts.map((c) => [String(c._id), c]));

  const dataSetIds = [
    ...new Set(charts.map((c) => String(c.data_set_id)).filter((id) => mongoose.Types.ObjectId.isValid(id))),
  ];
  const dataSetRaws = dataSetIds.length
    ? await DataSet.find({ _id: { $in: dataSetIds } }).lean()
    : [];
  const dataSetRawById = new Map(dataSetRaws.map((d) => [String(d._id), d]));

  /** @type {Map<string, Promise<any>>} */
  const baseHydrationByDataSetId = new Map();

  const bundles = await Promise.all(
    ids.map(async (cid) => {
      const chart = chartById.get(cid);
      if (!chart) return null;
      const dsId = String(chart.data_set_id || "");
      const dataSetRaw = dataSetRawById.get(dsId);
      if (!dataSetRaw) return null;

      if (!baseHydrationByDataSetId.has(dsId)) {
        baseHydrationByDataSetId.set(dsId, hydrateDataSetForPublicChartViewer(null, cloneJson(dataSetRaw)));
      }
      const baseHydrated = await baseHydrationByDataSetId.get(dsId);
      const dataSet = await hydrateDataSetForPublicChartViewer(chart, cloneJson(baseHydrated));
      const bundle = buildPublicChartBundle(chart, dataSet);
      return {
        cid,
        bundle: trimChartBundleForStorage({
          ...bundle,
          meta: {
            public_slug: chart.public_slug,
            is_public: !!chart.is_public,
          },
        }),
      };
    }),
  );

  const map = new Map();
  for (const item of bundles) {
    if (item?.cid && item.bundle) map.set(item.cid, item.bundle);
  }
  return map;
}

/**
 * Build publish-time chart bundle cache (parallel hydration + trim).
 * @returns {Promise<Record<string, object>>}
 */
export async function buildPublishedChartBundlesForDashboard(dashboardLean, userId) {
  const chartIds = collectChartIdsFromLayout(dashboardLean?.layout);
  const map = await buildChartBundlesParallel(chartIds, userId);
  /** @type {Record<string, object>} */
  const out = {};
  for (const [cid, bundle] of map) {
    out[cid] = bundle;
  }
  return out;
}

/**
 * Resolve card-grid dataSheets for public views (snapshots fast path, else live hydrate).
 */
export async function resolvePublicDashboardCardGridSheets(dash, userId, { preferSnapshots = true } = {}) {
  const layout = dash.layout;
  const snapshots = dash.card_grid_snapshots;
  if (preferSnapshots && snapshots && typeof snapshots === "object" && Object.keys(snapshots).length) {
    return dataSheetsFromCardGridSnapshots(layout, snapshots);
  }

  let dataSheets = {};
  if (dash.data_set_id) {
    const dataSetRaw = await DataSet.findById(dash.data_set_id).lean();
    if (dataSetRaw) {
      const dataSet = await hydrateDataSetForPublicChartViewer(null, dataSetRaw);
      dataSheets =
        dataSet?.data_sheets && typeof dataSet.data_sheets === "object" ? dataSet.data_sheets : {};
      applyCardGridSnapshotsToSheets(dataSheets, layout, snapshots);
      await hydrateCardGridSheetsForPublicDashboard(dataSheets, layout, userId);
    }
  }
  return dataSheets;
}

/**
 * Full public dashboard payload for API (cached bundles when available).
 */
export async function buildPublicDashboardResponseData(dash, user) {
  const chartIds = collectChartIdsFromLayout(dash.layout);
  const useCache = publishedBundlesCoverAllCharts(chartIds, dash.published_chart_bundles);

  let chartBundlesById;
  if (useCache) {
    chartBundlesById = mapFromPublishedBundles(dash.published_chart_bundles, chartIds);
  } else {
    chartBundlesById = await buildChartBundlesParallel(chartIds, user._id);
  }

  const dataSheets = await resolvePublicDashboardCardGridSheets(dash, user._id, {
    preferSnapshots: !!dash.card_grid_snapshots && Object.keys(dash.card_grid_snapshots || {}).length > 0,
  });

  const layoutOut = hydrateLayoutWithChartBundles(dash.layout, chartBundlesById, dataSheets);

  return {
    page_heading: dash.page_heading || "",
    page_subheading: dash.page_subheading || "",
    dashboard_name: dash.dashboard_name || "",
    theme: dash.theme || {},
    layout: layoutOut,
    owner_handle: user.user_name,
    owner_profile_pic: user.profile_pic ? String(user.profile_pic) : null,
    tags: Array.isArray(dash.tags)
      ? dash.tags.map((t) => String(t || "").trim()).filter(Boolean)
      : [],
    _cacheHit: useCache,
  };
}

/**
 * Single chart bundle for progressive client loading.
 */
export async function buildPublicDashboardChartBundle(dash, user, chartId) {
  const cid = String(chartId || "").trim();
  if (!cid || !mongoose.Types.ObjectId.isValid(cid)) {
    return { success: false, message: "Invalid chart id" };
  }

  const chartIds = collectChartIdsFromLayout(dash.layout);
  if (!chartIds.has(cid)) {
    return { success: false, message: "Chart not on this dashboard" };
  }

  const cached = dash.published_chart_bundles?.[cid];
  if (cached?.chart) {
    return {
      success: true,
      data: {
        chart_id: cid,
        chartPayload: {
          chart: cached.chart,
          rows: Array.isArray(cached.rows) ? cached.rows : [],
          dataSheets: cached.dataSheets && typeof cached.dataSheets === "object" ? cached.dataSheets : {},
        },
        chartLink:
          cached.meta?.is_public && cached.meta?.public_slug
            ? { mode: "chart_public", slug: cached.meta.public_slug }
            : null,
        _cacheHit: true,
      },
    };
  }

  const map = await buildChartBundlesParallel(new Set([cid]), user._id);
  const bundle = map.get(cid);
  if (!bundle) {
    return { success: false, message: "Chart not found" };
  }

  return {
    success: true,
    data: {
      chart_id: cid,
      chartPayload: {
        chart: bundle.chart,
        rows: bundle.rows,
        dataSheets: bundle.dataSheets,
      },
      chartLink:
        bundle.meta?.is_public && bundle.meta?.public_slug
          ? { mode: "chart_public", slug: bundle.meta.public_slug }
          : null,
      _cacheHit: false,
    },
  };
}

export function publicDashboardCacheControl(cacheHit) {
  if (cacheHit) {
    return "public, s-maxage=3600, stale-while-revalidate=86400";
  }
  return "public, s-maxage=120, stale-while-revalidate=600";
}
