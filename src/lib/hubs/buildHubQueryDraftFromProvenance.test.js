import assert from "node:assert/strict";
import {
  activeComposeOpsFromDraftParts,
  buildHubQueryDraftFromProvenance,
  integrationIdFromLake,
  sampleIdForLakeTable,
} from "./buildHubQueryDraftFromProvenance.js";
import {
  peekConnectComposeEditDraft,
  stashConnectComposeEditDraft,
  takeConnectComposeEditDraft,
} from "./connectComposeEditDraft.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("integrationIdFromLake maps polymarket and kalshi", () => {
  assert.equal(integrationIdFromLake("polymarket"), "polymarketHistorical");
  assert.equal(integrationIdFromLake("kalshi"), "kalshiHistorical");
  assert.equal(integrationIdFromLake("polymarket-live"), null);
});

test("sampleIdForLakeTable resolves athena sample ids", () => {
  assert.equal(sampleIdForLakeTable("polymarketHistorical", "markets"), "athena-pm-markets");
  assert.equal(sampleIdForLakeTable("kalshiHistorical", "trades"), "athena-kal-trades");
});

test("buildHubQueryDraftFromProvenance restores summarize + where + rename", () => {
  const draft = buildHubQueryDraftFromProvenance({
    sheetId: "sheet1",
    sheet: { name: "all_resolved_markets" },
    provenance: {
      kind: "compose",
      lake: "polymarket",
      table: "markets",
      composeSpec: {
        select: [
          { column: "id", alias: "market_count", aggregate: "count" },
          { column: "volume", alias: "total_volume", aggregate: "sum" },
          { column: "volume", alias: "average_volume", aggregate: "avg" },
          { column: "volume", alias: "min_volume", aggregate: "min" },
          { column: "volume", alias: "max_volume", aggregate: "max" },
        ],
        groupByAliases: [],
        orderBy: [],
      },
      composeFilters: {
        and: [
          { column: "volume", kind: "number", op: "is_not_null", value: "" },
          { column: "closed", kind: "boolean", op: "eq", value: "true" },
        ],
        or: [],
      },
    },
  });

  assert.ok(draft);
  assert.equal(draft.integrationId, "polymarketHistorical");
  assert.equal(draft.sampleId, "athena-pm-markets");
  assert.deepEqual(draft.columnSelections["athena-pm-markets"].sort(), ["id", "volume"]);
  assert.equal(draft.columnComposeItems.length, 5);
  assert.equal(draft.columnComposeItems[0].alias, "market_count");
  assert.equal(draft.columnComposeItems[0].aggregate, "count");
  assert.equal(draft.columnComposeItems[1].alias, "total_volume");
  assert.equal(draft.whereFilters.length, 2);
  assert.equal(draft.whereFilters[0].op, "is_not_null");
  assert.equal(draft.whereFilters[1].column, "closed");
  assert.ok(draft.activeComposeOps.includes("where"));
  assert.ok(draft.activeComposeOps.includes("summarize"));
  assert.equal(draft.pendingSheetName, "all_resolved_markets");
});

test("buildHubQueryDraftFromProvenance rejects live lakes", () => {
  assert.equal(
    buildHubQueryDraftFromProvenance({
      provenance: { kind: "compose", lake: "polymarket-live", table: "markets", composeSpec: { select: [] } },
    }),
    null,
  );
});

test("activeComposeOpsFromDraftParts opens relevant panels", () => {
  const ops = activeComposeOpsFromDraftParts({
    whereFilters: [{ column: "x" }],
    columnComposeItems: [{ aggregate: "sum" }],
    orderBy: [{ alias: "x" }],
    havingFilters: [],
    joins: [],
    composeLimitOpen: false,
  });
  assert.deepEqual(ops.sort(), ["sort", "summarize", "where"].sort());
});

test("stash/take edit draft is consume-once per integration", () => {
  stashConnectComposeEditDraft(null);
  stashConnectComposeEditDraft({
    version: 1,
    integrationId: "polymarketHistorical",
    sampleId: "athena-pm-markets",
    columnSelections: { "athena-pm-markets": ["id"] },
  });
  assert.ok(peekConnectComposeEditDraft());
  assert.equal(takeConnectComposeEditDraft("kalshiHistorical"), null);
  const taken = takeConnectComposeEditDraft("polymarketHistorical");
  assert.equal(taken?.sampleId, "athena-pm-markets");
  assert.equal(takeConnectComposeEditDraft("polymarketHistorical"), null);
});
