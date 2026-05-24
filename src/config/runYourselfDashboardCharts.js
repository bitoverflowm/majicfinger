/**
 * Per-chart parameter config for run-yourself dashboard forks.
 */

/** Sentinel value: keep source query scope (no category filter change). */
export const RUN_YOURSELF_ALL_CATEGORIES = "__ALL__";

/** @typedef {"none" | "category_optional" | "dual_category_optional"} DashboardChartParameterMode */

/**
 * @typedef {object} DashboardChartSlotConfig
 * @property {string} key Layout column id (stable within the source dashboard)
 * @property {string} matchTitle Fallback match on column h2
 * @property {DashboardChartParameterMode} parameterMode
 * @property {string} [hint]
 */

/** @type {Record<string, DashboardChartSlotConfig[]>} */
export const RUN_YOURSELF_DASHBOARD_CHART_SLOTS = {
  "kalshi-volume-dashboard": [
    {
      key: "col-moqt54rb-to45psw",
      matchTitle: "Total Kalshi Trading Volume Over Time",
      parameterMode: "category_optional",
      hint: "All Kalshi markets, or filter to one taxonomy category.",
    },
    {
      key: "col-moq40a2h-g20me8h",
      matchTitle: "Monthly Trading Volume",
      parameterMode: "category_optional",
    },
    {
      key: "col-moqx8196-znain2n",
      matchTitle: "Volume Growth Rate (MoM % Change)",
      parameterMode: "category_optional",
    },
    {
      key: "col-moqyi0sw-d0a17il",
      matchTitle: "Volume Distribution by Category",
      parameterMode: "none",
      hint: "Replicates as-is — already shows every category.",
    },
    {
      key: "col-morjfvtp-01xufhg",
      matchTitle: "Top Markets by Trading Volume",
      parameterMode: "category_optional",
    },
    {
      key: "col-mormfjmi-ty1fnah",
      matchTitle: "Cumulative Total Volume (All-Time)",
      parameterMode: "category_optional",
    },
    {
      key: "col-morn0ck0-6buwpnn",
      matchTitle: "Kalshi vs Polymarket Trading Volume",
      parameterMode: "dual_category_optional",
      hint: "Optionally filter each platform by category.",
    },
  ],
};

/** Common Polymarket event/market categories for compose filters. */
export const POLYMARKET_CATEGORY_OPTIONS = [
  "Politics",
  "Sports",
  "Crypto",
  "Pop Culture",
  "Business",
  "Science",
  "Tech",
  "Entertainment",
  "World",
  "Other",
];

/**
 * @param {string} analysisId
 * @returns {DashboardChartSlotConfig[]}
 */
export function getDashboardChartSlots(analysisId) {
  return RUN_YOURSELF_DASHBOARD_CHART_SLOTS[analysisId] || [];
}

/**
 * @param {DashboardChartSlotConfig} slot
 * @param {{ id?: string; h2?: string }} layoutColumn
 */
export function matchDashboardChartSlot(slot, layoutColumn) {
  const colId = String(layoutColumn?.id || "").trim();
  if (colId && slot.key === colId) return true;
  const title = String(layoutColumn?.h2 || "")
    .trim()
    .toLowerCase();
  return title === String(slot.matchTitle || "").trim().toLowerCase();
}

/**
 * @param {string} analysisId
 * @param {{ id?: string; h2?: string }} layoutColumn
 * @returns {DashboardChartSlotConfig | null}
 */
export function resolveDashboardChartSlot(analysisId, layoutColumn) {
  const slots = getDashboardChartSlots(analysisId);
  return slots.find((s) => matchDashboardChartSlot(s, layoutColumn)) || null;
}

/**
 * Resolve slot from manifest chart row (includes layoutColumnId + chartId).
 * @param {string} analysisId
 * @param {{ layoutColumnId?: string; chartId?: string; title?: string; key?: string }} chart
 */
export function resolveDashboardChartSlotFromManifest(analysisId, chart) {
  const slots = getDashboardChartSlots(analysisId);
  const colId = String(chart?.layoutColumnId || chart?.key || "").trim();
  if (colId) {
    const byKey = slots.find((s) => s.key === colId);
    if (byKey) return byKey;
  }
  const title = String(chart?.title || "").trim().toLowerCase();
  if (title) {
    const byTitle = slots.find(
      (s) => String(s.matchTitle || "").trim().toLowerCase() === title,
    );
    if (byTitle) return byTitle;
  }
  return null;
}

/** @param {DashboardChartParameterMode} mode */
export function defaultChartParameterValues(mode) {
  if (mode === "trade_search" || mode === "market_search") {
    return { ticker: "" };
  }
  if (mode === "dual_category_optional") {
    return {
      kalshiCategory: RUN_YOURSELF_ALL_CATEGORIES,
      polymarketCategory: RUN_YOURSELF_ALL_CATEGORIES,
    };
  }
  if (mode === "category_optional") {
    return { kalshiCategory: RUN_YOURSELF_ALL_CATEGORIES };
  }
  return {};
}
