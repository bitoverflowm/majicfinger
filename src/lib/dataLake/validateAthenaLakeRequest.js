/**
 * Shared validation for Athena lake POST bodies (start + sync query).
 */
import { resolveAthenaTableName } from "./athenaTableMap";
import {
  allowedColumnsForLakeTable,
  columnHiveTypeForLakeTable,
  isDateLikeColumnName,
  isNumericHiveType,
  KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET,
  KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET_CENT,
  KALSHI_TRADES_RESOLVED_MARKETS_JOIN_META,
  kalshiResolvedMarketsJoinColumnMeta,
} from "./lakeTableColumns";

const KALSHI_TRADES_JOIN_PRESETS = new Set([
  KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET,
  KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET_CENT,
]);
import {
  buildComposeAthenaSelectSql,
  composeUnboundedSelectShouldCapRows,
  COMPOSE_UNCONSTRAINED_ROW_CAP,
} from "./buildComposeAthenaSql";

export class AthenaLakeRequestError extends Error {
  /**
   * @param {string} message
   * @param {{ statusCode?: number; code?: string }} opts
   */
  constructor(message, { statusCode = 400, code = "BAD_REQUEST" } = {}) {
    super(message);
    this.name = "AthenaLakeRequestError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function databaseForLake(lake) {
  const dbPoly = String(process.env.DATA_LAKE_ATHENA_DATABASE || "").trim();
  const dbKalshi = String(process.env.DATA_LAKE_ATHENA_DATABASE_KALSHI || "").trim();
  return lake === "kalshi" && dbKalshi ? dbKalshi : dbPoly;
}

/**
 * @param {Record<string, unknown> | null | undefined} body
 * @returns {{
 *   lake: string;
 *   table: string;
 *   limit: number;
 *   queryType: "select" | "count" | "sum" | "compose";
 *   columns: string[] | null;
 *   countAlias: string | null;
 *   countDistinctColumn: string | null;
 *   sumColumn: string | null;
 *   sumAlias: string | null;
 *   physical: string;
 *   database: string
 * }}
 */
export function validateAthenaLakeQueryBody(body) {
  if (!body || typeof body !== "object") {
    throw new AthenaLakeRequestError("Invalid JSON body");
  }

  const lake = String(body.lake || "").toLowerCase().trim();
  const table = String(body.table || "").toLowerCase().trim();
  const limit = body.limit != null ? Number(body.limit) : 100;
  const queryTypeRaw = String(body.queryType || "select").toLowerCase().trim();
  const queryType =
    queryTypeRaw === "count"
      ? "count"
      : queryTypeRaw === "sum"
        ? "sum"
        : queryTypeRaw === "compose"
          ? "compose"
          : "select";
  const caseSensitive = body.caseSensitive === true;
  const columns = Array.isArray(body.columns)
    ? body.columns.map((c) => String(c).trim()).filter(Boolean)
    : null;
  const countAlias = queryType === "count" ? String(body.countAlias || "count").trim() : null;
  const countDistinctColumn = queryType === "count" ? String(body.countDistinctColumn || "").trim() : null;
  const sumColumn = queryType === "sum" ? String(body.sumColumn || "").trim() : null;
  const sumAlias = queryType === "sum" ? String(body.sumAlias || "sum").trim() : null;
  /** @type {object | null} */
  let validatedCompose = null;

  const filtersInput =
    (queryType === "count" || queryType === "sum") && body.filters && typeof body.filters === "object"
      ? body.filters
      : null;
  let validatedFilters = null;

  if (lake !== "polymarket" && lake !== "kalshi") {
    throw new AthenaLakeRequestError('Invalid lake (use "polymarket" or "kalshi")');
  }
  if (!["markets", "trades", "blocks"].includes(table)) {
    throw new AthenaLakeRequestError('Invalid table (use "markets", "trades", or "blocks")');
  }

  // For aggregate queries we don't validate "columns" identifiers.
  if (queryType === "count" || queryType === "sum") {
    if (queryType === "count" && !countAlias) {
      throw new AthenaLakeRequestError("Missing countAlias", { statusCode: 400, code: "BAD_REQUEST" });
    }
    // Reuse safe identifier rules from athenaTableMap via isValidColumnIdentifier in runAthenaSelect.
    // We'll still block obviously bad aliases here.
    if (queryType === "count" && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(countAlias)) {
      throw new AthenaLakeRequestError("Invalid countAlias", { statusCode: 400, code: "BAD_REQUEST" });
    }
    if (queryType === "count" && countDistinctColumn && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(countDistinctColumn)) {
      throw new AthenaLakeRequestError("Invalid countDistinctColumn", { statusCode: 400, code: "BAD_REQUEST" });
    }

    if (queryType === "sum") {
      if (!sumColumn || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sumColumn)) {
        throw new AthenaLakeRequestError("Invalid sumColumn", { statusCode: 400, code: "BAD_REQUEST" });
      }
      if (!sumAlias || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sumAlias)) {
        throw new AthenaLakeRequestError("Invalid sumAlias", { statusCode: 400, code: "BAD_REQUEST" });
      }
    }

