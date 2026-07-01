/**
 * Infer run-for-yourself parameter mode from saved sheet provenance (no curated config).
 */
import { collectSheetClosureForCharts } from "@/lib/runYourself/collectSheetClosure";
import { collectLakePullSheetIds } from "@/lib/runYourself/patchDashboardChartSheets";
import { RUN_YOURSELF_ALL_CATEGORIES, resolveDashboardChartSlot } from "@/config/runYourselfDashboardCharts";

/** @typedef {"trade_search" | "market_search" | "category_optional" | "dual_category_optional" | "none"} InferredParameterMode */

/**
 * @typedef {object} InferredRunConfig
 * @property {string} id
 * @property {string} label
 * @property {string} [description]
 * @property {InferredParameterMode} parameterMode
 * @property {boolean} runnable
 * @property {string} [lake]
 * @property {string} [table]
 * @property {string[]} tickerFilterColumns
 * @property {string[]} categoryFilterColumns
 * @property {string} [defaultCategory]
 * @property {string} [defaultTicker]
 * @property {string} [reason] Why not runnable
 */

const CATEGORY_COLUMNS = new Set([
  "kalshi_taxonomy_category",
  "category",
  "kalshi_event_ticker_category",
  "subcategory",
  "tags",
]);

const TICKER_COLUMNS = new Set([
  "ticker",
  "market_ticker",
  "event_ticker",
  "market",
  "market_id",
]);

