/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  sanitizeSheetsForPersist,
  sheetHasRefineRecipe,
  buildProjectDeltaPayload,
} from "@/lib/projectPersistence.js";
import {
  computeRemoveDataSheetResult,
  collectDependentSheetIds,
} from "@/lib/removeDataSheetFromWorkspace.js";
import {
  replayProjectDerivedSheets,
  pickInitialActiveSheetId,
  sheetNeedsDerivedReplay,
} from "@/lib/replayProjectDerivedSheets.js";

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

console.log("\nAll workspace unit tests passed.");
