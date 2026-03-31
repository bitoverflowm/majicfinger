/**
 * Join active sheet rows with an Athena compose pull (server-side).
 *
 * POST JSON body:
 * {
 *   lake: "polymarket" | "kalshi",
 *   table: "markets" | "trades" | "blocks",
 *   compose: object,          // compose spec (same shape as /athena-query compose)
 *   filters?: object | null,  // optional filters object
 *   sheetRows: Record<string, unknown>[],
 *   join: {
 *     sheetColumn: string,
 *     pullColumn: string,     // column name in the *underlying Glue table* to join on
 *     joinType?: "left" | "inner"
 *   }
 * }
 */
import { validateAthenaLakeQueryBody, AthenaLakeRequestError } from "../../../lib/dataLake/validateAthenaLakeRequest";
import { runAthenaBoundedSelect } from "../../../lib/dataLake/runAthenaSelect";
import { athenaRowsToObjects } from "../../../lib/duckdb/duckdbWasmClient";

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

function safeKey(k) {
  const s = String(k || "").trim();
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s) ? s : "";
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

  const sheetRows = Array.isArray(body.sheetRows) ? body.sheetRows : [];
  const join = body.join && typeof body.join === "object" ? body.join : null;
  const sheetColumn = safeKey(join?.sheetColumn);
  const pullColumn = safeKey(join?.pullColumn);
  const joinType = String(join?.joinType || "left").toLowerCase().trim() === "inner" ? "inner" : "left";
  if (!sheetColumn || !pullColumn) {
    return res.status(400).json({ error: "Missing join.sheetColumn or join.pullColumn", code: "BAD_REQUEST" });
  }

  const composeIn = body.compose && typeof body.compose === "object" ? body.compose : null;
  if (!composeIn) {
    return res.status(400).json({ error: "Missing compose", code: "BAD_REQUEST" });
  }

  // Ensure the pull includes the join key (so the server can merge rows).
  const selectIn = Array.isArray(composeIn.select) ? [...composeIn.select] : [];
  const hasPullKey = selectIn.some((s) => String(s?.column || "").trim() === pullColumn);
  const pullKeyAlias = hasPullKey
    ? String(selectIn.find((s) => String(s?.column || "").trim() === pullColumn)?.alias || pullColumn).trim()
    : "__join_key";
  const injectedSelect = hasPullKey
    ? selectIn
    : [
        ...selectIn,
        {
          column: pullColumn,
          alias: "__join_key",
          aggregate: null,
          dateBucket: null,
          dateFormat: null,
          numberScale: "none",
          decimals: null,
          treatAsDate: false,
        },
      ];

  const composedBody = {
    lake: body.lake,
    table: body.table,
    queryType: "compose",
    compose: { ...composeIn, select: injectedSelect },
    filters: body.filters && typeof body.filters === "object" ? body.filters : null,
    caseSensitive: true,
  };

  let validated;
  try {
    validated = validateAthenaLakeQueryBody(composedBody);
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
      columns: null,
      queryType: "compose",
      countAlias: null,
      countDistinctColumn: null,
      sumColumn: null,
      sumAlias: null,
      compose: validated.compose,
      lake: validated.lake,
      filters: validated.filters,
      caseSensitive: validated.caseSensitive,
      limit: validated.limit,
      maxWaitMs,
    });

    const pullObjects = athenaRowsToObjects(result.columns, result.rows);
    const rightKey = pullKeyAlias || "__join_key";

    // Build lookup (first match wins).
    const rightByKey = new Map();
    for (const r of pullObjects) {
      const k = r?.[rightKey];
      const kk = k == null ? "" : String(k);
      if (!kk) continue;
      if (!rightByKey.has(kk)) rightByKey.set(kk, r);
    }

    const merged = [];
    for (const left of sheetRows) {
      const base = left && typeof left === "object" ? left : {};
      const lk = base?.[sheetColumn];
      const lks = lk == null ? "" : String(lk);
      const right = lks ? rightByKey.get(lks) : null;
      if (!right && joinType === "inner") continue;
      const out = { ...(base || {}) };
      if (right) {
        for (const [k, v] of Object.entries(right)) {
          if (k === rightKey) continue;
          const outKey = Object.prototype.hasOwnProperty.call(out, k) ? `${validated.table}_${k}` : k;
          out[outKey] = v;
        }
      }
      merged.push(out);
    }

    const columns = Array.from(
      merged.reduce((set, row) => {
        Object.keys(row || {}).forEach((k) => set.add(k));
        return set;
      }, new Set())
    );

    return res.status(200).json({
      lake: validated.lake,
      table: validated.table,
      columns,
      rows: merged,
      rowCount: merged.length,
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
      return res.status(408).json({ error: e.message, code: "TIMEOUT", queryExecutionId: e.queryExecutionId });
    }
    if (code === "ATHENA_FAILED") {
      return res.status(502).json({ error: e.message, code: "ATHENA_FAILED", queryExecutionId: e.queryExecutionId });
    }
    return res.status(500).json({ error: e.message || "Internal error", code: "INTERNAL" });
  }
}

