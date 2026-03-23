/**
 * Shared validation for Athena lake POST bodies (start + sync query).
 */
import { resolveAthenaTableName } from "./athenaTableMap";

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
 *   queryType: "select" | "count";
 *   columns: string[] | null;
 *   countAlias: string | null;
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
  const queryType = queryTypeRaw === "count" ? "count" : "select";
  const caseSensitive = body.caseSensitive === true;
  const columns = Array.isArray(body.columns)
    ? body.columns.map((c) => String(c).trim()).filter(Boolean)
    : null;
  const countAlias = queryType === "count" ? String(body.countAlias || "count").trim() : null;
  const filtersInput =
    queryType === "count" && body.filters && typeof body.filters === "object" ? body.filters : null;
  let validatedFilters = null;

  if (lake !== "polymarket" && lake !== "kalshi") {
    throw new AthenaLakeRequestError('Invalid lake (use "polymarket" or "kalshi")');
  }
  if (!["markets", "trades", "blocks"].includes(table)) {
    throw new AthenaLakeRequestError('Invalid table (use "markets", "trades", or "blocks")');
  }

  // For count query we don't validate "columns" identifiers, because the SQL is COUNT(*).
  if (queryType === "count") {
    if (!countAlias) {
      throw new AthenaLakeRequestError("Missing countAlias", { statusCode: 400, code: "BAD_REQUEST" });
    }
    // Reuse safe identifier rules from athenaTableMap via isValidColumnIdentifier in runAthenaSelect.
    // We'll still block obviously bad aliases here.
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(countAlias)) {
      throw new AthenaLakeRequestError("Invalid countAlias", { statusCode: 400, code: "BAD_REQUEST" });
    }

    /** @type {{ and: any[]; or: any[] } | null} */
    const normalizedFilters =
      filtersInput == null
        ? null
        : {
            and: Array.isArray(filtersInput.and) ? filtersInput.and : [],
            or: Array.isArray(filtersInput.or) ? filtersInput.or : [],
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
        : {
            and: normalizedFilters.and.map(normalizePredicate),
            or: normalizedFilters.or.map(normalizePredicate),
          };

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

  return {
    lake,
    table,
    limit: Math.min(1000, Math.max(1, Math.floor(Number(limit) || 100))),
    columns: columns && columns.length ? columns : null,
    queryType,
    countAlias: queryType === "count" ? countAlias : null,
    caseSensitive,
    filters: queryType === "count" ? validatedFilters : null,
    physical,
    database,
  };
}