    /** @type {{ and: any[]; or: any[]; mergeAnd?: any[]; mergeOrBranch?: any[] } | null} */
    const normalizedFilters =
      filtersInput == null
        ? null
        : {
            and: Array.isArray(filtersInput.and) ? filtersInput.and : [],
            or: Array.isArray(filtersInput.or) ? filtersInput.or : [],
            mergeAnd: Array.isArray(filtersInput.mergeAnd) ? filtersInput.mergeAnd : [],
            mergeOrBranch: Array.isArray(filtersInput.mergeOrBranch) ? filtersInput.mergeOrBranch : [],
          };

    const safeIdent = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    /**
     * @param {any} p
     * @returns {{ column: string; kind: "date" | "string" | "number"; op: string; value: any }}
     */
    const normalizePredicate = (p) => {
      if (!p || typeof p !== "object") {
        throw new AthenaLakeRequestError("Invalid filter predicate", { statusCode: 400, code: "BAD_REQUEST" });
      }
      const column = String(p.column || "").trim();
      const kindRaw = String(p.kind || "").toLowerCase().trim();
      const op = String(p.op || "").toLowerCase().trim();
      const kind = kindRaw === "date" ? "date" : kindRaw === "string" ? "string" : "number";

      if (!safeIdent.test(column)) {
        throw new AthenaLakeRequestError(`Invalid filter column: ${column}`, { statusCode: 400, code: "BAD_REQUEST" });
      }

      if (kind === "date") {
        if (!["gt", "lt", "eq", "neq"].includes(op)) {
          throw new AthenaLakeRequestError("Invalid date filter operator", { statusCode: 400, code: "BAD_REQUEST" });
        }
      } else if (kind === "number") {
        if (!["gt", "lt", "eq", "neq"].includes(op)) {
          throw new AthenaLakeRequestError("Invalid number filter operator", { statusCode: 400, code: "BAD_REQUEST" });
        }
      } else if (kind === "string") {
        if (!["contains", "not_contains"].includes(op)) {
          throw new AthenaLakeRequestError("Invalid string filter operator", { statusCode: 400, code: "BAD_REQUEST" });
        }
      }

      const value =
        kind === "string" ? String(p.value ?? "") : Number.isFinite(Number(p.value)) ? Number(p.value) : NaN;

      if (kind !== "string") {
        if (!Number.isFinite(value)) {
          throw new AthenaLakeRequestError("Invalid numeric/date filter value", { statusCode: 400, code: "BAD_REQUEST" });
        }
      }
      if (kind === "string") {
        if (String(value).trim().length === 0) {
          throw new AthenaLakeRequestError("Invalid string filter value", { statusCode: 400, code: "BAD_REQUEST" });
        }
      }

      return { column, kind, op, value };
    };

