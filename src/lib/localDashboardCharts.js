/**
 * In-memory registry for dashboard charts that have not been persisted yet.
 *
 * Power moves plot straight from workspace sheets: dashboard columns get
 * `chart_id: "local:…"` and `IsolatedChartPreview` renders them from this
 * registry instead of `GET /api/charts/chart/:id`. Nothing touches Mongo until
 * the user actually saves the dashboard, at which point
 * `materializeLocalDashboardCharts` creates the real chart docs once and
 * rewrites the layout. This keeps one-click previews free of DB bloat.
 */

export const LOCAL_DASHBOARD_CHART_PREFIX = "local:";

/** @param {unknown} chartId */
export function isLocalDashboardChartId(chartId) {
  return String(chartId || "").startsWith(LOCAL_DASHBOARD_CHART_PREFIX);
}

/**
 * @typedef {{
 *   doc: object,
 *   snapshot: object,
 *   chartName: string,
 *   materializedId: string | null,
 *   inFlight: Promise<string> | null,
 * }} LocalChartEntry
 */

/** @type {Map<string, LocalChartEntry>} */
const registry = new Map();

let seq = 0;

/**
 * @param {string} [hint] readable suffix (e.g. market ticker)
 * @returns {string}
 */
export function allocateLocalDashboardChartId(hint = "") {
  seq += 1;
  const slug = String(hint || "chart")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${LOCAL_DASHBOARD_CHART_PREFIX}${slug || "chart"}-${seq}-${Date.now().toString(36)}`;
}

/**
 * Register a chart in the shape `IsolatedChartPreview` expects from
 * `GET /api/charts/chart/:id` (lean doc with `chart_properties[0].rechartsBuilder`).
 *
 * @param {{ chartName: string; snapshot: object; id?: string }} opts
 * @returns {string} the local chart id
 */
export function registerLocalDashboardChart(opts) {
  const id = opts.id || allocateLocalDashboardChartId(opts.chartName);
  const chartName = String(opts.chartName || "Chart");
  registry.set(id, {
    doc: {
      _id: id,
      chart_name: chartName,
      chart_properties: [{ title: chartName, rechartsBuilder: opts.snapshot }],
      labels: ["power-move"],
      data_set_id: null,
      __local: true,
    },
    snapshot: opts.snapshot,
    chartName,
    materializedId: null,
    inFlight: null,
  });
  return id;
}

/**
 * @param {string} chartId
 * @returns {object | null} lean-chart-shaped doc, or null when unknown
 */
export function getLocalDashboardChart(chartId) {
  return registry.get(String(chartId || ""))?.doc || null;
}

/** Test/reset helper. */
export function clearLocalDashboardCharts() {
  registry.clear();
}

/**
 * Create the real chart doc for one local id. Idempotent: repeated saves reuse
 * the first created `_id` instead of inserting duplicates.
 *
 * @param {{ localId: string; userId: string; dataSetId: string }} opts
 * @returns {Promise<string>} Mongo chart id
 */
async function materializeOne(opts) {
  const entry = registry.get(opts.localId);
  if (!entry) throw new Error("Local chart is no longer available.");
  if (entry.materializedId) return entry.materializedId;
  if (entry.inFlight) return entry.inFlight;

  const run = (async () => {
    const res = await fetch("/api/charts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        chart_name: entry.chartName,
        chart_properties: [{ title: entry.chartName, rechartsBuilder: entry.snapshot }],
        created_date: new Date(),
        last_saved_date: new Date(),
        labels: ["power-move", "candlestick"],
        user_id: opts.userId,
        data_set_id: opts.dataSetId,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!json?.success || !json?.data?._id) {
      throw new Error(json?.message || "Failed to save chart.");
    }
    const realId = String(json.data._id);
    entry.materializedId = realId;
    // Keep the local id renderable after save (draft in memory still points at it).
    entry.doc = { ...entry.doc, _id: realId, data_set_id: opts.dataSetId, __local: false };
    return realId;
  })();

  entry.inFlight = run;
  try {
    return await run;
  } finally {
    entry.inFlight = null;
  }
}

/**
 * Replace every `local:` chart id in a dashboard layout with a persisted chart id,
 * creating the chart docs on first save. Returns the original layout untouched
 * when there is nothing local to materialize.
 *
 * @param {{ layout: unknown; userId: string; dataSetId: string }} opts
 * @returns {Promise<{ layout: unknown; changed: boolean }>}
 */
export async function materializeLocalDashboardCharts(opts) {
  const layout = opts.layout;
  const rows = layout && typeof layout === "object" && Array.isArray(layout.rows) ? layout.rows : null;
  if (!rows) return { layout, changed: false };

  /** @type {Set<string>} */
  const localIds = new Set();
  for (const row of rows) {
    if (row?.type !== "cards" || !Array.isArray(row.columns)) continue;
    for (const col of row.columns) {
      if (isLocalDashboardChartId(col?.chart_id)) localIds.add(String(col.chart_id));
    }
  }
  if (!localIds.size) return { layout, changed: false };
  if (!opts.userId || !opts.dataSetId) return { layout, changed: false };

  /** @type {Map<string, string>} */
  const idMap = new Map();
  for (const localId of localIds) {
    // Sequential: keeps chart creation order stable and avoids burst writes.
    idMap.set(localId, await materializeOne({ localId, userId: opts.userId, dataSetId: opts.dataSetId }));
  }

  const nextRows = rows.map((row) => {
    if (row?.type !== "cards" || !Array.isArray(row.columns)) return row;
    return {
      ...row,
      columns: row.columns.map((col) => {
        const mapped = isLocalDashboardChartId(col?.chart_id)
          ? idMap.get(String(col.chart_id))
          : null;
        return mapped ? { ...col, chart_id: mapped } : col;
      }),
    };
  });

  return { layout: { ...layout, rows: nextRows }, changed: true };
}
