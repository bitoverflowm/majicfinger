/**
 * Curated analyses available in the Run-for-yourself wizard.
 */

/** @typedef {"trade_search" | "market_search" | "category_dropdown"} RunParameterMode */

/**
 * @typedef {object} RunAnalysisConfig
 * @property {string} id
 * @property {string} label
 * @property {string} [description]
 * @property {RunParameterMode} parameterMode
 * @property {{ ownerHandle: string; slug: string }[]} sourceCharts
 * @property {{ ownerHandle: string; slug: string }[]} [sourceDashboards]
 * @property {string[]} [tickerFilterColumns]
 * @property {string[]} [categoryFilterColumns]
 * @property {string} [defaultCategory]
 * @property {string} [lake]
 * @property {string} [table]
 */

/** @type {RunAnalysisConfig[]} */
export const RUN_YOURSELF_ANALYSES = [
  {
    id: "weather-probability-convergence",
    label: "Weather probability convergence",
    description: "Historical trade prices converging toward resolution for a single weather market.",
    parameterMode: "trade_search",
    lake: "kalshi",
    table: "trades",
    tickerFilterColumns: ["ticker", "market_ticker"],
    sourceCharts: [
      {
        ownerHandle: "misterrpink",
        slug: "kalshi-weather-probability-convergence-jan-2025-2",
      },
    ],
  },
  {
    id: "weather-market-calibration",
    label: "Weather market calibration curve",
    description: "Compare implied probabilities vs outcomes across all markets in a Kalshi category.",
    parameterMode: "category_dropdown",
    lake: "kalshi",
    table: "markets",
    categoryFilterColumns: ["kalshi_taxonomy_category", "category"],
    defaultCategory: "Weather",
    sourceCharts: [
      {
        ownerHandle: "misterrpink",
        slug: "weather-market-calibration-curve",
      },
    ],
  },
  {
    id: "nyc-weather-intraday-volatility",
    label: "NYC weather intraday volatility",
    description: "Intraday volatility clustering for a NYC weather market.",
    parameterMode: "trade_search",
    lake: "kalshi",
    table: "trades",
    tickerFilterColumns: ["ticker", "market_ticker"],
    sourceCharts: [
      {
        ownerHandle: "misterrpink",
        slug: "nyc-weather-market-intraday-volatility-clustering",
      },
    ],
  },
  {
    id: "kalshi-volume-dashboard",
    label: "Kalshi volume dashboard",
    description:
      "Platform volume trends, monthly growth, category breakdown, and top markets — full dashboard replica.",
    parameterMode: "category_dropdown",
    lake: "kalshi",
    table: "trades",
    categoryFilterColumns: ["kalshi_taxonomy_category", "category"],
    sourceDashboards: [
      { ownerHandle: "misterrpink", slug: "kalshi-volume-dashboard" },
    ],
    sourceCharts: [
      { ownerHandle: "misterrpink", slug: "kalshi-quaterly-volume" },
      { ownerHandle: "misterrpink", slug: "kalshi-quaterly-volume-chart" },
      { ownerHandle: "misterrpink", slug: "kalshi-volume-by-category" },
    ],
  },
  {
    id: "kalshi-quarterly-volume",
    label: "Kalshi quarterly volume",
    description: "Aggregate trading volume over time from historical Kalshi trades.",
    parameterMode: "trade_search",
    lake: "kalshi",
    table: "trades",
    tickerFilterColumns: ["ticker", "market_ticker"],
    sourceCharts: [
      { ownerHandle: "misterrpink", slug: "kalshi-quaterly-volume" },
      { ownerHandle: "misterrpink", slug: "kalshi-quaterly-volume-chart" },
    ],
  },
  {
    id: "kalshi-volume-by-category",
    label: "Kalshi volume by category",
    description: "Volume distribution across Kalshi market categories.",
    parameterMode: "market_search",
    lake: "kalshi",
    table: "markets",
    tickerFilterColumns: ["ticker", "event_ticker", "category"],
    sourceCharts: [{ ownerHandle: "misterrpink", slug: "kalshi-volume-by-category" }],
  },
];

