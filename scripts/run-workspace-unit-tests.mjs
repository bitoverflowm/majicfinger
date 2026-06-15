/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  sanitizeSheetsForPersist,
  sheetHasRefineRecipe,
  buildProjectDeltaPayload,
} from "@/lib/projectPersistence.js";
import {
  summarizeSessionWorkspaceUsage,
  workspaceHasDisplayableData,
} from "@/lib/workspaceStorageQuota.js";
import {
  computeRemoveDataSheetResult,
  collectDependentSheetIds,
} from "@/lib/removeDataSheetFromWorkspace.js";
import {
  replayProjectDerivedSheets,
  pickInitialActiveSheetId,
  sheetNeedsDerivedReplay,
} from "@/lib/replayProjectDerivedSheets.js";
import { buildDataLakeServerComposePayload } from "@/lib/dataLakeComposePayload.js";
import {
  summarizeComposeJoinClauses,
  composeItemRefKey,
  defaultComposeJoinColumnAlias,
  appendJoinTargetColumns,
  removeJoinTargetColumns,
} from "@/lib/composeJoinColumns.js";
import { formatConnectRequestCardQuery } from "@/lib/connectHomeRequestQuery.js";
import { composeUsesPrimaryTableLimit, composePrimaryJoinExpandCap, resolveComposeExpandedFetchRowLimit } from "@/lib/composeLimitScope.js";

import "@/lib/sheetOperations/quant/quantOperations.test.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("prune orphan default Sheet tabs that duplicate provenance row count", () => {
  const sheets = {
    "sheet-1": {
      name: "all_political_markets",
      data: [],
      provenance: { kind: "compose" },
      fullRowCount: 7460,
      operationHistory: [{ type: "source.compose" }],
    },
    "sheet-7": {
      name: "Sheet 1",
      data: new Array(7460).fill({ x: 1 }),
      operationHistory: [],
    },
  };
  const out = sanitizeSheetsForPersist(sheets);
  assert.equal(out["sheet-7"], undefined);
  assert.equal(out["sheet-1"].data.length, 0);
});

test("strip refine recipe sheets to empty data with derived storageMode", () => {
  const sheets = {
    "sheet-1": { name: "parent", data: [{ a: 1 }], provenance: null },
    "sheet-2": {
      name: "A_markets",
      data: [{ a: 1 }],
      sourceSheetId: "sheet-1",
      storageMode: "inline",
      operationHistory: [{ type: "refine.query", sourceSheetId: "sheet-1", filters: { and: [] } }],
    },
  };
  const out = sanitizeSheetsForPersist(sheets);
  assert.ok(sheetHasRefineRecipe(out["sheet-2"]));
  assert.equal(out["sheet-2"].data.length, 0);
  assert.equal(out["sheet-2"].storageMode, "derived");
  assert.equal(out["sheet-2"].saveMeta.recipeOnly, true);
});

test("remove sheet deletes dependents without reindexing ids", () => {
  const sheets = {
    "sheet-1": { name: "parent", data: [{ id: 1 }] },
    "sheet-2": {
      name: "child",
      data: [{ id: 1 }],
      sourceSheetId: "sheet-1",
      operationHistory: [{ type: "refine.query", sourceSheetId: "sheet-1" }],
    },
    "sheet-3": { name: "other", data: [{ id: 2 }] },
  };
  assert.deepEqual([...collectDependentSheetIds(sheets, "sheet-1")].sort(), ["sheet-2"]);
  const result = computeRemoveDataSheetResult(sheets, "sheet-1", "sheet-1");
  assert.deepEqual(result.deletedSheetIds.sort(), ["sheet-1", "sheet-2"]);
  assert.equal(result.dataSheets["sheet-1"], undefined);
  assert.equal(result.dataSheets["sheet-2"], undefined);
  assert.equal(result.dataSheets["sheet-3"].name, "other");
  assert.equal(result.idMap, null);
});

