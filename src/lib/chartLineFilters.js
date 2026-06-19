import { temporalToMs } from "@/lib/temporalParse";
import { deScopeChartColumnKey } from "@/lib/chartSnapshotDataDeps";
import { PUBLISHED_BUNDLE_FILTER_ROW_CAP } from "@/lib/publishedChartBundleConfig";

/**
 * Sheet rows store plain column names; axis keys from the builder are often `sheetId::column`.
 * @param {Record<string, unknown> | null | undefined} row
 * @param {unknown} key
 */
export function rowValueForDataKey(row, key) {
  if (!row || key == null || key === "") return undefined;
  if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  const s = String(key);
  const splitIdx = s.indexOf("::");
  if (splitIdx > 0) {
    const col = s.slice(splitIdx + 2);
    if (col && Object.prototype.hasOwnProperty.call(row, col)) return row[col];
  }
  return undefined;
}

/**
 * @param {unknown} value
 */
export function normalizeChartLineFilters(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((rule, idx) => {
      if (!rule || typeof rule !== "object") return null;
      const seriesKey = String(rule.seriesKey || "");
      const column = String(rule.column || "");
      const next = {
        id: String(rule.id || `filter-${idx}`),
        seriesKey,
        column,
        operator: String(rule.operator || "="),
        value: rule.value ?? "",
      };
      return next.seriesKey ? next : null;
    })
    .filter(Boolean);
}

function coerceComparableValue(value) {
  if (value == null || value === "") return { kind: "empty", value: "" };
  const ms = temporalToMs(value);
  if (Number.isFinite(ms)) return { kind: "number", value: ms };
  const n = Number(value);
  if (Number.isFinite(n)) return { kind: "number", value: n };
  return { kind: "string", value: String(value).toLowerCase() };
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ column?: string, operator?: string, value?: unknown }} rule
 */
export function chartFilterRuleMatches(row, rule) {
  if (!rule?.column || !rule?.operator) return true;
  const raw = rowValueForDataKey(row, rule.column);
  const op = String(rule.operator || "=");
  if (op === "is_empty") return raw == null || raw === "";
  if (op === "is_not_empty") return raw != null && raw !== "";
  const expected = rule.value;
  if (op === "date_range" || (expected && typeof expected === "object" && ("from" in expected || "to" in expected))) {
    const hasFrom = Boolean(expected?.from);
    const hasTo = Boolean(expected?.to);
    if (!hasFrom && !hasTo) return true;
    const rawMs = temporalToMs(raw);
    if (!Number.isFinite(rawMs)) return false;
    const fromMs = expected?.from ? temporalToMs(expected.from) : NaN;
    const toBaseMs = expected?.to ? temporalToMs(expected.to) : NaN;
    const toMs = Number.isFinite(toBaseMs) ? toBaseMs + 24 * 60 * 60 * 1000 - 1 : NaN;
    if (Number.isFinite(fromMs) && rawMs < fromMs) return false;
    if (Number.isFinite(toMs) && rawMs > toMs) return false;
    return Number.isFinite(fromMs) || Number.isFinite(toMs);
  }
  if (expected == null || expected === "") return true;
  if (op === "contains" || op === "not_contains") {
    const hit = String(raw ?? "").toLowerCase().includes(String(expected).toLowerCase());
    return op === "not_contains" ? !hit : hit;
  }
  const left = coerceComparableValue(raw);
  const right = coerceComparableValue(expected);
  const comparable = left.kind === "number" && right.kind === "number";
  const a = comparable ? left.value : String(raw ?? "").toLowerCase();
  const b = comparable ? right.value : String(expected ?? "").toLowerCase();
  if (op === "=" || op === "eq") return a === b;
  if (op === "!=" || op === "ne") return a !== b;
  if (op === ">" || op === "gt") return comparable ? a > b : String(a).localeCompare(String(b)) > 0;
  if (op === ">=" || op === "gte") return comparable ? a >= b : String(a).localeCompare(String(b)) >= 0;
  if (op === "<" || op === "lt") return comparable ? a < b : String(a).localeCompare(String(b)) < 0;
  if (op === "<=" || op === "lte") return comparable ? a <= b : String(a).localeCompare(String(b)) <= 0;
  return true;
}

/**
 * Keep rows that satisfy at least one series' full rule group (OR across series, AND within series).
 * @param {unknown[]} rows
 * @param {unknown} chartLineFilters
 * @param {{ cap?: number }} [options]
 */
export function reduceRowsForChartLineFilters(rows, chartLineFilters, options = {}) {
  if (!Array.isArray(rows) || !rows.length) return rows;
  const filters = normalizeChartLineFilters(chartLineFilters);
  if (!filters.length) return rows;

  /** @type {Map<string, object[]>} */
  const bySeries = new Map();
  for (const rule of filters) {
    const key = String(rule.seriesKey || "");
    if (!bySeries.has(key)) bySeries.set(key, []);
    bySeries.get(key).push(rule);
  }

  const reduced = rows.filter((row) => {
    if (!row || typeof row !== "object") return false;
    for (const rules of bySeries.values()) {
      if (rules.every((rule) => chartFilterRuleMatches(row, rule))) return true;
    }
    return false;
  });

  const cap = Math.max(1, Number(options.cap) || PUBLISHED_BUNDLE_FILTER_ROW_CAP);
  return reduced.length > cap ? reduced.slice(0, cap) : reduced;
}

/**
 * When every chart line filter is `=` on the same column as the quant group column (e.g. ticker),
 * return distinct values so Athena can restrict the query (3 tickers × 8 checkpoints ≈ 24 rows).
 *
 * @param {unknown} chartLineFilters
 * @param {string} groupColumn
 * @returns {string[] | null}
 */
export function extractChartLineFilterGroupValues(chartLineFilters, groupColumn) {
  const group = String(groupColumn || "").trim();
  if (!group) return null;
  const filters = normalizeChartLineFilters(chartLineFilters);
  if (!filters.length) return null;

  const values = new Set();
  for (const rule of filters) {
    const col = deScopeChartColumnKey(rule.column);
    const op = String(rule.operator || "=").toLowerCase();
    if (col !== group) return null;
    if (op !== "=" && op !== "eq") return null;
    const v = rule.value;
    if (v == null || v === "") return null;
    values.add(String(v));
  }
  return values.size ? [...values] : null;
}
