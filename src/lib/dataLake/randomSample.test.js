import assert from "node:assert/strict";
import {
  normalizeRandomSampleConfig,
  parseRandomSampleSize,
  sanitizeComposeForRandomSample,
  validateRandomSampleSizeInput,
  wrapComposeSqlWithRandomSample,
  withFreshRandomSampleSeed,
  injectMissingRandomSampleSeeds,
  generateRandomSampleSeed,
  RANDOM_SAMPLE_ABSOLUTE_MAX,
  RANDOM_SAMPLE_MODE_SEEDED,
  RANDOM_SAMPLE_MODE_UNSEEDED,
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

test("normalizeRandomSampleConfig modes", () => {
  assert.equal(normalizeRandomSampleConfig({ enabled: false, size: 10 }), null);
  assert.deepEqual(normalizeRandomSampleConfig({ enabled: true, size: 10 }), {
    size: 10,
    mode: RANDOM_SAMPLE_MODE_UNSEEDED,
  });
  assert.deepEqual(normalizeRandomSampleConfig({ size: 7 }), {
    size: 7,
    mode: RANDOM_SAMPLE_MODE_UNSEEDED,
  });
  assert.deepEqual(
    normalizeRandomSampleConfig({ enabled: true, size: 10, mode: "seeded", seed: "s_abc123" }),
    { size: 10, mode: RANDOM_SAMPLE_MODE_SEEDED, seed: "s_abc123" },
  );
  assert.deepEqual(
    normalizeRandomSampleConfig({ size: 5, seed: "s_legacy" }),
    { size: 5, mode: RANDOM_SAMPLE_MODE_SEEDED, seed: "s_legacy" },
  );
});

test("sanitizeComposeForRandomSample drops limitScope and persists mode", () => {
  const out = sanitizeComposeForRandomSample(
    { select: [], orderBy: [], limitScope: "primary" },
    { size: 12, mode: "unseeded" },
  );
  assert.equal(out.limitScope, undefined);
  assert.deepEqual(out.randomSample, {
    enabled: true,
    size: 12,
    mode: RANDOM_SAMPLE_MODE_UNSEEDED,
  });

  const seeded = sanitizeComposeForRandomSample(
    { select: [] },
    { size: 8, mode: "seeded", seed: "s_fixedseed01" },
  );
  assert.deepEqual(seeded.randomSample, {
    enabled: true,
    size: 8,
    mode: RANDOM_SAMPLE_MODE_SEEDED,
    seed: "s_fixedseed01",
  });
});

test("wrapComposeSqlWithRandomSample without user sort (unseeded)", () => {
  const sql = wrapComposeSqlWithRandomSample('SELECT id FROM "t"', { sampleSize: 100 });
  assert.ok(sql.includes('AS "__lychee_eligible"'));
  assert.ok(sql.includes("ORDER BY random()"));
  assert.ok(sql.includes("LIMIT 100"));
  assert.ok(!sql.includes("__lychee_sampled"));
  assert.ok(!sql.includes("TABLESAMPLE"));
});

test("wrapComposeSqlWithRandomSample seeded uses xxhash64", () => {
  const sql = wrapComposeSqlWithRandomSample('SELECT id, volume FROM "t"', {
    sampleSize: 50,
    mode: "seeded",
    seed: "s_testseed",
    sampleKeyAliases: ["id", "volume"],
  });
  assert.ok(sql.includes("xxhash64"));
  assert.ok(sql.includes("s_testseed"));
  assert.ok(sql.includes('cast("id" as varchar)'));
  assert.ok(sql.includes("LIMIT 50"));
  assert.ok(!sql.includes("ORDER BY random()"));
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

test("withFreshRandomSampleSeed only rotates seeded recipes", () => {
  const seeded = {
    kind: "compose",
    composeSpec: {
      randomSample: { enabled: true, size: 100, mode: "seeded", seed: "s_old" },
    },
  };
  const next = withFreshRandomSampleSeed(seeded);
  assert.notEqual(next.composeSpec.randomSample.seed, "s_old");
  assert.equal(next.composeSpec.randomSample.mode, "seeded");
  assert.equal(next.composeSpec.randomSample.size, 100);

  const unseeded = {
    kind: "compose",
    composeSpec: { randomSample: { enabled: true, size: 100, mode: "unseeded" } },
  };
  assert.equal(withFreshRandomSampleSeed(unseeded), unseeded);
});

test("injectMissingRandomSampleSeeds clears data and stamps seed", () => {
  const sheets = {
    a: {
      name: "1000_0",
      data: [{ id: 1 }],
      provenance: {
        kind: "compose",
        composeSpec: { randomSample: { size: 1000 } },
      },
      fullRowCount: 1000,
    },
    b: {
      name: "other",
      data: [{ id: 2 }],
      provenance: {
        kind: "compose",
        composeSpec: { randomSample: { size: 50, mode: "unseeded" } },
      },
    },
  };
  const { sheets: out, changedIds } = injectMissingRandomSampleSeeds(sheets, {
    sheetNameAllowlist: ["1000_0"],
  });
  assert.deepEqual(changedIds, ["a"]);
  assert.equal(out.a.data.length, 0);
  assert.equal(out.a.rehydrationStatus, "pending");
  assert.equal(out.a.provenance.composeSpec.randomSample.mode, "seeded");
  assert.ok(out.a.provenance.composeSpec.randomSample.seed);
  assert.equal(out.b.provenance.composeSpec.randomSample.mode, "unseeded");
  assert.equal(out.b.data.length, 1);
});

test("generateRandomSampleSeed is sql-safe", () => {
  const seed = generateRandomSampleSeed();
  assert.match(seed, /^s_[a-zA-Z0-9_-]+$/);
});