test("replayProjectDerivedSheets applies refine.query from parent rows", () => {
  const parentRows = [
    { active: true, name: "a" },
    { active: false, name: "b" },
  ];
  const sheets = {
    "sheet-1": { name: "parent", data: parentRows },
    "sheet-2": {
      name: "filtered",
      data: [],
      storageMode: "derived",
      sourceSheetId: "sheet-1",
      operationHistory: [
        {
          type: "refine.query",
          sourceSheetId: "sheet-1",
          selectColumns: ["name", "active"],
          filters: {
            and: [{ column: "active", op: "eq", kind: "boolean", value: true }],
          },
        },
      ],
    },
  };
  assert.equal(sheetNeedsDerivedReplay(sheets["sheet-2"]), true);
  const replayed = replayProjectDerivedSheets(sheets);
  assert.equal(replayed["sheet-2"].data.length, 1);
  assert.equal(replayed["sheet-2"].data[0].name, "a");
});

test("pickInitialActiveSheetId prefers compose provenance parent over derived and orphans", () => {
  const id = pickInitialActiveSheetId({
    "sheet-7": { name: "Sheet 1", data: new Array(100).fill({}) },
    "sheet-2": { name: "A_markets", data: [], storageMode: "derived", operationHistory: [{ type: "refine.query" }] },
    "sheet-1": { name: "all_political_markets", data: [], fullRowCount: 100, provenance: { kind: "compose" } },
  });
  assert.equal(id, "sheet-1");
});

test("pickInitialActiveSheetId prefers provenance parent over small inline sheets", () => {
  const id = pickInitialActiveSheetId({
    "sheet-1": { name: "all_political_markets", data: [], fullRowCount: 7460, provenance: { kind: "compose" } },
    "sheet-2": { name: "calibration_analysis", data: new Array(10).fill({ x: 1 }) },
  });
  assert.equal(id, "sheet-1");
});

test("workspaceHasDisplayableData is false for empty default workspace", () => {
  assert.equal(
    workspaceHasDisplayableData({
      connectedData: [],
      dataSheets: { "sheet-1": { name: "Sheet 1", data: [] } },
      chartDataOverride: null,
      viewing: "connectDataHome",
    }),
    false,
  );
});

test("summarizeSessionWorkspaceUsage counts only loaded rows", () => {
  const summary = summarizeSessionWorkspaceUsage(
    {
      "sheet-1": { name: "parent", data: [], fullRowCount: 7460 },
      "sheet-2": { name: "small", data: [{ a: 1 }, { a: 2 }] },
    },
    [],
  );
  assert.equal(summary.rowCount, 2);
  assert.ok(summary.usedBytes > 0);
});

test("buildProjectDeltaPayload records deleted sheet ids", () => {
  const base = {
    data_sheets: {
      "sheet-1": { name: "A", data: [] },
      "sheet-2": { name: "B", data: [] },
    },
  };
  const next = {
    data_sheets: {
      "sheet-1": { name: "A", data: [] },
    },
  };
  const delta = buildProjectDeltaPayload({ baseProject: base, currentPayload: next });
  assert.ok(delta.hasChanges);
  assert.deepEqual(delta.patch.deletedSheetIds, ["sheet-2"]);
});

test("compose join payload includes joins and joined select columns", () => {
  const payload = buildDataLakeServerComposePayload({
    columnComposeItems: [
      { column: "ticker", alias: "ticker", aggregate: null },
      { column: "count", alias: "trades_count", sourceTable: "trades", aggregate: null },
    ],
    columnComposeOrderBy: [],
    composeHavingFilters: [],
    composeJoins: [
      {
        id: "j1",
        targetKind: "table",
        targetTable: "trades",
        leftColumn: "ticker",
        rightColumn: "ticker",
        joinType: "left",
      },
    ],
    hasComposeAggregates: false,
    composeDimensionAliases: [],
    dataset: "kalshi",
    selectedTable: "markets",
    kalshiTradesJoinPreset: "",
    kalshiTradesJoinPresets: new Set(),
  });
  assert.equal(payload.joins?.length, 1);
  assert.equal(payload.joins[0].joinType, "left");
  assert.equal(payload.select[1].sourceTable, "trades");
  assert.equal(payload.limitScope, undefined);

  const payloadPrimary = buildDataLakeServerComposePayload({
    columnComposeItems: [{ column: "ticker", alias: "ticker", aggregate: null }],
    columnComposeOrderBy: [],
    composeHavingFilters: [],
    composeJoins: [
      {
        id: "j1",
        targetKind: "table",
        targetTable: "trades",
        leftColumn: "ticker",
        rightColumn: "ticker",
        joinType: "left",
      },
    ],
    hasComposeAggregates: false,
    composeDimensionAliases: [],
    dataset: "kalshi",
    selectedTable: "markets",
    kalshiTradesJoinPreset: "",
    kalshiTradesJoinPresets: new Set(),
    composeLimitScope: "primary",
  });
  assert.equal(payloadPrimary.limitScope, "primary");
});