function normalizeCol(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function isCategoryColumn(column) {
  const n = normalizeCol(column);
  return CATEGORY_COLUMNS.has(n);
}

function isTickerColumn(column) {
  const n = normalizeCol(column);
  return TICKER_COLUMNS.has(n) || n.endsWith("_ticker");
}

function collectProvenanceFilters(provenance) {
  /** @type {object[]} */
  const out = [];
  const cf = provenance?.composeFilters;
  if (cf && typeof cf === "object") {
    for (const key of ["and", "or"]) {
      const arr = Array.isArray(cf[key]) ? cf[key] : [];
      out.push(...arr);
    }
  }
  const where = provenance?.composeSpec?.where;
  if (Array.isArray(where)) out.push(...where);
  return out;
}

/**
 * @param {Record<string, object>} dataSheets
 * @param {string} sheetId
 * @returns {{ lake: string; table: string; filters: object[]; provenance: object }[]}
 */
function collectLakePullContexts(dataSheets, sheetId) {
  /** @type {Set<string>} */
  const pullIds = collectLakePullSheetIds(dataSheets, sheetId, new Set());
  /** @type {{ lake: string; table: string; filters: object[]; provenance: object }[]} */
  const out = [];
  for (const id of pullIds) {
    const sheet = dataSheets[id];
    const prov = sheet?.provenance;
    if (!prov || prov.kind !== "compose") continue;
    const lake = String(prov.lake || "").trim().toLowerCase();
    const table = String(prov.table || "").trim().toLowerCase();
    if (!lake || !table) continue;
    out.push({
      lake,
      table,
      filters: collectProvenanceFilters(prov),
      provenance: prov,
    });
  }
  return out;
}

/**
 * @param {object[]} filters
 * @returns {{ column: string; value: string } | null}
 */
function findEqStringFilter(filters, predicate) {
  for (const f of filters) {
    const col = String(f?.column ?? f?.field ?? "").trim();
    const op = String(f?.op || "").trim();
    if (!col || op !== "eq") continue;
    if (!predicate(col)) continue;
    const v = f?.value;
    if (v == null || String(v).trim() === "") continue;
    return { column: col, value: String(v).trim() };
  }
  return null;
}

/**
 * @param {{ lake: string; table: string; filters: object[] }[]} contexts
 * @returns {InferredParameterMode}
 */
function inferModeFromContexts(contexts) {
  if (!contexts.length) return "none";

  const lakes = new Set(contexts.map((c) => c.lake));
  const hasKalshi = lakes.has("kalshi");
  const hasPoly = lakes.has("polymarket");

  const kalshiCategory = contexts.some(
    (c) => c.lake === "kalshi" && findEqStringFilter(c.filters, isCategoryColumn),
  );
  const polyCategory = contexts.some(
    (c) => c.lake === "polymarket" && findEqStringFilter(c.filters, isCategoryColumn),
  );

  if (hasKalshi && hasPoly && (kalshiCategory || polyCategory)) {
    return "dual_category_optional";
  }

  const tickerOnTrades = contexts.some(
    (c) => c.table === "trades" && findEqStringFilter(c.filters, isTickerColumn),
  );
  if (tickerOnTrades) return "trade_search";

  const tickerOnMarkets = contexts.some(
    (c) => c.table === "markets" && findEqStringFilter(c.filters, isTickerColumn),
  );
  if (tickerOnMarkets) return "market_search";

  const hasCategoryFilter = contexts.some((c) => findEqStringFilter(c.filters, isCategoryColumn));
  if (hasCategoryFilter) return "category_optional";

  const allTrades = contexts.every((c) => c.table === "trades");
  const allMarkets = contexts.every((c) => c.table === "markets");
  if (allTrades || allMarkets) return "category_optional";

  // Kalshi top-markets style charts often join trades + markets without a fixed ticker filter.
  const kalshiOnly = hasKalshi && !hasPoly;
  const hasTradesTable = contexts.some((c) => c.lake === "kalshi" && c.table === "trades");
  const hasMarketsTable = contexts.some((c) => c.lake === "kalshi" && c.table === "markets");
  if (kalshiOnly && hasTradesTable && hasMarketsTable) return "category_optional";

  return "none";
}

/**
 * @param {{ lake: string; table: string; filters: object[] }[]} contexts
 * @returns {{ defaultCategory?: string; defaultTicker?: string; categoryColumns: string[]; tickerColumns: string[] }}
 */
function inferDefaultsFromContexts(contexts) {
  /** @type {Set<string>} */
  const categoryColumns = new Set();
  /** @type {Set<string>} */
  const tickerColumns = new Set();
  let defaultCategory;
  let defaultTicker;

  for (const ctx of contexts) {
    for (const f of ctx.filters) {
      const col = String(f?.column ?? f?.field ?? "").trim();
      if (!col) continue;
      if (isCategoryColumn(col)) categoryColumns.add(col);
      if (isTickerColumn(col)) tickerColumns.add(col);
    }
    const cat = findEqStringFilter(ctx.filters, isCategoryColumn);
    if (cat && !defaultCategory) defaultCategory = cat.value;
    const tick = findEqStringFilter(ctx.filters, isTickerColumn);
    if (tick && !defaultTicker) defaultTicker = tick.value;
  }

  if (!categoryColumns.size) {
    categoryColumns.add("kalshi_taxonomy_category");
    categoryColumns.add("category");
  }
  if (!tickerColumns.size) {
    tickerColumns.add("ticker");
    tickerColumns.add("market_ticker");
  }

  return {
    defaultCategory,
    defaultTicker,
    categoryColumns: [...categoryColumns],
    tickerColumns: [...tickerColumns],
  };
}

/**
 * @param {Record<string, object>} dataSheets
 * @param {object} chart
 * @returns {InferredRunConfig}
 */
export function inferRunConfigForChart(dataSheets, chart) {
  const chartName = String(chart?.chart_name || "Chart").trim() || "Chart";
  const sheetIds = collectSheetClosureForCharts(dataSheets || {}, [chart]);

  /** @type {{ lake: string; table: string; filters: object[]; provenance: object }[]} */
  const allContexts = [];
  for (const sid of sheetIds) {
    allContexts.push(...collectLakePullContexts(dataSheets, sid));
  }

  if (!allContexts.length) {
    return {
      id: `chart:${chart?._id || chartName}`,
      label: chartName,
      parameterMode: "none",
      runnable: false,
      tickerFilterColumns: ["ticker"],
      categoryFilterColumns: ["kalshi_taxonomy_category", "category"],
      reason: "No lake compose pulls found for this chart.",
    };
  }

  const mode = inferModeFromContexts(allContexts);
  const { defaultCategory, defaultTicker, categoryColumns, tickerColumns } =
    inferDefaultsFromContexts(allContexts);
  const primaryLake = allContexts[0]?.lake;
  const primaryTable = allContexts[0]?.table;

  const runnable = mode !== "none";

  return {
    id: `chart:${chart?._id || chartName}`,
    label: chartName,
    description: runnable
      ? "Fork this chart with your own market or category parameters."
      : undefined,
    parameterMode: mode,
    runnable,
    lake: primaryLake,
    table: primaryTable,
    tickerFilterColumns: tickerColumns,
    categoryFilterColumns: categoryColumns,
    defaultCategory: defaultCategory || undefined,
    defaultTicker: defaultTicker || undefined,
  };
}

/**
 * Infer per-chart slots for a dashboard layout.
 * @param {Record<string, object>} dataSheets
 * @param {object[]} charts
 * @param {object} layout
 * @returns {object[]}
 */
export function inferDashboardChartManifest(dataSheets, charts, layout, analysisId) {
  const chartsById = new Map((charts || []).map((c) => [String(c._id), c]));
  /** @type {object[]} */
  const out = [];
  const rows = Array.isArray(layout?.rows) ? layout.rows : [];

  for (const row of rows) {
    if (row?.type !== "cards" || !Array.isArray(row.columns)) continue;
    for (const col of row.columns) {
      const chartId = col?.chart_id ? String(col.chart_id) : "";
      const chart = chartsById.get(chartId);
      if (!chart) continue;

      const inferred = inferRunConfigForChart(dataSheets, chart);
      const curatedSlot = analysisId ? resolveDashboardChartSlot(analysisId, col) : null;
      const merged = curatedSlot
        ? mergeCuratedDashboardChartSlot({ id: analysisId }, col, inferred)
        : inferred;
      const parameterMode =
        merged.parameterMode === "dual_category_optional"
          ? "dual_category_optional"
          : merged.parameterMode === "trade_search" || merged.parameterMode === "market_search"
            ? merged.parameterMode
            : merged.parameterMode === "none"
              ? "none"
              : "category_optional";

      out.push({
        key: String(col.id || chartId),
        layoutColumnId: col.id,
        chartId,
        title: col.h2 || col.caption || chart.chart_name || "Chart",
        caption: col.caption || "",
        parameterMode,
        hint:
          curatedSlot?.hint ||
          (parameterMode === "dual_category_optional"
            ? "Optionally filter each platform by category."
            : parameterMode === "category_optional"
              ? "All categories, or filter to one taxonomy category."
              : ""),
        defaults: defaultValuesForDashboardMode(parameterMode, merged),
        inferred: merged,
      });
    }
  }

  return out;
}

/** @param {string} mode @param {InferredRunConfig} inferred */
function defaultValuesForDashboardMode(mode, inferred) {
  if (mode === "dual_category_optional") {
    return {
      kalshiCategory: inferred.defaultCategory || RUN_YOURSELF_ALL_CATEGORIES,
      polymarketCategory: RUN_YOURSELF_ALL_CATEGORIES,
    };
  }
  if (mode === "category_optional") {
    return {
      kalshiCategory: inferred.defaultCategory || RUN_YOURSELF_ALL_CATEGORIES,
    };
  }
  if (mode === "trade_search" || mode === "market_search") {
    return { ticker: inferred.defaultTicker || "" };
  }
  return {};
}

/**
 * @param {Record<string, object>} dataSheets
 * @param {object[]} charts
 * @param {object} [dashboard]
 * @returns {InferredRunConfig}
 */
export function inferRunConfigForDashboard(dataSheets, charts, dashboard, analysisId) {
  const name = String(dashboard?.dashboard_name || "Dashboard").trim() || "Dashboard";
  const manifest = inferDashboardChartManifest(dataSheets, charts, dashboard?.layout, analysisId);
  const anyRunnable = manifest.some((c) => c.inferred?.runnable);

  return {
    id: `dashboard:${dashboard?._id || name}`,
    label: name,
    description: "Replicate this dashboard with your own parameters per chart.",
    parameterMode: "category_optional",
    runnable: anyRunnable,
    tickerFilterColumns: ["ticker", "market_ticker"],
    categoryFilterColumns: ["kalshi_taxonomy_category", "category"],
    reason: anyRunnable ? undefined : "No runnable charts found on this dashboard.",
  };
}

/**
 * @param {object} [layout]
 * @param {string} chartId
 * @returns {{ id?: string; h2?: string; chart_id?: string } | null}
 */
export function findDashboardLayoutColumn(layout, chartId) {
  const id = String(chartId || "").trim();
  if (!id) return null;
  const rows = Array.isArray(layout?.rows) ? layout.rows : [];
  for (const row of rows) {
    if (row?.type !== "cards" || !Array.isArray(row.columns)) continue;
    for (const col of row.columns) {
      if (col?.chart_id && String(col.chart_id) === id) return col;
    }
  }
  return null;
}

/**
 * Apply per-chart curated slot config for dashboard forks (overrides inference when listed).
 * @param {import("@/config/runYourselfAnalyses").RunAnalysisConfig | null} curatedAnalysis
 * @param {{ id?: string; h2?: string }} layoutColumn
 * @param {InferredRunConfig} inferred
 * @returns {InferredRunConfig}
 */
export function mergeCuratedDashboardChartSlot(curatedAnalysis, layoutColumn, inferred) {
  if (!curatedAnalysis?.id || !layoutColumn) return inferred;
  const slot = resolveDashboardChartSlot(curatedAnalysis.id, layoutColumn);
  if (!slot) return inferred;

  if (slot.parameterMode === "none") {
    return { ...inferred, runnable: true, parameterMode: "none" };
  }

  const parameterMode =
    slot.parameterMode === "dual_category_optional" ? "dual_category_optional" : "category_optional";

  return {
    ...inferred,
    runnable: true,
    parameterMode,
  };
}

/**
 * Merge curated analysis config with inferred config (curated wins when present).
 * @param {import("@/config/runYourselfAnalyses").RunAnalysisConfig | null} curated
 * @param {InferredRunConfig} inferred
 */
export function mergeRunConfig(curated, inferred) {
  if (!curated) return inferred;
  return {
    ...inferred,
    id: curated.id,
    label: curated.label || inferred.label,
    description: curated.description || inferred.description,
    parameterMode: curated.parameterMode === "category_dropdown"
      ? "category_optional"
      : curated.parameterMode || inferred.parameterMode,
    tickerFilterColumns: curated.tickerFilterColumns || inferred.tickerFilterColumns,
    categoryFilterColumns: curated.categoryFilterColumns || inferred.categoryFilterColumns,
    defaultCategory: curated.defaultCategory || inferred.defaultCategory,
    runnable: inferred.runnable || Boolean(curated),
    lake: curated.lake || inferred.lake,
    table: curated.table || inferred.table,
  };
}
