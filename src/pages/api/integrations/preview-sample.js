import { freeLimits } from "@/lib/athenaAccess";
import { runAthenaBoundedSelect } from "@/lib/dataLake/runAthenaSelect";
import { validateAthenaLakeQueryBody } from "@/lib/dataLake/validateAthenaLakeRequest";

/**
 * GET /api/integrations/preview-sample?sample=kalshi-markets
 * The fixed historical samples the add-data picker previews. The lake is historical, so every visitor
 * gets the same rows: cache them at the edge instead of running a multi-second Athena query per visit.
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

const DAY_S = 86_400;
const MEMO_MS = DAY_S * 1000;
const memo = new Map();

async function runSample(sample) {
  const validated = validateAthenaLakeQueryBody({ ...sample, queryType: "compose", demo: true, limit: 6 }, freeLimits());
  const result = await runAthenaBoundedSelect({
    physicalTableName: validated.physical,
    database: validated.database,
    columns: validated.columns,
    queryType: validated.queryType,
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

function loadSample(id) {
  const hit = memo.get(id);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.task;
  const task = runSample(SAMPLES[id]).catch((error) => {
    memo.delete(id);
    throw error;
  });
  memo.set(id, { at: Date.now(), task });
  return task;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }
  const id = String(Array.isArray(req.query.sample) ? req.query.sample[0] : req.query.sample || "");
  if (!Object.hasOwn(SAMPLES, id)) return res.status(404).json({ error: "Unknown sample" });

  try {
    const data = await loadSample(id);
    res.setHeader("Cache-Control", `public, s-maxage=${DAY_S}, stale-while-revalidate=${DAY_S * 7}`);
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: e instanceof Error ? e.message : "Sample pull failed" });
  }
}
