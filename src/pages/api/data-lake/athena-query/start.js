/**
 * Start a bounded Athena SELECT; returns immediately with queryExecutionId.
 * Client polls GET /api/data-lake/athena-query/status until state is SUCCEEDED.
 *
 * POST body: same as /api/data-lake/athena-query (lake, table, limit?, columns?)
 */
import {
  validateAthenaLakeQueryBody,
  AthenaLakeRequestError,
} from "../../../../lib/dataLake/validateAthenaLakeRequest";
import { startAthenaBoundedQuery } from "../../../../lib/dataLake/runAthenaSelect";

function parseBody(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return null;
    }
  }
  return req.body && typeof req.body === "object" ? req.body : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed", code: "METHOD" });
  }

  const body = parseBody(req);
  if (!body) {
    return res.status(400).json({ error: "Invalid JSON body", code: "BAD_REQUEST" });
  }

  let validated;
  try {
    validated = validateAthenaLakeQueryBody(body);
  } catch (e) {
    if (e instanceof AthenaLakeRequestError) {
      return res.status(e.statusCode).json({ error: e.message, code: e.code });
    }
    throw e;
  }

  try {
    const { queryExecutionId, sql, rowLimit } = await startAthenaBoundedQuery({
      physicalTableName: validated.physical,
      database: validated.database,
      columns: validated.columns,
      queryType: validated.queryType,
      countAlias: validated.countAlias,
      countDistinctColumn: validated.countDistinctColumn,
      sumColumn: validated.sumColumn,
      sumAlias: validated.sumAlias,
      filters: validated.filters,
      caseSensitive: validated.caseSensitive,
      limit: validated.limit,
    });

    return res.status(202).json({
      queryExecutionId,
      rowLimit,
      sql,
      lake: validated.lake,
      table: validated.table,
      glueTable: validated.physical,
      database: validated.database,
    });
  } catch (e) {
    const code = e.code || "INTERNAL";
    if (code === "CONFIG") {
      return res.status(503).json({ error: e.message, code: "CONFIG" });
    }
    if (code === "BAD_REQUEST") {
      return res.status(400).json({ error: e.message, code: "BAD_REQUEST" });
    }
    return res.status(500).json({ error: e.message || "Internal error", code: "INTERNAL" });
  }
}
