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
 * @returns {{ lake: string; table: string; limit: number; columns: string[] | null; physical: string; database: string }}
 */
export function validateAthenaLakeQueryBody(body) {
  if (!body || typeof body !== "object") {
    throw new AthenaLakeRequestError("Invalid JSON body");
  }

  const lake = String(body.lake || "").toLowerCase().trim();
  const table = String(body.table || "").toLowerCase().trim();
  const limit = body.limit != null ? Number(body.limit) : 100;
  const columns = Array.isArray(body.columns)
    ? body.columns.map((c) => String(c).trim()).filter(Boolean)
    : null;

  if (lake !== "polymarket" && lake !== "kalshi") {
    throw new AthenaLakeRequestError('Invalid lake (use "polymarket" or "kalshi")');
  }
  if (!["markets", "trades", "blocks"].includes(table)) {
    throw new AthenaLakeRequestError('Invalid table (use "markets", "trades", or "blocks")');
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
    physical,
    database,
  };
}
