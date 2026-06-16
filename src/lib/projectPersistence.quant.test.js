import assert from "node:assert/strict";
import {
  findQuantAthenaOperation,
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

test("stripQuantRecipeSheetsForPersist keeps recipe metadata only", () => {
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
  assert.equal(sheet.data.length, 0);
  assert.equal(sheet.storageMode, "derived");
  assert.equal(sheet.rehydrationStatus, "pending");
  assert.equal(sheet.fullRowCount, 25552);
  assert.equal(findQuantAthenaOperation(sheet)?.rootSheetId, "sheet-1");
});
