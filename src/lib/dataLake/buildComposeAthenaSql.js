/**
 * Build a bounded Athena SELECT from a validated compose spec (no raw SQL from clients).
 */
import { isValidColumnIdentifier, resolveAthenaTableName } from "./athenaTableMap";
import {
  KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET,
  KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET_CENT,
} from "./lakeTableColumns";

/** @typedef {"day" | "week" | "month" | "quarter" | "year"} DateBucket */
/** @typedef {"dmy" | "ym" | "dm"} DateFormat */

const SAFE_ALIAS = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function escapeSqlString(s) {
  return String(s).replace(/'/g, "''");
}

/**
 * Predicate for CASE / IF branches (matches SUM if/else semantics).
 * @param {{ column: string; op: string; value: string | number }} w
 * @param {(c: string) => string} colRef
 */
function buildComposeWhenPredicateSql(w, colRef) {
  const c = String(w?.column || "").trim();
  const op = String(w?.op || "eq").toLowerCase().trim();
  const v = w?.value;
  if (!c || !isValidColumnIdentifier(c)) {
    const err = new Error("Invalid WHEN column");
    err.code = "BAD_REQUEST";
    throw err;
  }
  const colSql = colRef(c);
  const opSql = op === "gt" ? ">" : op === "lt" ? "<" : op === "eq" ? "=" : op === "neq" ? "!=" : null;
  if (!opSql) {
    const err = new Error(`Invalid WHEN operator: ${op}`);
    err.code = "BAD_REQUEST";
    throw err;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return `CAST(${colSql} AS DOUBLE) ${opSql} ${v}`;
  }
  const lit = String(v ?? "");
  const esc = lit.replace(/'/g, "''");
  return `LOWER(CAST(${colSql} AS VARCHAR)) ${opSql} LOWER('${esc}')`;
}

/**
 * @param {any} expr
 * @param {(c: string) => string} colRef
 */
function buildEquationExprSql(expr, colRef) {
  if (!expr || typeof expr !== "object") {
    const err = new Error("Invalid equation expression");
    err.code = "BAD_REQUEST";
    throw err;
  }
  switch (expr.type) {
    case "col": {
      const name = String(expr.name || "").trim();
      if (!isValidColumnIdentifier(name)) {
        const err = new Error("Invalid equation column");
        err.code = "BAD_REQUEST";
        throw err;
      }
      return `CAST(${colRef(name)} AS DOUBLE)`;
    }
    case "num": {
      const n = Number(expr.value);
      if (!Number.isFinite(n)) {
        const err = new Error("Invalid equation literal");
        err.code = "BAD_REQUEST";
        throw err;
      }
      return `CAST(${n} AS DOUBLE)`;
    }
    case "bin": {
      const op = String(expr.op || "").trim();
      if (!["*", "/", "+", "-"].includes(op)) {
        const err = new Error("Invalid equation operator");
        err.code = "BAD_REQUEST";
        throw err;
      }
      const left = buildEquationExprSql(expr.left, colRef);
      const right = buildEquationExprSql(expr.right, colRef);
      return `(${left} ${op} ${right})`;
    }
    case "grp": {
      const inner = buildEquationExprSql(expr.inner, colRef);
      return `(${inner})`;
    }
    case "case": {
      const branches = Array.isArray(expr.branches) ? expr.branches : [];
      if (!branches.length) {
        const err = new Error("CASE requires branches");
        err.code = "BAD_REQUEST";
        throw err;
      }
      const parts = branches.map((b) => {
        const whenSql = buildComposeWhenPredicateSql(b.when, colRef);
        const thenSql = buildEquationExprSql(b.then, colRef);
        return `WHEN ${whenSql} THEN ${thenSql}`;
      });
      const elseSql = buildEquationExprSql(expr.elseNode, colRef);
      return `(CASE ${parts.join(" ")} ELSE ${elseSql} END)`;
    }
    default: {
      const err = new Error("Unknown equation node");
      err.code = "BAD_REQUEST";
      throw err;
    }
  }
}

/** Virtual Kalshi markets column: leading token from event_ticker (Athena/Presto regexp_extract). */
function kalshiEventTickerCategorySql(eventTickerExpr) {
  return `(CASE
    WHEN ${eventTickerExpr} IS NULL
      OR CAST(${eventTickerExpr} AS VARCHAR) = '' THEN 'independent'
    WHEN regexp_extract(CAST(${eventTickerExpr} AS VARCHAR), '^([A-Z0-9]+)', 1) = '' THEN 'independent'
    ELSE regexp_extract(CAST(${eventTickerExpr} AS VARCHAR), '^([A-Z0-9]+)', 1)
  END)`;
}

const KALSHI_VIRTUAL_CATEGORY = "kalshi_event_ticker_category";

/** Max rows for compose queries that are a plain SELECT over a table (no SUM/COUNT, no join preset) — avoids huge result pulls. */
export const COMPOSE_UNCONSTRAINED_ROW_CAP = 100;

/**
 * True when compose has no SQL-level row collapsing (aggregates) and no join subquery.
 * Such queries have no WHERE in `buildComposeAthenaSelectSql` and can return one row per table row.
 */
export function composeUnboundedSelectShouldCapRows(compose) {
  if (!compose || typeof compose !== "object") return false;
  const joinPreset = compose.join && typeof compose.join === "object" ? String(compose.join.preset || "").trim() : "";
  if (joinPreset) return false;
  const joins = Array.isArray(compose.joins) ? compose.joins : [];
  if (joins.length) return false;
  const cteJoins = Array.isArray(compose.cteJoins) ? compose.cteJoins : [];
  if (cteJoins.length) return false;
  const rows = Array.isArray(compose.select) ? compose.select : [];
  const hasAgg = rows.some((r) => r && r.aggregate != null);
  return !hasAgg;
}

/**
 * Kalshi: trades restricted to finalized yes/no markets; trade price in cents from taker side;
 * equal-width buckets over [min(price), max(price)] (10 bins, same idea as pandas cut(..., bins=10)).
 */
function buildKalshiTradesResolvedMarketsJoinSubqueryDecile(tradesPhysical, marketsPhysical) {
  const t = String(tradesPhysical || "").trim();
  const m = String(marketsPhysical || "").trim();
  if (!/^[a-zA-Z0-9_]+$/.test(t) || !/^[a-zA-Z0-9_]+$/.test(m)) {
    const err = new Error("Invalid physical table name for Kalshi join");
    err.code = "BAD_REQUEST";
    throw err;
  }
  return `(
  WITH resolved_markets AS (
    SELECT "ticker" FROM "${m}"
    WHERE LOWER(CAST("status" AS VARCHAR)) = 'finalized'
      AND LOWER(CAST("result" AS VARCHAR)) IN ('yes', 'no')
  ),
  joined AS (
    SELECT
      CAST(t."count" AS DOUBLE) AS c_cnt,
      CASE WHEN LOWER(CAST(t."taker_side" AS VARCHAR)) = 'yes' THEN CAST(t."yes_price" AS DOUBLE) ELSE CAST(t."no_price" AS DOUBLE) END AS price_c,
      CASE WHEN LOWER(CAST(t."taker_side" AS VARCHAR)) = 'yes'
        THEN CAST(t."yes_price" AS DOUBLE) * CAST(t."count" AS DOUBLE) / 100.0
        ELSE CAST(t."no_price" AS DOUBLE) * CAST(t."count" AS DOUBLE) / 100.0 END AS taker_n,
      CASE WHEN LOWER(CAST(t."taker_side" AS VARCHAR)) = 'yes'
        THEN CAST(t."no_price" AS DOUBLE) * CAST(t."count" AS DOUBLE) / 100.0
        ELSE CAST(t."yes_price" AS DOUBLE) * CAST(t."count" AS DOUBLE) / 100.0 END AS maker_n
    FROM "${t}" t
    INNER JOIN resolved_markets m ON CAST(t."ticker" AS VARCHAR) = CAST(m."ticker" AS VARCHAR)
  ),
  bounds AS (
    SELECT MIN(price_c) AS lo, MAX(price_c) AS hi FROM joined
  ),
  numbered AS (
    SELECT
      j.c_cnt,
      j.taker_n,
      j.maker_n,
      CASE
        WHEN b.hi IS NULL OR b.lo IS NULL THEN NULL
        WHEN b.hi = b.lo THEN CAST(1 AS BIGINT)
        ELSE CAST(width_bucket(j.price_c, b.lo, b.hi, 10) AS BIGINT)
      END AS bin_idx
    FROM joined j
    CROSS JOIN bounds b
  )
  SELECT
    CAST(c_cnt AS BIGINT) AS "kalshi_resolved_contract_count",
    taker_n AS "kalshi_resolved_taker_notional",
    maker_n AS "kalshi_resolved_maker_notional",
    bin_idx AS "kalshi_resolved_centile_bin",
    concat(CAST(((bin_idx - 1) * 10 + 1) AS VARCHAR), concat('-', concat(CAST((bin_idx * 10) AS VARCHAR), ' pct'))) AS "kalshi_resolved_centile_label"
  FROM numbered
  WHERE bin_idx IS NOT NULL AND bin_idx >= 1 AND bin_idx <= 10
) `;
}

/** Same `joined` trade rows; bucket by fixed cent ranges (1–10c … 91–99c). Out-of-range prices excluded. */
function buildKalshiTradesResolvedMarketsJoinSubqueryCent(tradesPhysical, marketsPhysical) {
  const t = String(tradesPhysical || "").trim();
  const m = String(marketsPhysical || "").trim();
  if (!/^[a-zA-Z0-9_]+$/.test(t) || !/^[a-zA-Z0-9_]+$/.test(m)) {
    const err = new Error("Invalid physical table name for Kalshi join");
    err.code = "BAD_REQUEST";
    throw err;
  }
  return `(
  WITH resolved_markets AS (
    SELECT "ticker" FROM "${m}"
    WHERE LOWER(CAST("status" AS VARCHAR)) = 'finalized'
      AND LOWER(CAST("result" AS VARCHAR)) IN ('yes', 'no')
  ),
  joined AS (
    SELECT
      CAST(t."count" AS DOUBLE) AS c_cnt,
      CASE WHEN LOWER(CAST(t."taker_side" AS VARCHAR)) = 'yes' THEN CAST(t."yes_price" AS DOUBLE) ELSE CAST(t."no_price" AS DOUBLE) END AS price_c,
      CASE WHEN LOWER(CAST(t."taker_side" AS VARCHAR)) = 'yes'
        THEN CAST(t."yes_price" AS DOUBLE) * CAST(t."count" AS DOUBLE) / 100.0
        ELSE CAST(t."no_price" AS DOUBLE) * CAST(t."count" AS DOUBLE) / 100.0 END AS taker_n,
      CASE WHEN LOWER(CAST(t."taker_side" AS VARCHAR)) = 'yes'
        THEN CAST(t."no_price" AS DOUBLE) * CAST(t."count" AS DOUBLE) / 100.0
        ELSE CAST(t."yes_price" AS DOUBLE) * CAST(t."count" AS DOUBLE) / 100.0 END AS maker_n
    FROM "${t}" t
    INNER JOIN resolved_markets m ON CAST(t."ticker" AS VARCHAR) = CAST(m."ticker" AS VARCHAR)
  ),
  cent_labeled AS (
    SELECT
      j.c_cnt,
      j.taker_n,
      j.maker_n,
      CASE
        WHEN j.price_c >= 1 AND j.price_c <= 10 THEN CAST(1 AS BIGINT)
        WHEN j.price_c >= 11 AND j.price_c <= 20 THEN CAST(2 AS BIGINT)
        WHEN j.price_c >= 21 AND j.price_c <= 30 THEN CAST(3 AS BIGINT)
        WHEN j.price_c >= 31 AND j.price_c <= 40 THEN CAST(4 AS BIGINT)
        WHEN j.price_c >= 41 AND j.price_c <= 50 THEN CAST(5 AS BIGINT)
        WHEN j.price_c >= 51 AND j.price_c <= 60 THEN CAST(6 AS BIGINT)
        WHEN j.price_c >= 61 AND j.price_c <= 70 THEN CAST(7 AS BIGINT)
        WHEN j.price_c >= 71 AND j.price_c <= 80 THEN CAST(8 AS BIGINT)
        WHEN j.price_c >= 81 AND j.price_c <= 90 THEN CAST(9 AS BIGINT)
        WHEN j.price_c >= 91 AND j.price_c <= 99 THEN CAST(10 AS BIGINT)
        ELSE NULL
      END AS bin_idx,
      CASE
        WHEN j.price_c BETWEEN 1 AND 10 THEN '1-10c'
        WHEN j.price_c BETWEEN 11 AND 20 THEN '11-20c'
        WHEN j.price_c BETWEEN 21 AND 30 THEN '21-30c'
        WHEN j.price_c BETWEEN 31 AND 40 THEN '31-40c'
        WHEN j.price_c BETWEEN 41 AND 50 THEN '41-50c'
        WHEN j.price_c BETWEEN 51 AND 60 THEN '51-60c'
        WHEN j.price_c BETWEEN 61 AND 70 THEN '61-70c'
        WHEN j.price_c BETWEEN 71 AND 80 THEN '71-80c'
        WHEN j.price_c BETWEEN 81 AND 90 THEN '81-90c'
        WHEN j.price_c BETWEEN 91 AND 99 THEN '91-99c'
        ELSE NULL
      END AS bucket_lbl
    FROM joined j
  )
  SELECT
    CAST(c_cnt AS BIGINT) AS "kalshi_resolved_contract_count",
    taker_n AS "kalshi_resolved_taker_notional",
    maker_n AS "kalshi_resolved_maker_notional",
    bin_idx AS "kalshi_resolved_centile_bin",
    bucket_lbl AS "kalshi_resolved_centile_label"
  FROM cent_labeled
  WHERE bin_idx IS NOT NULL
) `;
}

const DATE_BUCKETS = new Set(["day", "week", "month", "quarter", "year"]);
const DATE_FORMATS = new Set(["dmy", "ym", "dm"]);
const SCALES = new Set(["none", "ten", "hundred", "thousand", "million", "billion"]);

function divisorForScale(scale) {
  if (scale === "ten") return 1e1;
  if (scale === "hundred") return 1e2;
  if (scale === "thousand") return 1e3;
  if (scale === "million") return 1e6;
  if (scale === "billion") return 1e9;
  return 1;
}

/**
 * Bigint epoch seconds/ms/us/ns → Presto timestamp.
 *
 * We infer the unit from magnitude to handle sources that store timestamps in
 * different epochs (e.g. milliseconds: 1617235200000, nanoseconds: 1748638362006115000).
 *
 * Athena/Presto `from_unixtime` expects seconds.
 * @param {string} colExpr SQL expression for a column (e.g. `t0."created_at"`)
 */
function epochBigintToTimestampExpr(colExpr) {
  // NOTE: We cast to DOUBLE because Athena doesn't consistently allow integer division on huge bigint epochs.
  // The thresholds are chosen by typical epoch ranges:
  // - seconds: ~1e9-1e10
  // - milliseconds: ~1e12-1e13
  // - microseconds: ~1e15-1e16
  // - nanoseconds: ~1e18-1e19
  return `from_unixtime(CASE
    WHEN ${colExpr} IS NULL THEN NULL
    WHEN ABS(CAST(${colExpr} AS DOUBLE)) >= 1e17 THEN CAST(${colExpr} AS DOUBLE) / 1e9
    WHEN ABS(CAST(${colExpr} AS DOUBLE)) >= 1e14 THEN CAST(${colExpr} AS DOUBLE) / 1e6
    WHEN ABS(CAST(${colExpr} AS DOUBLE)) >= 1e11 THEN CAST(${colExpr} AS DOUBLE) / 1e3
    ELSE CAST(${colExpr} AS DOUBLE)
  END)`;
}

/**
 * @param {string | null | undefined} hiveType
 */
function isNumericHiveType(hiveType) {
  const t = String(hiveType || "").toLowerCase();
  return t === "bigint" || t === "int" || t === "double";
}

/**
 * @param {object} opts
 * @param {string} opts.column
 * @param {string | null} opts.columnType
 * @param {boolean} opts.treatAsDate
 * @param {DateBucket | null} opts.dateBucket
 * @param {DateFormat | null} opts.dateFormat
 * @param {string | null} opts.aggregate
 * @param {string | null} opts.numberScale
 * @param {number | null} opts.decimals
 * @returns {{ innerSql: string; isAggregate: boolean }}
 */
function buildSelectExpression(opts) {
  const {
    column,
    columnType,
    treatAsDate,
    dateBucket,
    dateFormat,
    aggregate,
    numberScale,
    decimals,
    sumCase,
    equation,
    baseAlias = null,
  } = opts;

  const colRef = (c) => (baseAlias ? `${baseAlias}."${c}"` : `"${c}"`);

  if (column === KALSHI_VIRTUAL_CATEGORY) {
    if (aggregate && aggregate !== "count" && aggregate !== "count_distinct") {
      const err = new Error(`Cannot ${String(aggregate).toUpperCase()} the computed event-ticker category column`);
      err.code = "BAD_REQUEST";
      throw err;
    }
    if (aggregate === "count") {
      return { innerSql: `COUNT(${kalshiEventTickerCategorySql(colRef("event_ticker"))})`, isAggregate: true };
    }
    if (aggregate === "count_distinct") {
      return { innerSql: `COUNT(DISTINCT ${kalshiEventTickerCategorySql(colRef("event_ticker"))})`, isAggregate: true };
    }
    return { innerSql: kalshiEventTickerCategorySql(colRef("event_ticker")), isAggregate: false };
  }

  if (!isValidColumnIdentifier(column)) {
    const err = new Error(`Invalid column: ${column}`);
    err.code = "BAD_REQUEST";
    throw err;
  }

  const scale = numberScale && SCALES.has(numberScale) ? numberScale : "none";
  const div = divisorForScale(scale);
  const dec = decimals != null && Number.isFinite(Number(decimals)) ? Math.min(8, Math.max(0, Math.floor(Number(decimals)))) : null;

  const wrapRound = (sql) => {
    if (dec == null) return sql;
    return `ROUND(${sql}, ${dec})`;
  };

  const applyScale = (sql) => {
    if (div === 1) return sql;
    return `(${sql}) / ${div}.0`;
  };

  const numeric = isNumericHiveType(columnType);

  // Aggregates
  if (aggregate === "sum") {
    if (equation && typeof equation === "object" && equation.enabled && equation.root) {
      const inner = buildEquationExprSql(equation.root, colRef);
      const base = `SUM(${inner})`;
      return { innerSql: wrapRound(applyScale(base)), isAggregate: true };
    }

    if (sumCase && typeof sumCase === "object" && sumCase.enabled) {
      const branchesIn = Array.isArray(sumCase.branches) ? sumCase.branches : [];
      const elseCol = String(sumCase.elseColumn || "").trim();
      if (branchesIn.length === 0) {
        const err = new Error("SUM if/else requires at least one IF branch");
        err.code = "BAD_REQUEST";
        throw err;
      }
      if (!elseCol || !isValidColumnIdentifier(elseCol)) {
        const err = new Error("SUM if/else requires an ELSE column");
        err.code = "BAD_REQUEST";
        throw err;
      }

      const condToSql = (w) => {
        const c = String(w?.column || "").trim();
        const op = String(w?.op || "").toLowerCase().trim();
        const v = w?.value;
        if (!c || !isValidColumnIdentifier(c)) {
          const err = new Error("Invalid IF column");
          err.code = "BAD_REQUEST";
          throw err;
        }
        // We keep it simple: string comparisons are case-insensitive, numeric comparisons are numeric.
        const colSql = colRef(c);
        const opSql = op === "gt" ? ">" : op === "lt" ? "<" : op === "eq" ? "=" : op === "neq" ? "!=" : null;
        if (!opSql) {
          const err = new Error(`Invalid IF operator: ${op}`);
          err.code = "BAD_REQUEST";
          throw err;
        }
        if (typeof v === "number" && Number.isFinite(v)) {
          return `CAST(${colSql} AS DOUBLE) ${opSql} ${v}`;
        }
        const lit = String(v ?? "");
        const esc = lit.replace(/'/g, "''");
        return `LOWER(CAST(${colSql} AS VARCHAR)) ${opSql} LOWER('${esc}')`;
      };

      const caseParts = branchesIn.map((b) => {
        const whenSql = condToSql(b?.when);
        const thenCol = String(b?.thenColumn || "").trim();
        if (!thenCol || !isValidColumnIdentifier(thenCol)) {
          const err = new Error("Invalid THEN column");
          err.code = "BAD_REQUEST";
          throw err;
        }
        return `WHEN ${whenSql} THEN CAST(${colRef(thenCol)} AS DOUBLE)`;
      });

      const caseSql = `CASE ${caseParts.join(" ")} ELSE CAST(${colRef(elseCol)} AS DOUBLE) END`;
      // SUM(baseColumn * CASE ...)
      const base = `SUM(CAST(${colRef(column)} AS DOUBLE) * (${caseSql}))`;
      return { innerSql: wrapRound(applyScale(base)), isAggregate: true };
    }

    const base = `SUM(CAST(${colRef(column)} AS DOUBLE))`;
    return { innerSql: wrapRound(applyScale(base)), isAggregate: true };
  }
  if (aggregate === "avg") {
    const base = `AVG(CAST(${colRef(column)} AS DOUBLE))`;
    return { innerSql: wrapRound(applyScale(base)), isAggregate: true };
  }
  if (aggregate === "min") {
    const base = `MIN(CAST(${colRef(column)} AS DOUBLE))`;
    return { innerSql: wrapRound(applyScale(base)), isAggregate: true };
  }
  if (aggregate === "max") {
    const base = `MAX(CAST(${colRef(column)} AS DOUBLE))`;
    return { innerSql: wrapRound(applyScale(base)), isAggregate: true };
  }
  if (aggregate === "median") {
    const base = `approx_percentile(CAST(${colRef(column)} AS DOUBLE), 0.5)`;
    return { innerSql: wrapRound(applyScale(base)), isAggregate: true };
  }
  if (aggregate === "stddev") {
    const base = `stddev_samp(CAST(${colRef(column)} AS DOUBLE))`;
    return { innerSql: wrapRound(applyScale(base)), isAggregate: true };
  }
  if (aggregate === "variance") {
    const base = `variance_samp(CAST(${colRef(column)} AS DOUBLE))`;
    if (div === 1) return { innerSql: wrapRound(base), isAggregate: true };
    // If we scale values by 1/div, variance scales by 1/(div^2).
    return { innerSql: wrapRound(`(${base}) / (${div}.0) / (${div}.0)`), isAggregate: true };
  }
  if (aggregate === "count") {
    const base = `COUNT(${colRef(column)})`;
    return { innerSql: base, isAggregate: true };
  }
  if (aggregate === "count_distinct") {
    const base = `COUNT(DISTINCT ${colRef(column)})`;
    return { innerSql: base, isAggregate: true };
  }

  // Dimension: date bucket / format (epoch columns only; validated upstream)
  if (treatAsDate && numeric && dateBucket && DATE_BUCKETS.has(dateBucket)) {
    const ts = epochBigintToTimestampExpr(colRef(column));
    const bucketTs = `date_trunc('${dateBucket}', ${ts})`;

    // Important: return a *string* for date buckets so the sheet shows labels like
    // "Q1 '24" instead of epoch millis (which happens if we return timestamps).
    let inner;
    if (dateBucket === "quarter") {
      inner = `concat('Q', CAST(extract(quarter FROM ${bucketTs}) AS varchar), ' ''', date_format(${bucketTs}, '%y'))`;
    } else if (dateBucket === "month") {
      inner = `date_format(${bucketTs}, '%Y-%m')`;
    } else if (dateBucket === "year") {
      inner = `date_format(${bucketTs}, '%Y')`;
    } else {
      // day/week: show bucket start date in ISO form
      inner = `date_format(${bucketTs}, '%Y-%m-%d')`;
    }

    return { innerSql: wrapRound(inner), isAggregate: false };
  }
  if (treatAsDate && numeric && dateFormat && DATE_FORMATS.has(dateFormat)) {
    const ts = epochBigintToTimestampExpr(colRef(column));
    const fmt = dateFormat === "dmy" ? "%d-%m-%Y" : dateFormat === "ym" ? "%Y-%m" : "%d-%m";
    const inner = `date_format(${ts}, '${fmt}')`;
    return { innerSql: inner, isAggregate: false };
  }

  // Dimension: pass-through strings / booleans
  if (!numeric) {
    return { innerSql: colRef(column), isAggregate: false };
  }

  const numBase = `CAST(${colRef(column)} AS DOUBLE)`;
  return { innerSql: wrapRound(applyScale(numBase)), isAggregate: false };
}

/**
 * Same expression as SELECT but without alias (for GROUP BY).
 */
function buildGroupExpression(opts) {
  const { innerSql } = buildSelectExpression(opts);
  return innerSql;
}

/**
 * @param {{
 *   physicalTableName: string;
 *   limit?: number | null;
 *   compose: {
 *     select: Array<{
 *       column: string;
 *       alias: string;
 *       aggregate: null | "sum" | "count";
 *       dateBucket: DateBucket | null;
 *       dateFormat: DateFormat | null;
 *       numberScale: "none" | "thousand" | "million" | "billion" | null;
 *       decimals: number | null;
 *       treatAsDate: boolean;
 *       columnType: string | null;
 *     }>;
 *     groupByAliases: string[];
 *     orderBy: Array<{ alias: string; direction: "asc" | "desc" }>;
 *   };
 *   join?: { preset: string } | null | undefined;
 * }} params
 * @param {{ physicalTableName: string; limit?: number | null; compose: object; lake?: string | null }} params
 * @returns {string}
 */
export function buildComposeAthenaSelectSql({ physicalTableName, limit, compose, lake = null, whereSql = "" }) {
  const safeTable = String(physicalTableName).trim();
  if (!/^[a-zA-Z0-9_]+$/.test(safeTable)) {
    const err = new Error("Invalid table name");
    err.code = "BAD_REQUEST";
    throw err;
  }

  const joinPreset = compose?.join && typeof compose.join === "object" ? String(compose.join.preset || "").trim() : "";
  let fromClause;
  let baseAlias = "t0";
  if (
    joinPreset === KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET ||
    joinPreset === KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET_CENT
  ) {
    if (String(lake || "").toLowerCase() !== "kalshi") {
      const err = new Error("Kalshi trades join presets are only valid for lake kalshi");
      err.code = "BAD_REQUEST";
      throw err;
    }
    const marketsPhysical = resolveAthenaTableName("kalshi", "markets");
    if (!marketsPhysical) {
      const err = new Error("Kalshi markets table is not configured");
      err.code = "BAD_REQUEST";
      throw err;
    }
    const nested =
      joinPreset === KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET_CENT
        ? buildKalshiTradesResolvedMarketsJoinSubqueryCent(safeTable, marketsPhysical)
        : buildKalshiTradesResolvedMarketsJoinSubqueryDecile(safeTable, marketsPhysical);
    fromClause = `FROM ${nested} AS kalshi_trades_joined`;
    baseAlias = "kalshi_trades_joined";
  } else if (joinPreset) {
    const err = new Error(`Unknown compose.join.preset: ${joinPreset}`);
    err.code = "BAD_REQUEST";
    throw err;
  } else {
    const joins = Array.isArray(compose?.joins) ? compose.joins : [];
    const cteJoins = Array.isArray(compose?.cteJoins) ? compose.cteJoins : [];
    fromClause = `FROM "${safeTable}" ${baseAlias}`;

    if (joins.length > 0 || cteJoins.length > 0) {
      const joinSqlParts = [];

      for (let i = 0; i < cteJoins.length; i++) {
        const j = cteJoins[i];
        const jtRaw = String(j?.joinType || "inner").toLowerCase().trim();
        const jt = jtRaw === "left" ? "LEFT" : "INNER";
        const cteName = String(j?.cteName || "").trim();
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(cteName)) {
          const err = new Error("Invalid join CTE name");
          err.code = "BAD_REQUEST";
          throw err;
        }
        const alias = `c${i + 1}`;
        const leftCol = String(j?.on?.leftColumn || "").trim();
        const rightCol = String(j?.on?.rightColumn || "").trim();
        if (!isValidColumnIdentifier(leftCol) || !isValidColumnIdentifier(rightCol)) {
          const err = new Error("Invalid join column identifier");
          err.code = "BAD_REQUEST";
          throw err;
        }
        joinSqlParts.push(
          `${jt} JOIN ${cteName} ${alias} ON CAST(${baseAlias}."${leftCol}" AS VARCHAR) = CAST(${alias}."${rightCol}" AS VARCHAR)`
        );
      }

      for (let i = 0; i < joins.length; i++) {
        const j = joins[i];
        const jtRaw = String(j?.joinType || "inner").toLowerCase().trim();
        const jt = jtRaw === "left" ? "LEFT" : "INNER";
        const phys = String(j?.physical || "").trim();
        if (!/^[a-zA-Z0-9_]+$/.test(phys)) {
          const err = new Error("Invalid join physical table name");
          err.code = "BAD_REQUEST";
          throw err;
        }
        const alias = `j${i + 1}`;
        const leftCol = String(j?.on?.leftColumn || "").trim();
        const rightCol = String(j?.on?.rightColumn || "").trim();
        if (!isValidColumnIdentifier(leftCol) || !isValidColumnIdentifier(rightCol)) {
          const err = new Error("Invalid join column identifier");
          err.code = "BAD_REQUEST";
          throw err;
        }
        // Cast to VARCHAR for a forgiving equijoin across mixed Glue types.
        joinSqlParts.push(
          `${jt} JOIN "${phys}" ${alias} ON CAST(${baseAlias}."${leftCol}" AS VARCHAR) = CAST(${alias}."${rightCol}" AS VARCHAR)`
        );
      }

      fromClause = `${fromClause} ${joinSqlParts.join(" ")}`;
    }
  }

  const rows = compose?.select;
  if (!Array.isArray(rows) || rows.length === 0) {
    const err = new Error("compose.select must be a non-empty array");
    err.code = "BAD_REQUEST";
    throw err;
  }

  /** @type {Map<string, { groupExpr: string; isAggregate: boolean }>} */
  const byAlias = new Map();

  const selectParts = [];
  for (const row of rows) {
    const alias = String(row.alias || "").trim();
    if (!SAFE_ALIAS.test(alias)) {
      const err = new Error(`Invalid alias: ${alias}`);
      err.code = "BAD_REQUEST";
      throw err;
    }
    if (byAlias.has(alias)) {
      const err = new Error(`Duplicate SELECT alias: ${alias}`);
      err.code = "BAD_REQUEST";
      throw err;
    }

    const innerSql = buildSelectExpression({
      column: row.column,
      columnType: row.columnType || null,
      treatAsDate: row.treatAsDate === true,
      dateBucket: row.dateBucket || null,
      dateFormat: row.dateFormat || null,
      aggregate: row.aggregate || null,
      numberScale: row.numberScale || null,
      decimals: row.decimals != null ? Number(row.decimals) : null,
      sumCase: row.sumCase || null,
      equation: row.equation || null,
      baseAlias,
    }).innerSql;

    const isAggregate = row.aggregate != null;
    const groupExpr = buildGroupExpression({
      column: row.column,
      columnType: row.columnType || null,
      treatAsDate: row.treatAsDate === true,
      dateBucket: row.dateBucket || null,
      dateFormat: row.dateFormat || null,
      aggregate: null,
      numberScale: row.numberScale || null,
      decimals: row.decimals != null ? Number(row.decimals) : null,
      baseAlias,
    });

    byAlias.set(alias, { groupExpr, isAggregate });
    selectParts.push(`${innerSql} AS "${alias}"`);
  }

  const hasAgg = [...byAlias.values()].some((v) => v.isAggregate);
  const dimAliases = [...byAlias.entries()].filter(([, v]) => !v.isAggregate).map(([a]) => a);

  // With SUM/COUNT, GROUP BY must list every dimension (same order as SELECT) so values collapse (e.g. all Q1 2024 trades → one row).
  const gb = hasAgg
    ? dimAliases
    : Array.isArray(compose.groupByAliases)
      ? compose.groupByAliases.map((a) => String(a).trim()).filter(Boolean)
      : [];

  for (const a of gb) {
    if (!SAFE_ALIAS.test(a)) {
      const err = new Error(`Invalid GROUP BY alias: ${a}`);
      err.code = "BAD_REQUEST";
      throw err;
    }
    const meta = byAlias.get(a);
    if (!meta || meta.isAggregate) {
      const err = new Error(`GROUP BY must reference a non-aggregated SELECT alias: ${a}`);
      err.code = "BAD_REQUEST";
      throw err;
    }
  }

  let groupSql = "";
  if (gb.length > 0) {
    const parts = gb.map((a) => byAlias.get(a).groupExpr);
    groupSql = ` GROUP BY ${parts.join(", ")}`;
  }

  const ob = Array.isArray(compose.orderBy) ? compose.orderBy : [];
  let orderSql = "";
  if (ob.length > 0) {
    const obParts = [];
    for (const o of ob) {
      const a = String(o.alias || "").trim();
      const dir = String(o.direction || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
      if (!SAFE_ALIAS.test(a) || !byAlias.has(a)) {
        const err = new Error(`ORDER BY must reference a SELECT alias: ${a}`);
        err.code = "BAD_REQUEST";
        throw err;
      }
      obParts.push(`"${a}" ${dir}`);
    }
    orderSql = ` ORDER BY ${obParts.join(", ")}`;
  }

  const havingAnd = Array.isArray(compose?.having?.and) ? compose.having.and : [];
  let havingSql = "";
  if (havingAnd.length > 0) {
    if (!groupSql) {
      const err = new Error("HAVING requires GROUP BY in compose queries");
      err.code = "BAD_REQUEST";
      throw err;
    }
    const parts = havingAnd.map((p) => {
      const alias = String(p.alias || "").trim();
      if (!SAFE_ALIAS.test(alias)) {
        const err = new Error(`Invalid HAVING alias: ${alias}`);
        err.code = "BAD_REQUEST";
        throw err;
      }
      const op = String(p.op || "").trim();
      const opSql = op === "eq" ? "=" : op === "neq" ? "!=" : op === "gt" ? ">" : op === "lt" ? "<" : null;
      if (!opSql) {
        const err = new Error(`Invalid HAVING operator: ${op}`);
        err.code = "BAD_REQUEST";
        throw err;
      }
      const v = Number(p.value);
      if (!Number.isFinite(v)) {
        const err = new Error("HAVING value must be a finite number");
        err.code = "BAD_REQUEST";
        throw err;
      }
      return `"${alias}" ${opSql} ${v}`;
    });
    havingSql = ` HAVING ${parts.join(" AND ")}`;
  }

  const lim =
    limit != null && Number.isFinite(Number(limit))
      ? Math.min(1000, Math.max(1, Math.floor(Number(limit))))
      : null;
  const limitSql = lim != null ? ` LIMIT ${lim}` : "";
  const w = typeof whereSql === "string" ? whereSql : "";
  return `SELECT ${selectParts.join(", ")} ${fromClause}${w}${groupSql}${havingSql}${orderSql}${limitSql}`;
}
