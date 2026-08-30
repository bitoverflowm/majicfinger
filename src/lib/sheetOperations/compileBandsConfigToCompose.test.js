import assert from "node:assert/strict";
import { buildComposeAthenaSelectSql } from "../dataLake/buildComposeAthenaSql.js";
import { resolveComposeGroupByAliases } from "../composeColumnGrouping.js";
import {
  canCompileBandsConfigToAthena,
  compileBandsConfigToCompose,
} from "./compileBandsConfigToCompose.js";
import { createVolumeBandPresets } from "./bandsConfig.js";
import { zeroFillBandAggregateRows } from "./aggregateBandRows.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

const volumeBandsBucket = {
  activeMode: "bands",
  sheetName: "Bucketed sheet",
  bandsConfig: {
    bandColumn: "volume",
    bandOutputColumn: "band",
    sheetName: "Bucketed sheet",
    bands: createVolumeBandPresets("volume"),
    groupByColumns: [],
    passthroughColumns: [],
    aggregations: [
      { id: "a1", type: "count", valueColumn: "id", outputColumn: "market_count" },
      { id: "a2", type: "sum", valueColumn: "volume", outputColumn: "total_volume" },
    ],
  },
};

test("canCompileBandsConfigToAthena accepts volume presets", () => {
  assert.equal(canCompileBandsConfigToAthena(volumeBandsBucket), true);
});

test("canCompileBandsConfigToAthena rejects passthrough / extra group-by", () => {
  assert.equal(
    canCompileBandsConfigToAthena({
      ...volumeBandsBucket,
      bandsConfig: {
        ...volumeBandsBucket.bandsConfig,
        passthroughColumns: ["id"],
      },
    }),
    false,
  );
  assert.equal(
    canCompileBandsConfigToAthena({
      ...volumeBandsBucket,
      bandsConfig: {
        ...volumeBandsBucket.bandsConfig,
        groupByColumns: ["closed"],
      },
    }),
    false,
  );
});

test("compileBandsConfigToCompose emits bandCase + count + sum", () => {
  const compiled = compileBandsConfigToCompose(volumeBandsBucket);
  assert.ok(compiled);
  assert.equal(compiled.columnComposeItems.length, 3);
  const [band, count, sum] = compiled.columnComposeItems;
  assert.equal(band.alias, "band");
  assert.equal(band.bandCase?.enabled, true);
  assert.equal(band.bandCase.branches.length, 7);
  assert.equal(count.aggregate, "count");
  assert.equal(count.alias, "market_count");
  assert.equal(sum.aggregate, "sum");
  assert.equal(sum.alias, "total_volume");
  assert.deepEqual(resolveComposeGroupByAliases(compiled.columnComposeItems), ["band"]);
});

test("Athena SQL uses CASE WHEN labels and GROUP BY", () => {
  const compiled = compileBandsConfigToCompose(volumeBandsBucket);
  const select = compiled.columnComposeItems.map((i) => ({
    column: i.column,
    alias: i.alias,
    aggregate: i.aggregate,
    dateBucket: null,
    dateFormat: null,
    stringBucket: null,
    numberBucket: null,
    numberScale: "none",
    decimals: null,
    treatAsDate: false,
    columnType: i.column === "id" ? "string" : "double",
    ...(i.bandCase ? { bandCase: i.bandCase } : {}),
  }));
  const sql = buildComposeAthenaSelectSql({
    physicalTableName: "polymarket_markets",
    lake: "polymarket",
    table: "markets",
    limit: null,
    compose: {
      select,
      groupByAliases: ["band"],
      orderBy: [],
    },
  });
  assert.ok(sql.includes("CASE WHEN"), sql);
  assert.ok(sql.includes("CAST(") && sql.includes("AS DOUBLE)"), sql);
  assert.ok(sql.includes("THEN 'volume = 0'"), sql);
  assert.ok(sql.includes('COUNT('), sql);
  assert.ok(sql.includes("SUM(CAST("), sql);
  assert.ok(sql.includes("GROUP BY"), sql);
  assert.ok(!sql.includes("ELSE CAST"), sql);
});

test("zeroFillBandAggregateRows restores empty bands", () => {
  const partial = [
    { band: "volume = 0", market_count: 2, total_volume: 0 },
    { band: "volume ≥ 100,000,000", market_count: 1, total_volume: 150000000 },
  ];
  const filled = zeroFillBandAggregateRows(partial, volumeBandsBucket.bandsConfig);
  assert.equal(filled.length, 7);
  assert.equal(filled[0].market_count, 2);
  assert.equal(filled[1].market_count, 0);
  assert.equal(filled[6].total_volume, 150000000);
});

console.log("all compileBandsConfigToCompose tests passed");
