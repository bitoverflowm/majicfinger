/**
 * Dev-only, in-memory registry for dashboard charts that are never persisted.
 *
 * Used by the Events Candlesticks power move when running `next dev` without a
 * signed-in DB user: dashboard columns get `chart_id: "local:…"` and
 * IsolatedChartPreview resolves them here instead of `GET /api/charts/chart/:id`.
 *
 * Never active in production builds — `process.env.NODE_ENV` is inlined by
 * Next.js so the local branch is dead-code eliminated.
 */

export const LOCAL_DASHBOARD_CHART_PREFIX = "local:";

/** @returns {boolean} */
export function isDevLocalDashboardChartsEnabled() {
  return process.env.NODE_ENV !== "production";
}

/** @param {unknown} chartId */
export function isLocalDashboardChartId(chartId) {
  return String(chartId || "").startsWith(LOCAL_DASHBOARD_CHART_PREFIX);
}

/** @type {Map<string, object>} id → lean-chart-shaped doc */
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
 * Register a chart in the shape IsolatedChartPreview expects from
 * `GET /api/charts/chart/:id` (lean doc with `chart_properties[0].rechartsBuilder`).
 *
 * @param {{ chartName: string; snapshot: object; id?: string }} opts
 * @returns {string} the local chart id
 */
export function registerLocalDashboardChart(opts) {
  if (!isDevLocalDashboardChartsEnabled()) {
    throw new Error("Local dashboard charts are dev-only.");
  }
  const id = opts.id || allocateLocalDashboardChartId(opts.chartName);
  registry.set(id, {
    _id: id,
    chart_name: String(opts.chartName || "Chart"),
    chart_properties: [{ title: String(opts.chartName || "Chart"), rechartsBuilder: opts.snapshot }],
    labels: ["local", "power-move"],
    data_set_id: null,
    __local: true,
  });
  return id;
}

/**
 * @param {string} chartId
 * @returns {object | null}
 */
export function getLocalDashboardChart(chartId) {
  if (!isDevLocalDashboardChartsEnabled()) return null;
  return registry.get(String(chartId || "")) || null;
}

/** Test/reset helper. */
export function clearLocalDashboardCharts() {
  registry.clear();
}
