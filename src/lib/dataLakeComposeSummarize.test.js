import assert from "node:assert/strict";
import {
  collectReferencedComposeColumns,
  formatAlsoSelectedColumnsLine,
  getUnsummarizedDimensionColumns,
  keepComposeItemsForOneSummaryRow,
  selectRowsForAggregatedCompose,
} from "./composeColumnGrouping.js";
import {
  isAutoSummarizeAlias,
  sanitizeComposeAlias,
  suggestSummarizeAlias,
  syncComposeItemsWithSelectedColumns,
} from "./dataLakeComposeSummarize.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("suggestSummarizeAlias suffixes aggregate and uniquifies", () => {
  assert.equal(suggestSummarizeAlias("volume", "sum", []), "volume_sum");
  assert.equal(suggestSummarizeAlias("volume", "max", ["volume_sum"]), "volume_max");
  assert.equal(suggestSummarizeAlias("volume", "sum", ["volume_sum"]), "volume_sum_2");
  assert.equal(suggestSummarizeAlias("volume", "count_distinct", []), "volume_count_distinct");
});

test("sanitizeComposeAlias makes Athena-safe identifiers", () => {
  assert.equal(sanitizeComposeAlias("Max Volume"), "Max_Volume");
  assert.equal(sanitizeComposeAlias("123bad"), "c_123bad");
  assert.equal(sanitizeComposeAlias(""), "col");
});

test("isAutoSummarizeAlias recognizes generated names", () => {
  assert.equal(isAutoSummarizeAlias("volume_sum", "volume", "sum"), true);
  assert.equal(isAutoSummarizeAlias("volume_sum_2", "volume", "sum"), true);
  assert.equal(isAutoSummarizeAlias("total_volume", "volume", "sum"), false);
});

test("syncComposeItemsWithSelectedColumns keeps multi-agg rows for same column", () => {
  const prev = [
    { id: "1", column: "volume", alias: "volume_sum", aggregate: "sum" },
    { id: "2", column: "volume", alias: "volume_max", aggregate: "max" },
    { id: "3", column: "question", alias: "question", aggregate: null },
  ];
  let created = 0;
  const next = syncComposeItemsWithSelectedColumns(prev, ["volume"], (col) => {
    created += 1;
    return { id: `n-${created}`, column: col, alias: col, aggregate: null };
  });
  assert.equal(created, 0);
  assert.equal(next.length, 2);
  assert.deepEqual(
    next.map((r) => r.alias),
    ["volume_sum", "volume_max"],
  );
});

test("syncComposeItemsWithSelectedColumns adds missing base columns", () => {
  const prev = [{ id: "1", column: "volume", alias: "volume", aggregate: null }];
  const next = syncComposeItemsWithSelectedColumns(prev, ["volume", "question"], (col) => ({
    id: `new-${col}`,
    column: col,
    alias: col,
    aggregate: null,
  }));
  assert.equal(next.length, 2);
  assert.ok(next.some((r) => r.column === "question"));
});

test("getUnsummarizedDimensionColumns lists leftovers when summarizing without buckets", () => {
  assert.deepEqual(
    getUnsummarizedDimensionColumns([
      { column: "id", alias: "market_count", aggregate: "count" },
      { column: "volume", alias: "total_volume", aggregate: "sum" },
    ]),
    [],
  );
  assert.deepEqual(
    getUnsummarizedDimensionColumns([
      { column: "id", alias: "market_count", aggregate: "count" },
      { column: "volume", alias: "total_volume", aggregate: "sum" },
      { column: "question", alias: "question", aggregate: null },
      { column: "slug", alias: "slug", aggregate: null },
    ]),
    ["question", "slug"],
  );
  assert.deepEqual(
    getUnsummarizedDimensionColumns([
      { column: "volume", alias: "total_volume", aggregate: "sum" },
      { column: "category", alias: "category", aggregate: null, stringBucket: "distinct" },
      { column: "question", alias: "question", aggregate: null },
    ]),
    [],
  );
});

test("formatAlsoSelectedColumnsLine caps with +N more", () => {
  assert.equal(
    formatAlsoSelectedColumnsLine(["question", "slug"], (c) => c),
    "Also selected: question, slug",
  );
  assert.equal(
    formatAlsoSelectedColumnsLine(["a", "b", "c", "d"], (c) => c),
    "Also selected: a, b, +2 more",
  );
});

test("keepComposeItemsForOneSummaryRow drops plain dimensions", () => {
  const kept = keepComposeItemsForOneSummaryRow([
    { id: "1", column: "id", alias: "market_count", aggregate: "count" },
    { id: "2", column: "volume", alias: "total_volume", aggregate: "sum" },
    { id: "3", column: "question", alias: "question", aggregate: null },
  ]);
  assert.equal(kept.length, 2);
  assert.ok(kept.every((r) => r.aggregate != null));
});

test("pullExcluded rows are omitted from SELECT and GROUP BY", () => {
  const items = [
    { column: "id", alias: "market_count", aggregate: "count" },
    { column: "volume", alias: "total_volume", aggregate: "sum" },
    { column: "closed", alias: "closed", aggregate: null, pullExcluded: true },
  ];
  assert.deepEqual(getUnsummarizedDimensionColumns(items), []);
  assert.deepEqual(
    selectRowsForAggregatedCompose(items).map((r) => r.column),
    ["id", "volume"],
  );
});

test("collectReferencedComposeColumns gathers WHERE and join columns", () => {
  const refs = collectReferencedComposeColumns({
    whereFilters: [{ column: "closed" }, { column: "volume" }],
    joins: [{ leftColumn: "id", rightColumn: "market_id" }],
  });
  assert.ok(refs.has("closed"));
  assert.ok(refs.has("volume"));
  assert.ok(refs.has("id"));
  assert.ok(refs.has("market_id"));
});

test("syncComposeItemsWithSelectedColumns preserves pullExcluded and skips resurrecting dropped dims", () => {
  const prev = [
    { column: "volume", alias: "total_volume", aggregate: "sum" },
    { column: "closed", alias: "closed", aggregate: null, pullExcluded: true },
  ];
  const next = syncComposeItemsWithSelectedColumns(prev, ["volume", "closed"], (col) => ({
    column: col,
    alias: col,
    aggregate: null,
  }));
  assert.equal(next.length, 2);
  assert.ok(next.some((r) => r.column === "closed" && r.pullExcluded));
  const withQuestion = syncComposeItemsWithSelectedColumns(next, ["volume", "closed", "question"], (col) => ({
    column: col,
    alias: col,
    aggregate: null,
  }));
  assert.ok(withQuestion.some((r) => r.column === "question" && !r.pullExcluded));
});
