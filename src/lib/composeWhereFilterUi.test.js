import assert from "node:assert/strict";
import { kindForLakeColumn } from "./dataLakeComposeHelpers.js";
import {
  coerceWhereOpForKind,
  defaultWhereValueForKind,
  isComposeWhereFilterIncomplete,
  whereOpsForKind,
} from "./composeWhereFilterUi.js";
import { normalizeHubQueryWhereFilters } from "./hubs/hubQueryDraft.js";
import { buildComposeFiltersWhereSql } from "./dataLake/composeWherePredicateSql.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("kindForLakeColumn maps registry boolean columns", () => {
  assert.equal(kindForLakeColumn("closed", { closed: "boolean" }), "boolean");
  assert.equal(kindForLakeColumn("active", { active: "bool" }), "boolean");
  assert.equal(kindForLakeColumn("volume", { volume: "double" }), "number");
  assert.equal(kindForLakeColumn("question", { question: "string" }), "string");
  assert.equal(kindForLakeColumn("mystery", { mystery: "struct" }), "string");
});

test("boolean where ops are eq/neq only", () => {
  assert.deepEqual(
    whereOpsForKind("boolean").map((o) => o.id),
    ["eq", "neq"],
  );
  assert.equal(coerceWhereOpForKind("gt", "boolean"), "eq");
  assert.equal(defaultWhereValueForKind("boolean", "eq"), "true");
});

test("boolean false is a complete filter value", () => {
  assert.equal(
    isComposeWhereFilterIncomplete({
      column: "closed",
      kind: "boolean",
      op: "eq",
      value: false,
    }),
    false,
  );
  assert.equal(
    isComposeWhereFilterIncomplete({
      column: "closed",
      kind: "boolean",
      op: "eq",
      value: "",
    }),
    true,
  );
});

test("normalizeHubQueryWhereFilters keeps boolean true/false", () => {
  const out = normalizeHubQueryWhereFilters([
    { id: "1", column: "closed", kind: "boolean", op: "eq", value: false },
    { id: "2", column: "active", kind: "boolean", op: "neq", value: "true" },
    { id: "3", column: "closed", kind: "boolean", op: "eq", value: "maybe" },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].value, "false");
  assert.equal(out[1].value, "true");
  assert.equal(out[1].op, "neq");
});

test("boolean WHERE SQL uses CAST compare not string LOWER quotes alone", () => {
  const sql = buildComposeFiltersWhereSql({
    filters: {
      and: [{ column: "closed", kind: "boolean", op: "eq", value: true }],
      or: [],
    },
    caseSensitive: true,
    baseAlias: "t0",
  });
  assert.ok(sql.includes("WHERE"));
  assert.ok(sql.includes('CAST(t0."closed" AS VARCHAR)'));
  assert.ok(sql.includes("= 'true'"));
  assert.ok(!sql.includes("LOWER(t0.\"closed\") = LOWER('true')"));
});

test("boolean neq false SQL", () => {
  const sql = buildComposeFiltersWhereSql({
    filters: {
      and: [{ column: "closed", kind: "boolean", op: "neq", value: false }],
      or: [],
    },
    caseSensitive: true,
    baseAlias: "t0",
  });
  assert.ok(sql.includes("<> 'false'"));
});