/** Analyses that fork a single chart (no full dashboard replicate). */
export const RUN_YOURSELF_CHART_ANALYSES = RUN_YOURSELF_ANALYSES.filter(
  (a) => !(a.sourceDashboards || []).length,
);

/** Analyses that replicate an entire public dashboard. */
export const RUN_YOURSELF_DASHBOARD_ANALYSES = RUN_YOURSELF_ANALYSES.filter(
  (a) => (a.sourceDashboards || []).length > 0,
);

/**
 * @param {RunAnalysisConfig} analysis
 * @returns {boolean}
 */
export function isDashboardRunAnalysis(analysis) {
  return (analysis?.sourceDashboards || []).length > 0;
}

/**
 * Resolve dashboard slug/owner for a dashboard analysis fork.
 * @param {RunAnalysisConfig} analysis
 * @param {{ ownerHandle?: string; dashboardSlug?: string }} [source]
 */
export function resolveDashboardForkSource(analysis, source = {}) {
  const dash = analysis?.sourceDashboards?.[0];
  return {
    ownerHandle: source.ownerHandle || dash?.ownerHandle || "",
    dashboardSlug: source.dashboardSlug || dash?.slug || "",
  };
}

function normalizeHandle(ownerHandle) {
  return String(ownerHandle || "").trim().toLowerCase();
}

function normalizeSlug(slug) {
  return String(slug || "").trim().toLowerCase();
}

/**
 * @param {string} ownerHandle
 * @param {string} slug
 * @returns {RunAnalysisConfig | null}
 */
export function findAnalysisForSourceChart(ownerHandle, slug) {
  const owner = normalizeHandle(ownerHandle);
  const s = normalizeSlug(slug);
  return (
    RUN_YOURSELF_ANALYSES.find((a) =>
      (a.sourceCharts || []).some(
        (sc) => normalizeHandle(sc.ownerHandle) === owner && normalizeSlug(sc.slug) === s,
      ),
    ) || null
  );
}

/**
 * @param {string} ownerHandle
 * @param {string} dashboardSlug
 * @returns {RunAnalysisConfig | null}
 */
export function findAnalysisForSourceDashboard(ownerHandle, dashboardSlug) {
  const owner = normalizeHandle(ownerHandle);
  const s = normalizeSlug(dashboardSlug);
  return (
    RUN_YOURSELF_ANALYSES.find((a) =>
      (a.sourceDashboards || []).some(
        (sd) => normalizeHandle(sd.ownerHandle) === owner && normalizeSlug(sd.slug) === s,
      ),
    ) || null
  );
}

/**
 * @param {string} analysisId
 * @returns {RunAnalysisConfig | null}
 */
export function getRunYourselfAnalysisById(analysisId) {
  return RUN_YOURSELF_ANALYSES.find((a) => a.id === analysisId) || null;
}

/**
 * @param {string} ownerHandle
 * @param {string} slug
 * @returns {boolean}
 */
export function isRunnablePublicChart(ownerHandle, slug) {
  return !!findAnalysisForSourceChart(ownerHandle, slug);
}

/**
 * @param {string} ownerHandle
 * @param {string} dashboardSlug
 * @returns {boolean}
 */
export function isRunnablePublicDashboard(ownerHandle, dashboardSlug) {
  return !!findAnalysisForSourceDashboard(ownerHandle, dashboardSlug);
}

/**
 * @param {string} ownerHandle
 * @param {string} chartSlug
 * @param {string} [dashboardSlug]
 * @returns {boolean}
 */
export function isRunnableRunYourselfSource(ownerHandle, chartSlug, dashboardSlug) {
  if (chartSlug && isRunnablePublicChart(ownerHandle, chartSlug)) return true;
  if (dashboardSlug && isRunnablePublicDashboard(ownerHandle, dashboardSlug)) return true;
  return false;
}
