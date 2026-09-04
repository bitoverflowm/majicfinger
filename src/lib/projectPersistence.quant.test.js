import assert from "node:assert/strict";
import {
  applyBrowserOperationToRows,
  findQuantAthenaOperation,
  operationOutputsColumn,
  pruneOperationHistoryForDeletedColumn,
  recordSheetColumnDeletion,
  replayOperations,
  sheetHasQuantAthenaRecipe,
  stripQuantRecipeSheetsForPersist,
} from "./projectPersistence.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("sheetHasQuantAthenaRecipe detects quant athena history", () => {
  assert.equal(
    sheetHasQuantAthenaRecipe({
      operationHistory: [{ type: "quant.relative_position.athena", rootSheetId: "sheet-1" }],
    }),
    true,
  );
  assert.equal(sheetHasQuantAthenaRecipe({ operationHistory: [] }), false);
});

test("stripQuantRecipeSheetsForPersist keeps preview rows and recipe metadata", () => {
  const out = stripQuantRecipeSheetsForPersist({
    "sheet-2": {
      name: "Lifecycle Snapshots",
      sourceSheetId: "sheet-1",
      data: [{ ticker: "A" }],
      fullRowCount: 25552,
      operationHistory: [
        {
          type: "quant.relative_position.athena",
          rootSheetId: "sheet-1",
          join: { lake: "kalshi", table: "trades", columns: ["created_time"] },
          quant: { groupColumn: "ticker", progressColumn: "created_time", mode: "snapshot" },
        },
      ],
    },
  });
  const sheet = out["sheet-2"];
  assert.equal(sheet.data.length, 1);
  assert.equal(sheet.storageMode, "derived");
  assert.equal(sheet.rehydrationStatus, "preview");
  assert.equal(sheet.fullRowCount, 25552);
  assert.equal(findQuantAthenaOperation(sheet)?.rootSheetId, "sheet-1");
});

test("manual.sheet.replace restores rows when the sheet is empty", () => {
  const out = applyBrowserOperationToRows([], {
    type: "manual.sheet.replace",
    rows: [
      { band: "volume = 0", id: 0, label: "v = 0", _origIndex: 9 },
      { band: "0 < volume < 10,000", id: 1, label: "0 < v < 10k" },
    ],
  });
  assert.equal(out.length, 2);
  assert.equal(out[0].band, "volume = 0");
  assert.equal(out[0].id, 0);
  assert.equal(out[0]._origIndex, undefined);
  assert.equal(out[1].label, "0 < v < 10k");
});

test("manual.sheet.replace overlays user columns onto existing query rows by band", () => {
  const current = [
    { band: "0 < volume < 10,000", market_count: 99 },
    { band: "volume = 0", market_count: 11 },
  ];
  const out = applyBrowserOperationToRows(current, {
    type: "manual.sheet.replace",
    rows: [
      { band: "volume = 0", market_count: 10, id: 0, label: "v = 0" },
      { band: "0 < volume < 10,000", market_count: 20, id: 1, label: "0 < v < 10k" },
    ],
  });
  assert.equal(out[0].band, "0 < volume < 10,000");
  assert.equal(out[0].market_count, 99);
  assert.equal(out[0].id, 1);
  assert.equal(out[0].label, "0 < v < 10k");
  assert.equal(out[1].band, "volume = 0");
  assert.equal(out[1].market_count, 11);
  assert.equal(out[1].id, 0);
  assert.equal(out[1].label, "v = 0");
});

test("replayOperations applies JSON replace after non-SQL ops", () => {
  const out = replayOperations({
    rows: [],
    operations: [
      { type: "source.compose" },
      {
        type: "manual.sheet.replace",
        rows: [{ band: "volume = 0", id: 0, label: "v = 0" }],
      },
    ],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 0);
});

test("pruneOperationHistoryForDeletedColumn drops computed.column producers", () => {
  const pruned = pruneOperationHistoryForDeletedColumn(
    [
      { type: "summary.multi_sheet", id: "mss" },
      { type: "computed.column", id: "err", column: "Signed Mean Error" },
      { type: "computed.column", id: "keep", column: "Other Col" },
    ],
    "Signed Mean Error",
  );
  assert.equal(pruned.length, 2);
  assert.equal(pruned[0].id, "mss");
  assert.equal(pruned[1].id, "keep");
  assert.equal(operationOutputsColumn({ type: "computed.column", column: "Signed Mean Error" }, "Signed Mean Error"), true);
});

test("recordSheetColumnDeletion prunes producer and appends delete.column", () => {
  const sheets = {
    "mss-1": {
      name: "Multi summary",
      multiSheetSummaryConfig: {
        sourceSheetIds: ["s1"],
        metrics: [
          { id: "m1", outputName: "Sample Mean", op: "avg", column: "volume" },
          { id: "m2", outputName: "Signed Mean Error", op: "avg", column: "volume" },
        ],
        resultSheetId: "mss-1",
      },
      operationHistory: [
        {
          type: "summary.multi_sheet",
          id: "op-mss",
          outputs: ["Sample Mean", "Signed Mean Error"],
          multiSheetSummaryConfig: {
            sourceSheetIds: ["s1"],
            metrics: [
              { id: "m1", outputName: "Sample Mean", op: "avg", column: "volume" },
              { id: "m2", outputName: "Signed Mean Error", op: "avg", column: "volume" },
            ],
          },
        },
        {
          type: "computed.column",
          id: "op-err",
          column: "Signed Mean Error",
          expression: { kind: "binary", op: "subtract", leftColumn: "a", rightColumn: "b" },
        },
      ],
    },
  };
  const next = recordSheetColumnDeletion(sheets, "mss-1", "Signed Mean Error");
  const hist = next["mss-1"].operationHistory;
  assert.ok(!hist.some((op) => op.type === "computed.column" && op.column === "Signed Mean Error"));
  assert.equal(hist[hist.length - 1].type, "delete.column");
  assert.equal(hist[hist.length - 1].column, "Signed Mean Error");
  assert.ok(hist.some((op) => op.type === "summary.multi_sheet"));
  const mssOp = hist.find((op) => op.type === "summary.multi_sheet");
  assert.deepEqual(
    mssOp.multiSheetSummaryConfig.metrics.map((m) => m.outputName),
    ["Sample Mean"],
  );
  assert.deepEqual(mssOp.outputs, ["Sample Mean"]);
  assert.deepEqual(
    next["mss-1"].multiSheetSummaryConfig.metrics.map((m) => m.outputName),
    ["Sample Mean"],
  );
});
