import assert from "node:assert/strict";
import { buildComposeAthenaSelectSql } from "./buildComposeAthenaSql.js";
import { sanitizeComposeForRandomSample } from "./randomSample.js";
import {
  normalizeHubQueryDraft,
} from "../hubs/hubQueryDraft.js";
import { buildDataLakeServerComposePayload } from "../dataLakeComposePayload.js";
import { workspaceSupportsResearchTools } from "../connectResearchTools.js";
import { RANDOM_SAMPLE_HELPER_CONTENT } from "../randomSampleHelperContent.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

const baseSelect = [
  { column: "id", alias: "id", aggregate: null },
  { column: "question", alias: "question", aggregate: null },
  { column: "volume", alias: "volume", aggregate: null },
];

test("random sample disabled leaves SQL unchanged vs prior shape", () => {
  const without = buildComposeAthenaSelectSql({
    physicalTableName: "polymarket_markets",
    limit: 100,
    compose: { select: baseSelect, groupByAliases: [], orderBy: [] },
  });
  const withNull = buildComposeAthenaSelectSql({
    physicalTableName: "polymarket_markets",
    limit: 100,
    compose: { select: baseSelect, groupByAliases: [], orderBy: [] },
    randomSampleSize: null,
  });
  assert.equal(without, withNull);
  assert.ok(without.includes("LIMIT 100"));
  assert.ok(!without.includes("random()"));
  assert.ok(!without.includes("__lychee_eligible"));
});

test("sampling with no filters", () => {
  const sql = buildComposeAthenaSelectSql({
    physicalTableName: "polymarket_markets",
    limit: 100,
    compose: { select: baseSelect, groupByAliases: [], orderBy: [] },
    randomSampleSize: 25,
  });
  assert.ok(sql.includes('AS "__lychee_eligible"'));
  assert.ok(sql.includes("ORDER BY random()"));
  assert.ok(sql.includes("LIMIT 25"));
  assert.ok(!sql.includes("LIMIT 100"));
  assert.ok(!sql.includes("TABLESAMPLE"));
});

test("sampling after WHERE is outside eligible subquery", () => {
  const sql = buildComposeAthenaSelectSql({
    physicalTableName: "polymarket_markets",
    limit: null,
    compose: { select: baseSelect, groupByAliases: [], orderBy: [] },
    whereSql: ' WHERE t0."volume" > 10000',
    randomSampleSize: 10,
  });
  assert.ok(sql.includes('WHERE t0."volume" > 10000'));
  assert.ok(sql.indexOf("WHERE") < sql.indexOf("__lychee_eligible") || sql.includes("__lychee_eligible"));
  assert.ok(sql.includes("ORDER BY random() LIMIT 10"));
});

test("sampling after GROUP BY and HAVING samples aggregate rows", () => {
  const sql = buildComposeAthenaSelectSql({
    physicalTableName: "polymarket_markets",
    limit: null,
    compose: {
      select: [
        { column: "category", alias: "category", aggregate: null },
        { column: "id", alias: "market_count", aggregate: "count" },
        { column: "volume", alias: "average_volume", aggregate: "avg" },
      ],
      groupByAliases: ["category"],
      orderBy: [],
      having: { and: [{ alias: "market_count", op: "gt", value: 49 }] },
    },
    randomSampleSize: 5,
  });
  assert.ok(sql.includes("GROUP BY"));
  assert.ok(sql.includes("HAVING"));
  assert.ok(sql.includes("ORDER BY random() LIMIT 5"));
  assert.ok(sql.indexOf("GROUP BY") < sql.indexOf("ORDER BY random()"));
});

test("sampling with count_distinct aggregate", () => {
  const sql = buildComposeAthenaSelectSql({
    physicalTableName: "polymarket_markets",
    limit: null,
    compose: {
      select: [
        { column: "category", alias: "category", aggregate: null },
        { column: "id", alias: "uniq", aggregate: "count_distinct" },
      ],
      groupByAliases: ["category"],
      orderBy: [],
    },
    randomSampleSize: 3,
  });
  assert.ok(sql.includes("COUNT(DISTINCT"));
  assert.ok(sql.includes("ORDER BY random() LIMIT 3"));
});

test("user sort is outer-only after sample", () => {
  const sql = buildComposeAthenaSelectSql({
    physicalTableName: "polymarket_markets",
    limit: 999,
    compose: {
      select: baseSelect,
      groupByAliases: [],
      orderBy: [{ alias: "volume", direction: "desc" }],
    },
    randomSampleSize: 100,
  });
  assert.ok(sql.includes("__lychee_sampled"));
  assert.ok(sql.includes('ORDER BY "volume" DESC'));
  const randomIdx = sql.indexOf("ORDER BY random()");
  const userIdx = sql.lastIndexOf('ORDER BY "volume"');
  assert.ok(randomIdx > -1 && userIdx > randomIdx);
  assert.ok(!sql.slice(0, randomIdx).includes('ORDER BY "volume"'));
  assert.ok(sql.includes("ORDER BY random() LIMIT 100"));
  assert.ok(!sql.includes("LIMIT 999"));
});

test("multi-column asc/desc sort after sample", () => {
  const sql = buildComposeAthenaSelectSql({
    physicalTableName: "polymarket_markets",
    limit: null,
    compose: {
      select: baseSelect,
      groupByAliases: [],
      orderBy: [
        { alias: "volume", direction: "desc" },
        { alias: "id", direction: "asc" },
      ],
    },
    randomSampleSize: 20,
  });
  assert.match(sql, /ORDER BY "volume" DESC, "id" ASC/);
});

