/**
 * Bounded Athena SELECT (synchronous): waits for completion in one request.
 * Prefer start + status polling from the browser for serverless timeouts.
 *
 * POST JSON body: lake, table, limit?, columns?
 */
import {
  validateAthenaLakeQueryBody,
  AthenaLakeRequestError,
} from "../../../lib/dataLake/validateAthenaLakeRequest";
import { runAthenaBoundedSelect } from "../../../lib/dataLake/runAthenaSelect";

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

  const maxWaitMs = Math.min(
    Math.max(5000, parseInt(process.env.DATA_LAKE_ATHENA_MAX_WAIT_MS || "45000", 10) || 45000),
    120000
  );

  try {
    const result = await runAthenaBoundedSelect({
      physicalTableName: validated.physical,
      database: validated.database,
      columns: validated.columns,
      queryType: validated.queryType,
      countAlias: validated.countAlias,
      countDistinctColumn: validated.countDistinctColumn,
      sumColumn: validated.sumColumn,
      sumAlias: validated.sumAlias,
      compose: validated.compose,
      filters: validated.filters,
      caseSensitive: validated.caseSensitive,
      limit: validated.limit,
      maxWaitMs,
    });

    return res.status(200).json({
      lake: validated.lake,
      table: validated.table,
      glueTable: validated.physical,
      database: validated.database,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      truncated: false,
      queryExecutionId: result.queryExecutionId,
      dataScannedBytes: result.dataScannedBytes,
    });
  } catch (e) {
    const code = e.code || "INTERNAL";
    if (code === "CONFIG") {
      return res.status(503).json({ error: e.message, code: "CONFIG" });
    }
    if (code === "BAD_REQUEST") {
      return res.status(400).json({ error: e.message, code: "BAD_REQUEST" });
    }
    if (code === "TIMEOUT") {
      return res.status(408).json({
        error: e.message,
        code: "TIMEOUT",
        queryExecutionId: e.queryExecutionId,
      });
    }
    if (code === "ATHENA_FAILED") {
      return res.status(502).json({
        error: e.message,
        code: "ATHENA_FAILED",
        queryExecutionId: e.queryExecutionId,
        engineState: e.engineState,
      });
    }
    return res.status(500).json({ error: e.message || "Internal error", code: "INTERNAL" });
  }
}
