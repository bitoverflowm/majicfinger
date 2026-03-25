/**
 * Build a bounded Athena SELECT from a validated compose spec (no raw SQL from clients).
 */
import { isValidColumnIdentifier } from "./athenaTableMap";

/** @typedef {"day" | "week" | "month" | "quarter" | "year"} DateBucket */
/** @typedef {"dmy" | "ym" | "dm"} DateFormat */

const SAFE_ALIAS = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const DATE_BUCKETS = new Set(["day", "week", "month", "quarter", "year"]);
const DATE_FORMATS = new Set(["dmy", "ym", "dm"]);
const SCALES = new Set(["none", "thousand", "million", "billion"]);

function divisorForScale(scale) {
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
 * @param {string} col
 */
function epochBigintToTimestampExpr(col) {
  // NOTE: We cast to DOUBLE because Athena doesn't consistently allow integer division on huge bigint epochs.
  // The thresholds are chosen by typical epoch ranges:
  // - seconds: ~1e9-1e10
  // - milliseconds: ~1e12-1e13
  // - microseconds: ~1e15-1e16
  // - nanoseconds: ~1e18-1e19
  return `from_unixtime(CASE
    WHEN "${col}" IS NULL THEN NULL
    WHEN ABS(CAST("${col}" AS DOUBLE)) >= 1e17 THEN CAST("${col}" AS DOUBLE) / 1e9
    WHEN ABS(CAST("${col}" AS DOUBLE)) >= 1e14 THEN CAST("${col}" AS DOUBLE) / 1e6
    WHEN ABS(CAST("${col}" AS DOUBLE)) >= 1e11 THEN CAST("${col}" AS DOUBLE) / 1e3
    ELSE CAST("${col}" AS DOUBLE)
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
  const { column, columnType, treatAsDate, dateBucket, dateFormat, aggregate, numberScale, decimals } = opts;

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
    const base = `SUM(CAST("${column}" AS DOUBLE))`;
    return { innerSql: wrapRound(applyScale(base)), isAggregate: true };
  }
  if (aggregate === "count") {
    const base = `COUNT("${column}")`;
    return { innerSql: base, isAggregate: true };
  }

  // Dimension: date bucket / format (epoch columns only; validated upstream)
  if (treatAsDate && numeric && dateBucket && DATE_BUCKETS.has(dateBucket)) {
    const ts = epochBigintToTimestampExpr(column);
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
    const ts = epochBigintToTimestampExpr(column);
    const fmt = dateFormat === "dmy" ? "%d-%m-%Y" : dateFormat === "ym" ? "%Y-%m" : "%d-%m";
    const inner = `date_format(${ts}, '${fmt}')`;
    return { innerSql: inner, isAggregate: false };
  }

  // Dimension: pass-through strings / booleans
  if (!numeric) {
    return { innerSql: `"${column}"`, isAggregate: false };
  }

  const numBase = `CAST("${column}" AS DOUBLE)`;
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
 * }} params
 * @returns {string}
 */
export function buildComposeAthenaSelectSql({ physicalTableName, limit, compose }) {
  const safeTable = String(physicalTableName).trim();
  if (!/^[a-zA-Z0-9_]+$/.test(safeTable)) {
    const err = new Error("Invalid table name");
    err.code = "BAD_REQUEST";
    throw err;
  }
  const sqlTable = `"${safeTable}"`;

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
    }).innerSql;

    const isAggregate = !!(row.aggregate === "sum" || row.aggregate === "count");
    const groupExpr = buildGroupExpression({
      column: row.column,
      columnType: row.columnType || null,
      treatAsDate: row.treatAsDate === true,
      dateBucket: row.dateBucket || null,
      dateFormat: row.dateFormat || null,
      aggregate: null,
      numberScale: row.numberScale || null,
      decimals: row.decimals != null ? Number(row.decimals) : null,
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

  const lim =
    limit != null && Number.isFinite(Number(limit))
      ? Math.min(1000, Math.max(1, Math.floor(Number(limit))))
      : null;
  const limitSql = lim != null ? ` LIMIT ${lim}` : "";
  return `SELECT ${selectParts.join(", ")} FROM ${sqlTable}${groupSql}${orderSql}${limitSql}`;
}