test("ordinary limit and limitScope do not pre-limit eligible population when sampling", () => {
  const sql = buildComposeAthenaSelectSql({
    physicalTableName: "polymarket_markets",
    limit: 50,
    compose: {
      select: baseSelect,
      groupByAliases: [],
      orderBy: [],
      limitScope: "primary",
    },
    randomSampleSize: 15,
    expandedJoinResultCap: 5000,
  });
  assert.ok(!sql.includes("base_limited"));
  assert.ok(sql.includes("ORDER BY random() LIMIT 15"));
  assert.ok(!/\bLIMIT 50\b/.test(sql));
  assert.ok(!/\bLIMIT 5000\b/.test(sql));
});

test("sanitize drops limitScope when random sample active", () => {
  const out = sanitizeComposeForRandomSample(
    { select: baseSelect, limitScope: "primary", orderBy: [] },
    { size: 9 },
  );
  assert.equal(out.limitScope, undefined);
  assert.equal(out.randomSample.size, 9);
  assert.equal(out.randomSample.mode, "unseeded");
  assert.equal(out.randomSample.enabled, true);
});

test("hub draft hydration sanitizes limit when random sample enabled", () => {
  const draft = normalizeHubQueryDraft({
    sampleId: "polymarket-markets",
    integrationId: "polymarketHistorical",
    columnSelections: { "polymarket-markets": ["id", "volume"] },
    composeLimitOpen: true,
    composeLimitValue: "500",
    randomSampleEnabled: true,
    randomSampleSize: "40",
  });
  assert.equal(draft.composeLimitOpen, false);
  assert.equal(draft.composeLimitValue, "");
  assert.equal(draft.randomSampleEnabled, true);
  assert.equal(draft.randomSampleSize, "40");
});

test("payload includes randomSample and omits limitScope", () => {
  const payload = buildDataLakeServerComposePayload({
    columnComposeItems: [
      { column: "id", alias: "id", aggregate: null },
      { column: "volume", alias: "volume", aggregate: null },
    ],
    columnComposeOrderBy: [{ alias: "volume", direction: "desc" }],
    composeHavingFilters: [],
    composeJoins: [
      {
        targetKind: "table",
        joinType: "inner",
        targetTable: "trades",
        leftColumn: "id",
        rightColumn: "market_id",
      },
    ],
    hasComposeAggregates: false,
    composeDimensionAliases: [],
    dataset: "polymarket",
    selectedTable: "markets",
    composeLimitScope: "primary",
    randomSampleEnabled: true,
    randomSampleSize: 100,
  });
  assert.equal(payload.randomSample.enabled, true);
  assert.equal(payload.randomSample.size, 100);
  assert.equal(payload.randomSample.mode, "seeded");
  assert.ok(payload.randomSample.seed);
  assert.equal(payload.limitScope, undefined);
  assert.deepEqual(payload.orderBy, [{ alias: "volume", direction: "desc" }]);
});

test("payload unseeded omits seed", () => {
  const payload = buildDataLakeServerComposePayload({
    columnComposeItems: [
      { column: "id", alias: "id", aggregate: null },
      { column: "volume", alias: "volume", aggregate: null },
    ],
    columnComposeOrderBy: [],
    composeHavingFilters: [],
    composeJoins: [],
    hasComposeAggregates: false,
    composeDimensionAliases: [],
    dataset: "polymarket",
    selectedTable: "markets",
    composeLimitScope: "primary",
    randomSampleEnabled: true,
    randomSampleSize: 100,
    randomSampleSeeded: false,
  });
  assert.deepEqual(payload.randomSample, {
    enabled: true,
    size: 100,
    mode: "unseeded",
  });
});

test("historical workspaces share research tools; live does not", () => {
  assert.equal(workspaceSupportsResearchTools("polymarketHistorical"), true);
  assert.equal(workspaceSupportsResearchTools("kalshiHistorical"), true);
  assert.equal(workspaceSupportsResearchTools("polymarketLive"), false);
  assert.equal(workspaceSupportsResearchTools("kalshiLive"), false);
});

test("helper content is data-driven with empty guides", () => {
  assert.equal(RANDOM_SAMPLE_HELPER_CONTENT.label, "Helper");
  assert.equal(RANDOM_SAMPLE_HELPER_CONTENT.title, "Random Sample");
  assert.ok(Array.isArray(RANDOM_SAMPLE_HELPER_CONTENT.introduction));
  assert.ok(RANDOM_SAMPLE_HELPER_CONTENT.sections.some((s) => s.type === "code"));
  assert.ok(RANDOM_SAMPLE_HELPER_CONTENT.sections.some((s) => s.type === "ordered_list"));
  assert.deepEqual(RANDOM_SAMPLE_HELPER_CONTENT.guideLinks, []);
});

test("sample size is numeric literal in SQL not string interpolation of raw text", () => {
  const sql = buildComposeAthenaSelectSql({
    physicalTableName: "kalshi_markets",
    limit: null,
    compose: { select: baseSelect, groupByAliases: [], orderBy: [] },
    randomSampleSize: 42,
  });
  assert.ok(sql.includes("LIMIT 42"));
  assert.ok(!sql.includes("LIMIT '42'"));
});
