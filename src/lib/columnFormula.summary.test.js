import assert from "node:assert/strict";

import { evaluateCellFormula, evaluateColumnFormula } from "@/lib/columnFormula.js";

const columns = [
  { id: "size", title: "Size", type: "number" },
  { id: "yes", title: "Yes price", type: "number" },
];
const rows = [
  { size: 10, yes: 63 },
  { size: 25, yes: 48 },
  { size: 5, yes: 22 },
];
const sheets = [{ id: "markets", title: "Trades", columns, rows }];

const sum = evaluateCellFormula("= SUM(Size)", { columns, rows, sheets, sheetId: "markets" });
assert.equal(sum.error, "");
assert.equal(sum.value, 40);

const average = evaluateCellFormula("=AVERAGE(Yes price)", { columns, rows, sheets, sheetId: "markets" });
assert.equal(average.error, "");
assert.equal(average.value, (63 + 48 + 22) / 3);

const one = evaluateCellFormula("= Size[2]", { columns, rows, sheets, sheetId: "markets" });
assert.equal(one.value, 25);

const bare = evaluateCellFormula("= Size", { columns, rows, sheets, sheetId: "markets" });
assert.match(bare.error, /SUM/);

const label = evaluateCellFormula("Total size", { columns, rows, sheets, sheetId: "markets" });
assert.equal(label.value, "Total size");

const other = evaluateCellFormula("= SUM(Trades!Size)", { columns: [], rows: [], sheets, sheetId: "summary" });
assert.equal(other.value, 40);

const perRow = evaluateColumnFormula("= SUM(Yes price, Size)", columns, rows, { sheets, sheetId: "markets" });
assert.deepEqual(perRow.values, [73, 73, 27]);
assert.equal(perRow.error, "");

console.log("columnFormula.summary.test.js ok");
