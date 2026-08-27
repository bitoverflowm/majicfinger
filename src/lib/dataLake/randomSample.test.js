import assert from "node:assert/strict";
import {
  normalizeRandomSampleConfig,
  parseRandomSampleSize,
  sanitizeComposeForRandomSample,
  validateRandomSampleSizeInput,
  wrapComposeSqlWithRandomSample,
  RANDOM_SAMPLE_ABSOLUTE_MAX,
} from "./randomSample.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("parseRandomSampleSize accepts positive integers only", () => {
  assert.equal(parseRandomSampleSize(100), 100);
  assert.equal(parseRandomSampleSize("50"), 50);
  assert.equal(parseRandomSampleSize(2.0), 2);
  assert.equal(parseRandomSampleSize(0), null);
  assert.equal(parseRandomSampleSize(-1), null);
  assert.equal(parseRandomSampleSize(1.5), null);
  assert.equal(parseRandomSampleSize(""), null);
  assert.equal(parseRandomSampleSize("abc"), null);
  assert.equal(parseRandomSampleSize(NaN), null);
  assert.equal(parseRandomSampleSize(RANDOM_SAMPLE_ABSOLUTE_MAX + 1), null);
});

test("validateRandomSampleSizeInput rejects empty/invalid when required", () => {
  assert.ok(validateRandomSampleSizeInput(""));
  assert.ok(validateRandomSampleSizeInput("1.5"));
  assert.ok(validateRandomSampleSizeInput("-2"));
  assert.ok(validateRandomSampleSizeInput("0"));
  assert.equal(validateRandomSampleSizeInput("25"), null);
});

test("normalizeRandomSampleConfig requires enabled or size", () => {
  assert.equal(normalizeRandomSampleConfig({ enabled: false, size: 10 }), null);
  assert.deepEqual(normalizeRandomSampleConfig({ enabled: true, size: 10 }), { size: 10 });
  assert.deepEqual(normalizeRandomSampleConfig({ size: 7 }), { size: 7 });
});

test("sanitizeComposeForRandomSample drops limitScope", () => {
  const out = sanitizeComposeForRandomSample(
    { select: [], orderBy: [], limitScope: "primary" },
    { size: 12 },
  );
  assert.equal(out.limitScope, undefined);
  assert.deepEqual(out.randomSample, { size: 12 });
});

test("wrapComposeSqlWithRandomSample without user sort", () => {
  const sql = wrapComposeSqlWithRandomSample('SELECT id FROM "t"', { sampleSize: 100 });
  assert.ok(sql.includes('AS "__lychee_eligible"'));
  assert.ok(sql.includes("ORDER BY random()"));
  assert.ok(sql.includes("LIMIT 100"));
  assert.ok(!sql.includes("__lychee_sampled"));
  assert.ok(!sql.includes("TABLESAMPLE"));
});

test("wrapComposeSqlWithRandomSample with user sort outer only", () => {
  const sql = wrapComposeSqlWithRandomSample('SELECT id, volume FROM "t"', {
    sampleSize: 50,
    orderBy: [
      { alias: "volume", direction: "desc" },
      { alias: "id", direction: "asc" },
    ],
  });
  assert.ok(sql.includes("__lychee_sampled"));
  assert.match(sql, /ORDER BY "volume" DESC, "id" ASC$/);
  const eligibleIdx = sql.indexOf("__lychee_eligible");
  const sampledIdx = sql.indexOf("__lychee_sampled");
  const randomIdx = sql.indexOf("ORDER BY random()");
  const userOrderIdx = sql.lastIndexOf('ORDER BY "volume"');
  assert.ok(eligibleIdx < randomIdx);
  assert.ok(randomIdx < sampledIdx);
  assert.ok(sampledIdx < userOrderIdx);
  assert.equal(sql.includes("TABLESAMPLE"), false);
});
