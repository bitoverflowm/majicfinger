import assert from "node:assert/strict";
import {
  applyColumnPolicy,
  coerceImportCell,
  columnKeysFromRows,
  diffImportColumns,
  parseJsonRows,
  parseMarkdownTable,
  sanitizeImportHeader,
} from "@/lib/parseSheetImportText.js";

assert.equal(sanitizeImportHeader(" sample size "), "sample_size");
assert.equal(coerceImportCell("1,000", "sample_size"), 1000);
assert.equal(coerceImportCell("1,000", "sample_size_label"), "1,000");
assert.equal(coerceImportCell("56.4", "err"), 56.4);
assert.equal(coerceImportCell("true"), true);

const md = `
| sample_size_order | sample_size_label | sample_size | average_absolute_mean_error | runs |
| ----------------: | ----------------: | ----------: | --------------------------: | ---: |
|                 1 |               100 |         100 |               56.4043472055 |    5 |
|                 2 |             1,000 |        1000 |               34.2736723388 |    5 |
`;

const mdRows = parseMarkdownTable(md);
assert.equal(mdRows.length, 2);
assert.deepEqual(columnKeysFromRows(mdRows), [
  "sample_size_order",
  "sample_size_label",
  "sample_size",
  "average_absolute_mean_error",
  "runs",
]);
assert.equal(mdRows[0].sample_size_order, 1);
assert.equal(mdRows[1].sample_size_label, "1,000");
assert.equal(mdRows[1].sample_size, 1000);
assert.equal(mdRows[0].runs, 5);

const jsonRows = parseJsonRows(JSON.stringify([{ a: 1 }, { a: 2, b: "x" }]));
assert.equal(jsonRows.length, 2);

const diff = diffImportColumns(["a", "c"], jsonRows);
assert.deepEqual(diff.unknown, ["b"]);
assert.deepEqual(diff.missing, ["c"]);
assert.equal(diff.hasMismatch, true);

const enforced = applyColumnPolicy(jsonRows, ["a", "c"], "enforce");
assert.deepEqual(Object.keys(enforced[0]).sort(), ["a", "c"]);
assert.equal(enforced[1].b, undefined);
assert.equal(enforced[0].c, "");

const added = applyColumnPolicy(jsonRows, ["a"], "add");
assert.equal(added[1].b, "x");

console.log("parseSheetImportText: ok");
