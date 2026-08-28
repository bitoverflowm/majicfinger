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

test("boolean where ops include equality and null checks", () => {
  assert.deepEqual(
    whereOpsForKind("boolean").map((o) => o.id),
    ["eq", "neq", "is_not_null", "is_null"],
  );
  assert.equal(coerceWhereOpForKind("gt", "boolean"), "eq");
  assert.equal(defaultWhereValueForKind("boolean", "eq"), "true");
});

test("is_not_null is complete without a value", () => {
  assert.equal(
    isComposeWhereFilterIncomplete({
      column: "volume",
      kind: "number",
      op: "is_not_null",
      value: "",
    }),
    false,
  );
  assert.equal(defaultWhereValueForKind("number", "is_not_null"), "");
});

test("number zero is a complete equality value and empty is not", () => {
  assert.equal(
    isComposeWhereFilterIncomplete({
      column: "volume",
      kind: "number",
      op: "eq",
      value: 0,
    }),
    false,
  );
  assert.equal(
    isComposeWhereFilterIncomplete({
      column: "volume",
      kind: "number",
      op: "eq",
      value: "",
    }),
    true,
  );
  assert.equal(defaultWhereValueForKind("number", "eq"), "");
});

test("volume equals zero SQL is not the same as is_not_null", () => {
  const eqZero = buildComposeFiltersWhereSql({
    filters: {
      and: [{ column: "volume", kind: "number", op: "eq", value: 0 }],
      or: [],
    },
    caseSensitive: true,
    baseAlias: "t0",
  });
  const notNull = buildComposeFiltersWhereSql({
    filters: {
      and: [{ column: "volume", kind: "number", op: "is_not_null", value: null }],
      or: [],
    },
    caseSensitive: true,
    baseAlias: "t0",
  });
  assert.ok(eqZero.includes('t0."volume" = 0'));
  assert.ok(!eqZero.includes("IS NOT NULL"));
  assert.ok(notNull.includes('t0."volume" IS NOT NULL'));
  assert.ok(!notNull.includes("= 0"));
});

test("normalizeHubQueryWhereFilters keeps is_not_null without a value", () => {
  const out = normalizeHubQueryWhereFilters([
    { id: "1", column: "volume", kind: "number", op: "is_not_null", value: "" },
    { id: "2", column: "volume", kind: "number", op: "eq", value: "" },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].op, "is_not_null");
  assert.equal(out[0].column, "volume");
});

test("is_not_null WHERE SQL", () => {
  const sql = buildComposeFiltersWhereSql({
    filters: {
      and: [{ column: "volume", kind: "number", op: "is_not_null", value: null }],
      or: [],
    },
    caseSensitive: true,
    baseAlias: "t0",
  });
  assert.ok(sql.includes('t0."volume" IS NOT NULL'));
});

test("is_null WHERE SQL", () => {
  const sql = buildComposeFiltersWhereSql({
    filters: {
      and: [{ column: "question", kind: "string", op: "is_null", value: null }],
      or: [],
    },
    caseSensitive: true,
    baseAlias: "t0",
  });
  assert.ok(sql.includes('t0."question" IS NULL'));
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
