import assert from "node:assert/strict";
import { nextNewSheetLabel } from "@/lib/connectHomeAddBlankSheet.js";

assert.equal(nextNewSheetLabel(null), "new_sheet_0");
assert.equal(nextNewSheetLabel({}), "new_sheet_0");
assert.equal(
  nextNewSheetLabel({ "sheet-1": { name: "Sheet 1", data: [] } }),
  "new_sheet_0",
);
assert.equal(
  nextNewSheetLabel({
    "sheet-1": { name: "Sheet 1" },
    "sheet-2": { name: "new_sheet_0" },
  }),
  "new_sheet_1",
);
assert.equal(
  nextNewSheetLabel({
    a: { name: "new_sheet_0" },
    b: { name: "new_sheet_2" },
    c: { name: "markets" },
  }),
  "new_sheet_3",
);
assert.equal(
  nextNewSheetLabel({
    a: { name: "new_sheet_00" },
  }),
  "new_sheet_1",
);

console.log("connectHomeAddBlankSheet: ok");