test("request history includes JOIN clauses", () => {
  const summary = formatConnectRequestCardQuery(
    {
      lake: "kalshi",
      table: "markets",
      selectAliases: ["ticker", "volume"],
      hasWhere: true,
      whereText: 'kalshi_taxonomy_category eq "Politics"',
      composeRowLimit: 2,
    },
    {
      provenance: {
        composeSpec: {
          joins: [
            {
              joinType: "left",
              table: "trades",
              on: { leftColumn: "ticker", rightColumn: "ticker" },
            },
          ],
          limitScope: "primary",
        },
      },
    },
  );
  assert.match(summary, /LEFT JOIN trades ON ticker = ticker/);
  assert.match(summary, /LIMIT 2 \(primary table, then expand joins\)/);
});

test("compose join column helpers", () => {
  assert.equal(defaultComposeJoinColumnAlias("trades", "count"), "trades_count");
  assert.equal(composeItemRefKey({ column: "ticker", sourceTable: "trades" }), "trades.ticker");
  assert.deepEqual(summarizeComposeJoinClauses({ joins: [{ joinType: "left", table: "trades", on: { leftColumn: "ticker", rightColumn: "ticker" } }] }), [
    "LEFT JOIN trades ON ticker = ticker",
  ]);
});

test("appendJoinTargetColumns adds every join-table column once", () => {
  const out = appendJoinTargetColumns([{ column: "ticker", alias: "ticker" }], {
    lake: "kalshi",
    joinTable: "trades",
  });
  assert.ok(out.length > 1);
  assert.ok(out.some((i) => i.column === "count" && i.sourceTable === "trades"));
  const again = appendJoinTargetColumns(out, { lake: "kalshi", joinTable: "trades" });
  assert.equal(again.length, out.length);
});

test("removeJoinTargetColumns drops one or all join-table columns", () => {
  const items = [
    { column: "ticker", alias: "ticker" },
    { column: "count", sourceTable: "trades", alias: "trades_count" },
    { column: "yes_price", sourceTable: "trades", alias: "trades_yes_price" },
  ];
  const one = removeJoinTargetColumns(items, { joinTable: "trades", columnNames: ["count"] });
  assert.equal(one.length, 2);
  assert.ok(one.some((i) => i.column === "yes_price" && i.sourceTable === "trades"));
  const none = removeJoinTargetColumns(items, { joinTable: "trades" });
  assert.equal(none.length, 1);
  assert.equal(none[0].column, "ticker");
});

test("composeUsesPrimaryTableLimit detects primary-table join limit", () => {
  const compose = {
    limitScope: "primary",
    joins: [{ joinType: "inner", table: "trades", on: { leftColumn: "ticker", rightColumn: "ticker" } }],
    select: [{ column: "ticker", alias: "ticker" }],
  };
  assert.equal(composeUsesPrimaryTableLimit(compose, 2), true);
  assert.equal(composeUsesPrimaryTableLimit({ ...compose, limitScope: "result" }, 2), false);
  assert.equal(composeUsesPrimaryTableLimit({ ...compose, joins: [] }, 2), false);
  assert.equal(composeUsesPrimaryTableLimit(compose, null), false);
});

test("primary join expand cap bounds fetch for large trade fan-out", () => {
  assert.equal(composePrimaryJoinExpandCap(500000), 25000);
  assert.equal(composePrimaryJoinExpandCap(100), 100);
  assert.equal(resolveComposeExpandedFetchRowLimit(
    {
      limitScope: "primary",
      joins: [{ joinType: "inner", table: "trades", on: { leftColumn: "ticker", rightColumn: "ticker" } }],
      select: [{ column: "ticker", alias: "ticker" }],
    },
    1,
    500000,
  ), 25000);
});

console.log("\nAll workspace unit tests passed.");
