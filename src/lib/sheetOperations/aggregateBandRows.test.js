import assert from "node:assert/strict";
import {
  aggregateBandRows,
  assignVolumeBandPresetOrderIds,
  valueMatchesBandPredicate,
} from "./aggregateBandRows.js";
import { createVolumeBandPresets } from "./bandsConfig.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("valueMatchesBandPredicate handles numeric strings", () => {
  assert.equal(valueMatchesBandPredicate("0.0", "eq", { value: "0" }), true);
  assert.equal(
    valueMatchesBandPredicate("5", "between", {
      min: "0",
      max: "10",
      minInclusive: false,
      maxInclusive: false,
    }),
    true,
  );
  assert.equal(
    valueMatchesBandPredicate("0", "between", {
      min: "0",
      max: "10",
      minInclusive: false,
      maxInclusive: false,
    }),
    false,
  );
  assert.equal(valueMatchesBandPredicate("100000000", "gte", { value: "100000000" }), true);
});

test("aggregateBandRows collapses to one row per configured band", () => {
  const rows = [
    { id: "1", volume: "0.0", closed: "true" },
    { id: "2", volume: "0", closed: "true" },
    { id: "3", volume: "50", closed: "true" },
    { id: "4", volume: "15000", closed: "true" },
    { id: "5", volume: "500000", closed: "true" },
    { id: "6", volume: "200000000", closed: "true" },
  ];
  const out = aggregateBandRows(rows, {
    bandColumn: "volume",
    bandOutputColumn: "band",
    sheetName: "Volume bands",
    bands: createVolumeBandPresets("volume"),
    aggregations: [
      {
        id: "a1",
        type: "count",
        valueColumn: "id",
        outputColumn: "market_count",
      },
      {
        id: "a2",
        type: "sum",
        valueColumn: "volume",
        outputColumn: "total_volume",
      },
    ],
  });

  assert.equal(out.length, 7);
  assert.equal(out[0].band, "volume = 0");
  assert.equal(out[0].id, 0);
  assert.equal(out[0].market_count, 2);
  assert.equal(out[1].id, 1);
  assert.equal(out[1].market_count, 1);
  assert.equal(out[2].market_count, 1);
  assert.equal(out[3].market_count, 1);
  assert.equal(out[6].id, 6);
  assert.equal(out[6].market_count, 1);
  assert.equal(out[6].total_volume, 200000000);
  assert.equal(out[4].market_count, 0);
  assert.equal(out[5].market_count, 0);
});

test("assignVolumeBandPresetOrderIds repairs scrambled ids from band labels", () => {
  const rows = [
    { band: "100,000 ≤ volume < 1,000,000", id: 0, market_count: 1 },
    { band: "volume = 0", id: 3, market_count: 2 },
    { band: "volume ≥ 100,000,000", id: 2, market_count: 3 },
  ];
  const out = assignVolumeBandPresetOrderIds(rows);
  assert.equal(out.find((r) => r.band === "volume = 0").id, 0);
  assert.equal(out.find((r) => r.band === "100,000 ≤ volume < 1,000,000").id, 3);
  assert.equal(out.find((r) => r.band === "volume ≥ 100,000,000").id, 6);
});
