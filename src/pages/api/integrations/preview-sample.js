import { freeLimits } from "@/lib/athenaAccess";
import { runAthenaBoundedSelect } from "@/lib/dataLake/runAthenaSelect";
import { AthenaLakeRequestError, validateAthenaLakeQueryBody } from "@/lib/dataLake/validateAthenaLakeRequest";

/**
 * GET /api/integrations/preview-sample?sample=kalshi-markets
 * The fixed historical samples the add-data picker previews. The lake is historical, so every visitor
 * gets the same rows: cache them at the edge instead of running a multi-second Athena query per visit.
 *
 * GET /api/integrations/preview-sample?q={lake,table,queryType,limit,compose}
 * A build step's opening preview (no filters, at most PREVIEW_ROWS rows) or its whole-table row count.
 * Both are the same for every visitor.
 */

const compose = (columns, orderBy) => ({
  select: columns.map((column) => ({ column, alias: column })),
  groupByAliases: [],
  orderBy: [{ alias: orderBy, direction: "desc" }],
});

const SAMPLES = {
  "kalshi-markets": {
    lake: "kalshi",
    table: "markets",
    compose: compose(["ticker", "title", "status", "last_price", "volume"], "volume"),
  },
  "kalshi-trades": {
    lake: "kalshi",
    table: "trades",
    compose: compose(["ticker", "count", "yes_price", "taker_side", "created_time"], "count"),
  },
  "polymarket-markets": {
    lake: "polymarket",
    table: "markets",
    compose: compose(["question", "volume", "outcome_prices", "closed"], "volume"),
  },
};

const PREVIEW_ROWS = 50;
const DAY_S = 86_400;
const MEMO_MS = DAY_S * 1000;
const MEMO_MAX = 200;
const memo = new Map();

async function runQuery(body) {
  const validated = validateAthenaLakeQueryBody(body, freeLimits());
  const result = await runAthenaBoundedSelect({
    physicalTableName: validated.physical,
    database: validated.database,
    columns: validated.columns,
    queryType: validated.queryType,
    countAlias: validated.countAlias,
    compose: validated.compose,
    lake: validated.lake,
    table: validated.table,
    filters: validated.filters,
    caseSensitive: validated.caseSensitive,
    limit: validated.limit,
    maxWaitMs: 45_000,
    demo: validated.demo,
    composeSqlCap: validated.maxComposeRows,
    unlimitedComposeRows: validated.unlimitedComposeRows,
  });
  return { columns: result.columns, rows: result.rows };
}

function memoized(key, body) {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.task;
  const task = runQuery(body).catch((error) => {
    memo.delete(key);
    throw error;
  });
  memo.delete(key);
  memo.set(key, { at: Date.now(), task });
  if (memo.size > MEMO_MAX) memo.delete(memo.keys().next().value);
  return task;
}

/** Only the unfiltered opening preview and row count are shared; anything narrower goes through /api/data-lake/athena-query. */
function previewBody(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || parsed.filters) return null;
  if (parsed.queryType === "count") {
    return { lake: parsed.lake, table: parsed.table, queryType: "count", countAlias: parsed.countAlias, limit: 1, caseSensitive: false };
  }
  if (parsed.queryType !== "compose") return null;
  const limit = Number(parsed.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > PREVIEW_ROWS) return null;
  return { lake: parsed.lake, table: parsed.table, queryType: "compose", limit, caseSensitive: false, compose: parsed.compose };
}

function param(value) {
  return String(Array.isArray(value) ? value[0] : value || "");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  let task;
  const q = param(req.query.q);
  if (q) {
    const body = previewBody(q);
    if (!body) return res.status(400).json({ error: "Not a shareable preview" });
    task = memoized(`q:${JSON.stringify(body)}`, body);
  } else {
    const id = param(req.query.sample);
    if (!Object.hasOwn(SAMPLES, id)) return res.status(404).json({ error: "Unknown sample" });
    task = memoized(`sample:${id}`, { ...SAMPLES[id], queryType: "compose", demo: true, limit: 6 });
  }

  try {
    const data = await task;
    res.setHeader("Cache-Control", `public, s-maxage=${DAY_S}, stale-while-revalidate=${DAY_S * 7}`);
    return res.status(200).json(data);
  } catch (e) {
    if (e instanceof AthenaLakeRequestError) return res.status(e.statusCode).json({ error: e.message, code: e.code });
    return res.status(502).json({ error: e instanceof Error ? e.message : "Sample pull failed" });
  }
}
