import assert from "node:assert/strict";
import { SAVED_SHEET_ROWS, savedBlocksByPage, savedTables } from "./sheetRecordCache.js";

const trade = (index) => ({
  title: "Will Luiz Inácio Lula da Silva win the 2026 Brazilian presidential election?",
  outcome: index % 2 ? "Yes" : "No",
  side: "BUY",
  price: 0.42,
  size: 120 + index,
  observed_at: "2026-10-16T06:00:00Z",
});
const sheet = (id, count) => ({
  id,
  type: "sheet",
  columns: [{ id: "title" }, { id: "price" }],
  rowCount: count,
  pulledAt: 1,
  records: Array.from({ length: count }, (_, index) => trade(index)),
});

{
  const small = sheet("small", 300);
  const page = { "welcome:tab-a": [small, { id: "note", type: "text" }] };
  const saved = savedBlocksByPage(page);
  assert.equal(saved.blocksByPage, page);
  assert.deepEqual(saved.trimmed, []);
}

{
  const big = sheet("trades", 72912);
  const holders = sheet("holders", 2000);
  const saved = savedBlocksByPage({ "welcome:tab-a": [big, holders] });
  const [savedBig, savedHolders] = saved.blocksByPage["welcome:tab-a"];
  assert.equal(savedBig.records.length, SAVED_SHEET_ROWS);
  assert.equal(savedBig.rowCount, 72912);
  assert.equal(savedHolders, holders);
  assert.deepEqual(saved.trimmed.map((item) => item.block.id), ["trades"]);
  assert.equal(big.records.length, 72912);
}

{
  const pages = { "welcome:tab-a": Array.from({ length: 12 }, (_, index) => sheet(`trades-${index}`, 30000)) };
  const saved = savedBlocksByPage(pages);
  const bytes = JSON.stringify(saved.blocksByPage).length;
  assert.ok(bytes < 10 * 1024 * 1024, `saved ${bytes} bytes`);
  assert.ok(saved.blocksByPage["welcome:tab-a"].every((block) => block.records.length >= 50));
  assert.equal(saved.trimmed.length, 12);
}

{
  const pages = { "welcome:tab-a": [sheet("run-live-trades", 60)] };
  const tables = [
    { id: "run-live-trades", rows: Array.from({ length: 72912 }, (_, index) => trade(index)), rowCount: 72912 },
    { id: "other-tab", rows: Array.from({ length: 400 }, (_, index) => trade(index)), rowCount: 400 },
    { id: "empty", rowCount: 0 },
  ];
  const [own, other, empty] = savedTables(tables, pages);
  assert.equal(own.rows.length, 0);
  assert.equal(own.rowCount, 72912);
  assert.equal(other.rows.length, 50);
  assert.equal(empty, tables[2]);
}

console.log("sheetRecordCache tests passed");
