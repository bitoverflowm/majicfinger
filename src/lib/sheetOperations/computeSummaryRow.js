import { compareConditionValues } from "../ifElseConditionValues.js";
import { parseNumberTypedCell } from "../coerceNumberTypedCells.js";

export const SUMMARY_METRIC_OPS = [
  "sum",
  "avg",
  "mean",
  "min",
  "max",
  "count",
  "count_distinct",
  "stdev",
  "median",
  "binary",
  "if_else",
];

export const SUMMARY_SCOPES = ["column", "columns", "row_series"];

export const SUMMARY_REF_PREFIX = "summary::";

/** @param {string} outputName */
export function summaryRefKey(outputName) {
  return `${SUMMARY_REF_PREFIX}${String(outputName || "").trim()}`;
}

/** @param {string} key */
export function isSummaryRefKey(key) {
  return String(key || "").startsWith(SUMMARY_REF_PREFIX);
}

/** @param {string} key */
export function summaryRefOutputName(key) {
  const s = String(key || "");
  if (!s.startsWith(SUMMARY_REF_PREFIX)) return "";
  return s.slice(SUMMARY_REF_PREFIX.length);
}

function newMetricId() {
  return `sm-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * @returns {object}
 */
export function createEmptySummaryMetric() {
  return {
    id: newMetricId(),
    outputName: "",
    op: "sum",
    scope: "column",
    columns: [],
    binary: null,
    where: null,
    ifElse: null,
  };
}

/**
 * @param {object | null | undefined} raw
 * @returns {{ destination: "this_view" | "new_sheet"; linkedSheetId: string | null; sourceSheetId: string | null; metrics: object[] }}
 */
export function normalizeSummaryConfig(raw) {
  const dest = raw?.destination === "new_sheet" ? "new_sheet" : "this_view";
  const metricsIn = Array.isArray(raw?.metrics) ? raw.metrics : [];
  const metrics = metricsIn.map((m, idx) => normalizeSummaryMetric(m, idx)).filter(Boolean);
  return {
    destination: dest,
    linkedSheetId: raw?.linkedSheetId != null ? String(raw.linkedSheetId) : null,
    sourceSheetId: raw?.sourceSheetId != null ? String(raw.sourceSheetId) : null,
    metrics,
  };
}

function normalizeSummaryMetric(raw, idx = 0) {
  if (!raw || typeof raw !== "object") return null;
  const op = SUMMARY_METRIC_OPS.includes(raw.op) ? raw.op : "sum";
  const scope = SUMMARY_SCOPES.includes(raw.scope) ? raw.scope : "column";
  const columns = Array.isArray(raw.columns)
    ? raw.columns.map((c) => String(c || "").trim()).filter(Boolean)
    : raw.sourceColumn
      ? [String(raw.sourceColumn).trim()].filter(Boolean)
      : [];
  return {
    id: String(raw.id || `sm-${idx}`),
    outputName: String(raw.outputName || "").trim(),
    op,
    scope,
    columns,
    binary: raw.binary && typeof raw.binary === "object" ? raw.binary : null,
    where: raw.where && typeof raw.where === "object" ? raw.where : null,
    ifElse: raw.ifElse && typeof raw.ifElse === "object" ? raw.ifElse : null,
  };
}

/**
 * @param {unknown} row
 * @param {object | null | undefined} where
 */
export function rowMatchesSummaryWhere(row, where) {
  if (!where || !where.enabled) return true;
  const clauses = Array.isArray(where.clauses) ? where.clauses : [];
  if (!clauses.length) return true;
  for (const clause of clauses) {
    const condition = clause?.condition || clause;
    if (!condition?.leftColumn) continue;
    const left = row?.[condition.leftColumn];
    const right =
      condition.rightKind === "column" ? row?.[condition.rightColumn] : condition.rightValue;
    if (!compareConditionValues(left, condition.operator, right)) return false;
  }
  return true;
}

function finiteNumsFromColumn(rows, col) {
  const out = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const n = parseNumberTypedCell(row[col]);
    if (n != null) out.push(n);
  }
  return out;
}

function populationStdev(values) {
  if (!values.length) return null;
  const n = values.length;
  const mean = values.reduce((s, x) => s + x, 0) / n;
  const variance = values.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  const sigma = Math.sqrt(variance);
  return Number.isFinite(sigma) ? sigma : null;
}

function medianOf(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

/**
 * @param {number[]} values
 * @param {string} op
 * @returns {number | null}
 */
export function aggregateNumericValues(values, op) {
  const kind = op === "mean" ? "avg" : op;
  if (kind === "count") return values.length;
  if (kind === "count_distinct") return new Set(values.map((v) => String(v))).size;
  if (!values.length) return null;
  if (kind === "sum") return values.reduce((s, x) => s + x, 0);
  if (kind === "avg") return values.reduce((s, x) => s + x, 0) / values.length;
  if (kind === "min") return Math.min(...values);
  if (kind === "max") return Math.max(...values);
  if (kind === "stdev") return populationStdev(values);
  if (kind === "median") return medianOf(values);
  return null;
}

function reduceRowAcrossColumns(row, columns, reduceOp) {
  const nums = [];
  for (const col of columns) {
    const n = parseNumberTypedCell(row?.[col]);
    if (n != null) nums.push(n);
  }
  if (!nums.length) return null;
  const kind = reduceOp === "mean" ? "avg" : reduceOp;
  if (kind === "sum" || kind === "avg" || kind === "min" || kind === "max" || kind === "stdev" || kind === "median") {
    return aggregateNumericValues(nums, kind === "avg" ? "avg" : kind);
  }
  // default reduce = sum across columns
  return nums.reduce((s, x) => s + x, 0);
}

function applyBinary(op, left, right) {
  if (left == null || right == null) return null;
  if (op === "add") return left + right;
  if (op === "subtract") return left - right;
  if (op === "multiply") return left * right;
  if (op === "divide") return right === 0 ? null : left / right;
  return null;
}

/**
 * Nested aggregate expression: { op, scope, columns } or { kind:"literal", value } or { kind:"binary", ... }
 * @param {object[]} rows
 * @param {object} expr
 */
function evaluateAggregateExpr(rows, expr) {
  if (!expr || typeof expr !== "object") return null;
  if (expr.kind === "literal") {
    const n = parseNumberTypedCell(expr.value);
    return n;
  }
  if (expr.kind === "binary" || expr.op === "binary" || (expr.binary && expr.left && expr.right)) {
    const bin = expr.binary || expr;
    const left = evaluateAggregateExpr(rows, bin.left);
    const right = evaluateAggregateExpr(rows, bin.right);
    return applyBinary(bin.op || "add", left, right);
  }
  const op = expr.op === "mean" ? "avg" : expr.op || "sum";
  const scope = expr.scope || "column";
  const columns = Array.isArray(expr.columns)
    ? expr.columns.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  if (op === "count" && scope === "column" && !columns.length) {
    return rows.length;
  }
  if (!columns.length) return null;

  if (scope === "columns" || scope === "row_series") {
    const perRow = [];
    for (const row of rows) {
      const v = reduceRowAcrossColumns(row, columns, op === "avg" || op === "mean" ? "sum" : "sum");
      // For series: sum selected cols per row, then aggregate those with the metric op
      if (v != null) perRow.push(v);
    }
    return aggregateNumericValues(perRow, op);
  }

  // column scope: first column only for simple aggs; count_distinct uses string values
  const col = columns[0];
  if (op === "count") {
    let n = 0;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const v = row[col];
      if (v != null && v !== "") n += 1;
    }
    return n;
  }
  if (op === "count_distinct") {
    const set = new Set();
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const v = row[col];
      if (v == null || v === "") continue;
      set.add(String(v));
    }
    return set.size;
  }
  return aggregateNumericValues(finiteNumsFromColumn(rows, col), op);
}

/**
 * @param {object[]} rows
 * @param {object} metric
 * @returns {number | null}
 */
export function evaluateSummaryMetric(rows, metric) {
  const m = normalizeSummaryMetric(metric);
  if (!m) return null;
  const filtered = (Array.isArray(rows) ? rows : []).filter((row) => rowMatchesSummaryWhere(row, m.where));

  if (m.op === "if_else" && m.ifElse) {
    const clauses = Array.isArray(m.ifElse.clauses) ? m.ifElse.clauses : [];
    for (const clause of clauses) {
      const cond = clause?.condition;
      if (!cond) continue;
      // Condition compares two aggregate exprs or literal vs aggregate
      const left = cond.leftExpr
        ? evaluateAggregateExpr(filtered, cond.leftExpr)
        : cond.leftColumn
          ? evaluateAggregateExpr(filtered, { op: "sum", scope: "column", columns: [cond.leftColumn] })
          : parseNumberTypedCell(cond.leftValue);
      const right =
        cond.rightKind === "expr" && cond.rightExpr
          ? evaluateAggregateExpr(filtered, cond.rightExpr)
          : cond.rightKind === "column" && cond.rightColumn
            ? evaluateAggregateExpr(filtered, { op: "sum", scope: "column", columns: [cond.rightColumn] })
            : parseNumberTypedCell(cond.rightValue);
      if (compareConditionValues(left, cond.operator || ">", right)) {
        return clause.thenExpr
          ? evaluateAggregateExpr(filtered, clause.thenExpr)
          : parseNumberTypedCell(clause.thenValue);
      }
    }
    if (m.ifElse.elseExpr) return evaluateAggregateExpr(filtered, m.ifElse.elseExpr);
    return parseNumberTypedCell(m.ifElse.elseValue);
  }

  if (m.op === "binary" && m.binary) {
    const left = evaluateAggregateExpr(filtered, m.binary.left || { op: "sum", scope: "column", columns: m.columns.slice(0, 1) });
    const right = evaluateAggregateExpr(
      filtered,
      m.binary.right || { op: "sum", scope: "column", columns: m.columns.slice(1, 2) },
    );
    return applyBinary(m.binary.op || "add", left, right);
  }

  return evaluateAggregateExpr(filtered, {
    op: m.op,
    scope: m.scope,
    columns: m.columns,
  });
}

/**
 * @param {object[]} rows
 * @param {object | null | undefined} summaryConfig
 * @returns {{ row: Record<string, number | null>; columns: string[]; errors: string[]; namedValues: Record<string, number | null> }}
 */
export function computeSummaryRow(rows, summaryConfig) {
  const config = normalizeSummaryConfig(summaryConfig);
  const row = {};
  const columns = [];
  const errors = [];
  const namedValues = {};

  for (const metric of config.metrics) {
    const name = metric.outputName || metric.columns[0] || metric.id;
    if (!name) {
      errors.push(`Metric ${metric.id} is missing an output name`);
      continue;
    }
    if (columns.includes(name)) {
      errors.push(`Duplicate summary output name: ${name}`);
      continue;
    }
    if (metric.op !== "binary" && metric.op !== "if_else" && metric.op !== "count" && !metric.columns.length) {
      errors.push(`Metric "${name}" needs at least one source column`);
      continue;
    }
    let value = null;
    try {
      value = evaluateSummaryMetric(rows, metric);
    } catch (err) {
      errors.push(`Metric "${name}" failed: ${err?.message || err}`);
      value = null;
    }
    columns.push(name);
    row[name] = value != null && Number.isFinite(value) ? value : value == null ? null : null;
    if (value != null && Number.isFinite(value)) {
      namedValues[name] = value;
      namedValues[summaryRefKey(name)] = value;
    } else {
      namedValues[name] = null;
      namedValues[summaryRefKey(name)] = null;
    }
  }

  return { row, columns, errors, namedValues };
}

/**
 * Human-readable preview for a metric.
 * @param {object} metric
 */
export function formatSummaryMetricPreview(metric) {
  const m = normalizeSummaryMetric(metric);
  if (!m) return "";
  const out = m.outputName || "metric";
  if (m.op === "binary" && m.binary) {
    const lop = m.binary.left?.op || "sum";
    const rop = m.binary.right?.op || "sum";
    const lc = (m.binary.left?.columns || m.columns.slice(0, 1)).join(",");
    const rc = (m.binary.right?.columns || m.columns.slice(1, 2)).join(",");
    const sym = { add: "+", subtract: "−", multiply: "×", divide: "÷" }[m.binary.op] || m.binary.op;
    return `${out} = ${String(lop).toUpperCase()}(${lc}) ${sym} ${String(rop).toUpperCase()}(${rc})`;
  }
  if (m.op === "if_else") return `${out} = IF/ELSE(...)`;
  const opLabel = m.op === "mean" ? "AVG" : String(m.op).toUpperCase();
  const cols = m.columns.join(", ") || "?";
  if (m.scope === "columns" || m.scope === "row_series") {
    return `${out} = ${opLabel}(rowΣ(${cols}))`;
  }
  return `${out} = ${opLabel}(${cols})`;
}