    const normalizedValidatedFilters =
      normalizedFilters == null
        ? null
        : (() => {
            const mergeAnd = normalizedFilters.mergeAnd.map(normalizePredicate);
            const mergeOrBranch = normalizedFilters.mergeOrBranch.map(normalizePredicate);
            const base = {
              and: normalizedFilters.and.map(normalizePredicate),
              or: normalizedFilters.or.map(normalizePredicate),
            };
            return {
              ...base,
              ...(mergeAnd.length ? { mergeAnd } : {}),
              ...(mergeOrBranch.length ? { mergeOrBranch } : {}),
            };
          })();

    // Store on closure so return statement can include it.
    validatedFilters = normalizedValidatedFilters;
  }

  const physical = resolveAthenaTableName(lake, table);
  if (!physical) {
    throw new AthenaLakeRequestError(
      lake === "kalshi" && table === "blocks"
        ? "Kalshi blocks table not configured (set DATA_LAKE_ATHENA_TABLE_KALSHI_BLOCKS)"
        : "Unknown table mapping",
      { statusCode: 404, code: "NOT_FOUND" },
    );
  }

  const database = databaseForLake(lake);
  if (!database) {
    throw new AthenaLakeRequestError(
      "Server missing DATA_LAKE_ATHENA_DATABASE (set DATA_LAKE_ATHENA_DATABASE_KALSHI too if Kalshi lives in another Glue database)",
      { statusCode: 503, code: "CONFIG" },
    );
  }

  const limClamped = Math.min(1000, Math.max(1, Math.floor(Number(limit) || 100)));

  if (queryType === "compose") {
    const raw = body.compose;
    if (!raw || typeof raw !== "object") {
      throw new AthenaLakeRequestError("compose query requires a compose object", { statusCode: 400, code: "BAD_REQUEST" });
    }
    /** @type {string | null} */
    let joinPresetValidated = null;
    if (raw.join != null) {
      if (typeof raw.join !== "object" || Array.isArray(raw.join)) {
        throw new AthenaLakeRequestError("compose.join must be an object", { statusCode: 400, code: "BAD_REQUEST" });
      }
      const jp = String(raw.join.preset || "").trim();
      if (!jp) {
        throw new AthenaLakeRequestError("compose.join.preset is required when compose.join is set", {
          statusCode: 400,
          code: "BAD_REQUEST",
        });
      }
      if (!KALSHI_TRADES_JOIN_PRESETS.has(jp)) {
        throw new AthenaLakeRequestError(`Unknown compose.join.preset: ${jp}`, { statusCode: 400, code: "BAD_REQUEST" });
      }
      if (lake !== "kalshi" || table !== "trades") {
        throw new AthenaLakeRequestError(
          'Kalshi trades compose.join presets are only allowed for lake "kalshi" and table "trades"',
          { statusCode: 400, code: "BAD_REQUEST" },
        );
      }
      joinPresetValidated = jp;
    }

    const allowed =
      joinPresetValidated && KALSHI_TRADES_JOIN_PRESETS.has(joinPresetValidated)
        ? new Set(KALSHI_TRADES_RESOLVED_MARKETS_JOIN_META.map((c) => c.name))
        : new Set(allowedColumnsForLakeTable(lake, table));
    if (allowed.size === 0) {
      throw new AthenaLakeRequestError("Compose query is not available for this table", { statusCode: 400, code: "BAD_REQUEST" });
    }

    const dateBuckets = new Set(["day", "week", "month", "quarter", "year"]);
    const dateFormats = new Set(["dmy", "ym", "dm"]);
    const scales = new Set(["none", "thousand", "million", "billion"]);
    const safeAlias = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

    const selectIn = Array.isArray(raw.select) ? raw.select : [];
    if (selectIn.length === 0) {
      throw new AthenaLakeRequestError("compose.select must be a non-empty array", { statusCode: 400, code: "BAD_REQUEST" });
    }

    /** @type {Array<{ column: string; alias: string; aggregate: null | "sum" | "count"; dateBucket: string | null; dateFormat: string | null; numberScale: string; decimals: number | null; treatAsDate: boolean; columnType: string }>} */
    const normalizedSelect = [];

    for (const row of selectIn) {
      if (!row || typeof row !== "object") {
        throw new AthenaLakeRequestError("Invalid compose.select entry", { statusCode: 400, code: "BAD_REQUEST" });
      }
      const column = String(row.column || "").trim();
      if (!allowed.has(column)) {
        throw new AthenaLakeRequestError(`Unknown or disallowed column: ${column}`, { statusCode: 400, code: "BAD_REQUEST" });
      }
      const colType =
        joinPresetValidated && KALSHI_TRADES_JOIN_PRESETS.has(joinPresetValidated)
          ? kalshiResolvedMarketsJoinColumnMeta(column)?.type
          : columnHiveTypeForLakeTable(lake, table, column);
      if (!colType) {
        throw new AthenaLakeRequestError(`Unknown column type: ${column}`, { statusCode: 400, code: "BAD_REQUEST" });
      }

      const alias = String(row.alias || "").trim();
      if (!safeAlias.test(alias)) {
        throw new AthenaLakeRequestError(`Invalid alias: ${alias}`, { statusCode: 400, code: "BAD_REQUEST" });
      }

      const aggRaw = row.aggregate == null || row.aggregate === "" ? null : String(row.aggregate).toLowerCase().trim();
      const aggregate = aggRaw === "sum" ? "sum" : aggRaw === "count" ? "count" : null;

      const db = row.dateBucket != null && String(row.dateBucket).trim() !== "" ? String(row.dateBucket).trim().toLowerCase() : null;
      const dateBucket = db && dateBuckets.has(db) ? db : null;

      const dfRaw = row.dateFormat != null && String(row.dateFormat).trim() !== "" ? String(row.dateFormat).trim().toLowerCase() : null;
      const dateFormat = dfRaw && dateFormats.has(dfRaw) ? dfRaw : null;

      if (dateBucket && dateFormat) {
        throw new AthenaLakeRequestError("Use only one of dateBucket or dateFormat per column", {
          statusCode: 400,
          code: "BAD_REQUEST",
        });
      }

      const treatAsDate = row.treatAsDate === true;
      if ((dateBucket || dateFormat) && !treatAsDate) {
        throw new AthenaLakeRequestError("dateBucket/dateFormat require treatAsDate: true", { statusCode: 400, code: "BAD_REQUEST" });
      }
      if ((dateBucket || dateFormat) && !isNumericHiveType(colType)) {
        throw new AthenaLakeRequestError("Date truncation applies only to numeric epoch columns", {
          statusCode: 400,
          code: "BAD_REQUEST",
        });
      }
      if ((dateBucket || dateFormat) && !isDateLikeColumnName(column)) {
        throw new AthenaLakeRequestError("Date truncation applies only to date-like columns", {
          statusCode: 400,
          code: "BAD_REQUEST",
        });
      }

      if (aggregate === "sum" && !isNumericHiveType(colType)) {
        throw new AthenaLakeRequestError("SUM applies only to numeric columns", { statusCode: 400, code: "BAD_REQUEST" });
      }

      const scaleRaw = row.numberScale != null ? String(row.numberScale).toLowerCase().trim() : "none";
      const numberScale = scales.has(scaleRaw) ? scaleRaw : "none";
      if (numberScale !== "none" && !isNumericHiveType(colType)) {
        throw new AthenaLakeRequestError("Scaling applies only to numeric columns", { statusCode: 400, code: "BAD_REQUEST" });
      }

      let decimals = null;
      if (row.decimals != null && String(row.decimals).trim() !== "") {
        const d = Math.floor(Number(row.decimals));
        if (!Number.isFinite(d) || d < 0 || d > 8) {
          throw new AthenaLakeRequestError("decimals must be between 0 and 8", { statusCode: 400, code: "BAD_REQUEST" });
        }
        decimals = d;
      }
      if (decimals != null && !isNumericHiveType(colType)) {
        throw new AthenaLakeRequestError("decimals apply only to numeric columns", { statusCode: 400, code: "BAD_REQUEST" });
      }

      if (aggregate && (dateBucket || dateFormat)) {
        throw new AthenaLakeRequestError("Do not combine aggregates with date truncation on the same select item", {
          statusCode: 400,
          code: "BAD_REQUEST",
        });
      }

      normalizedSelect.push({
        column,
        alias,
        aggregate,
        dateBucket,
        dateFormat,
        numberScale,
        decimals,
        treatAsDate,
        columnType: colType,
      });
    }

    const hasAggInSelect = normalizedSelect.some((r) => r.aggregate === "sum" || r.aggregate === "count");
    const dimensionAliases = normalizedSelect.filter((r) => !r.aggregate).map((r) => r.alias);
    const allSelectAliases = new Set(normalizedSelect.map((r) => r.alias));

    if (hasAggInSelect && dimensionAliases.length === 0) {
      throw new AthenaLakeRequestError(
        "With SUM or COUNT, add at least one other field without Sum/Count (e.g. trade time → bucket by quarter) so results can GROUP BY that bucket.",
        { statusCode: 400, code: "BAD_REQUEST" },
      );
    }

    /** With aggregates, GROUP BY is always every non-aggregated column (e.g. quarter); tens of thousands of trades in Q1 2024 collapse to one row. */
    let groupByAliases;
    if (hasAggInSelect) {
      groupByAliases = dimensionAliases;
    } else {
      groupByAliases = Array.isArray(raw.groupByAliases)
        ? raw.groupByAliases.map((a) => String(a || "").trim()).filter(Boolean)
        : [];
      for (const a of groupByAliases) {
        if (!safeAlias.test(a) || !allSelectAliases.has(a)) {
          throw new AthenaLakeRequestError(`Invalid compose.groupByAliases: ${a}`, { statusCode: 400, code: "BAD_REQUEST" });
        }
      }
    }

    const orderBy = Array.isArray(raw.orderBy)
      ? raw.orderBy.map((o) => {
          if (!o || typeof o !== "object") {
            throw new AthenaLakeRequestError("Invalid compose.orderBy entry", { statusCode: 400, code: "BAD_REQUEST" });
          }
          const a = String(o.alias || "").trim();
          const dir = String(o.direction || "asc").toLowerCase().trim() === "desc" ? "desc" : "asc";
          return { alias: a, direction: dir };
        })
      : [];

    validatedCompose = {
      select: normalizedSelect,
      groupByAliases,
      orderBy,
      ...(joinPresetValidated ? { join: { preset: joinPresetValidated } } : {}),
    };

    try {
      const capRows = composeUnboundedSelectShouldCapRows(validatedCompose) ? COMPOSE_UNCONSTRAINED_ROW_CAP : null;
      buildComposeAthenaSelectSql({
        physicalTableName: physical,
        limit: capRows,
        compose: validatedCompose,
        lake,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new AthenaLakeRequestError(msg, { statusCode: 400, code: "BAD_REQUEST" });
    }
  }

  return {
    lake,
    table,
    limit: limClamped,
    columns: queryType === "compose" ? null : columns && columns.length ? columns : null,
    queryType,
    countAlias: queryType === "count" ? countAlias : null,
    countDistinctColumn: queryType === "count" && countDistinctColumn ? countDistinctColumn : null,
    sumColumn: queryType === "sum" ? sumColumn : null,
    sumAlias: queryType === "sum" ? sumAlias : null,
    caseSensitive,
    filters: queryType === "count" || queryType === "sum" ? validatedFilters : null,
    physical,
    database,
    compose: validatedCompose,
  };
}
