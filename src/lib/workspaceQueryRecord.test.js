import assert from "node:assert/strict";
import { sanitizeQueryRecord } from "./workspaceQueryRecord.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("query records keep the search and drop row payloads", () => {
  const saved = sanitizeQueryRecord("saved", {
    id: "kalshi:markets:1",
    integrationId: "kalshiHistorical",
    label: "Markets search",
    savedAt: 10,
    tableId: "markets",
    hidden: ["volume"],
    rows: [{ ticker: "PRES-2024-KH" }],
    cells: { "0,0": "secret" },
  });
  assert.equal(saved.id, "kalshi:markets:1");
  assert.equal(saved.label, "Markets search");
  assert.deepEqual(saved.hidden, ["volume"]);
  assert.equal(saved.rows, undefined);
  assert.equal(saved.cells, undefined);

  const pull = sanitizeQueryRecord("pull", {
    id: "run-1",
    integrationId: "kalshiHistorical",
    label: "Markets search",
    rowLimit: "2",
    attributeFilters: { time_period: { value: "day" } },
    sortKeys: [{ columnId: "pnl", direction: "desc" }],
    sheets: [{ id: "run-markets", title: "Markets", rowCount: 5 }],
    data: [1, 2, 3],
  });
  assert.equal(pull.sheets[0].title, "Markets");
  assert.equal(pull.rowLimit, "2");
  assert.equal(pull.attributeFilters.time_period.value, "day");
  assert.equal(pull.sortKeys[0].columnId, "pnl");
  assert.equal(pull.data, undefined);
});

test("query records reject a missing owner key", () => {
  assert.equal(sanitizeQueryRecord("saved", { label: "Markets search" }), null);
  assert.equal(sanitizeQueryRecord("other", { id: "x", integrationId: "kalshiHistorical" }), null);
});
