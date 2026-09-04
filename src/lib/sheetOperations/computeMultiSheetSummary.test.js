import assert from "node:assert/strict";
import {
  collectMultiSheetColumnUnion,
  computeMultiSheetSummary,
  createEmptyMultiSheetMetric,
  evaluateMultiSheetMetric,
  multiSheetSummaryFollowOnOperations,
  multiSheetSummarySyncFingerprint,
  normalizeMultiSheetSummaryConfig,
  recomputeAllMultiSheetSummarySheets,
  recomputeMultiSheetSummaryWithHistory,
  sheetsMissingColumn,
} from "./computeMultiSheetSummary.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

const sheets = {
  "s-100a": {
    name: "Sample 100 A",
    data: [
      { volume: 10 },
      { volume: 20 },
      { volume: 30 },
    ],
  },
  "s-100b": {
    name: "Sample 100 B",
    data: [{ volume: 5 }, { volume: 15 }],
  },
  "s-1k": {
    name: "Sample 1000",
    data: Array.from({ length: 5 }, (_, i) => ({ volume: (i + 1) * 100, other: i })),
  },
};

test("normalizeMultiSheetSummaryConfig dedupes sheets and normalizes metrics", () => {
  const cfg = normalizeMultiSheetSummaryConfig({
    sourceSheetIds: ["s-100a", "s-100a", "s-1k"],
    metrics: [
      { outputName: " sample size ", op: "count_rows" },
      { outputName: "mean", op: "mean", column: "volume" },
    ],
    resultSheetId: "out-1",
  });
  assert.deepEqual(cfg.sourceSheetIds, ["s-100a", "s-1k"]);
  assert.equal(cfg.metrics[0].op, "count_rows");
  assert.equal(cfg.metrics[0].column, null);
  assert.equal(cfg.metrics[0].outputName, "sample size");
  assert.equal(cfg.metrics[1].op, "mean");
  assert.equal(cfg.metrics[1].column, "volume");
  assert.equal(cfg.resultSheetId, "out-1");
});

test("evaluateMultiSheetMetric count_rows and avg", () => {
  assert.equal(evaluateMultiSheetMetric(sheets["s-100a"].data, { op: "count_rows" }), 3);
  assert.equal(evaluateMultiSheetMetric(sheets["s-100a"].data, { op: "avg", column: "volume" }), 20);
  assert.equal(evaluateMultiSheetMetric(sheets["s-100a"].data, { op: "stdev", column: "volume" }), Math.sqrt(
    ((10 - 20) ** 2 + (20 - 20) ** 2 + (30 - 20) ** 2) / 3,
  ));
});

test("computeMultiSheetSummary builds one row per sheet", () => {
  const { rows, columns, errors, metricColumns } = computeMultiSheetSummary(sheets, {
    sourceSheetIds: ["s-100a", "s-100b", "s-1k"],
    metrics: [
      { id: "m1", outputName: "sample size", op: "count_rows" },
      { id: "m2", outputName: "sample mean", op: "avg", column: "volume" },
      { id: "m3", outputName: "signed mean error", op: "stdev", column: "volume" },
    ],
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(metricColumns, ["sample size", "sample mean", "signed mean error"]);
  assert.deepEqual(columns.slice(0, 2), ["sheet", "source_sheet_id"]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].sheet, "Sample 100 A");
  assert.equal(rows[0].source_sheet_id, "s-100a");
  assert.equal(rows[0]["sample size"], 3);
  assert.equal(rows[0]["sample mean"], 20);
  assert.equal(rows[1]["sample size"], 2);
  assert.equal(rows[1]["sample mean"], 10);
  assert.equal(rows[2]["sample size"], 5);
});

test("computeMultiSheetSummary missing column yields null", () => {
  const { rows, errors } = computeMultiSheetSummary(sheets, {
    sourceSheetIds: ["s-100a"],
    metrics: [{ outputName: "x", op: "avg", column: "nope" }],
  });
  assert.deepEqual(errors, []);
  assert.equal(rows[0].x, null);
});

test("computeMultiSheetSummary errors on empty selection", () => {
  const { rows, errors } = computeMultiSheetSummary(sheets, {
    sourceSheetIds: [],
    metrics: [createEmptyMultiSheetMetric()],
  });
  assert.equal(rows.length, 0);
  assert.ok(errors.some((e) => /at least one sheet/i.test(e)));
});

test("collectMultiSheetColumnUnion and sheetsMissingColumn", () => {
  const union = collectMultiSheetColumnUnion(sheets, ["s-100a", "s-1k"]);
  assert.ok(union.includes("volume"));
  assert.ok(union.includes("other"));
  assert.deepEqual(sheetsMissingColumn(sheets, ["s-100a", "s-1k"], "other"), ["s-100a"]);
});

test("recomputeMultiSheetSummaryWithHistory replays computed.column follow-ons", () => {
  const cfg = {
    sourceSheetIds: ["s-100a", "s-1k"],
    metrics: [{ outputName: "Sample Mean", op: "avg", column: "volume" }],
    resultSheetId: "mss-1",
  };
  const sheet = {
    name: "Multi summary",
    multiSheetSummaryConfig: cfg,
    data: [],
    operationHistory: [
      { type: "summary.multi_sheet", id: "op-mss", multiSheetSummaryConfig: cfg },
      {
        type: "computed.column",
        id: "op-err",
        column: "Signed Mean Error",
        expression: {
          kind: "relative-row",
          op: "pct_growth",
          baseColumn: "Sample Mean",
          rowRef: "s-pop::mean_volume",
          rowRefKind: "fixed",
          referenceValFixed: true,
          fixedReferenceValue: 100000,
          asPercent: true,
        },
      },
    ],
  };
  const out = recomputeMultiSheetSummaryWithHistory(
    {
      ...sheets,
      "mss-1": sheet,
      "s-pop": { name: "pop", data: [{ mean_volume: 100000 }] },
    },
    "mss-1",
    sheet,
  );
  assert.ok(out);
  assert.equal(out.errors.length, 0);
  assert.equal(out.followOnOperations.length, 1);
  assert.equal(out.rows.length, 2);
  assert.ok(Object.prototype.hasOwnProperty.call(out.rows[0], "Signed Mean Error"));
  assert.equal(typeof out.rows[0]["Signed Mean Error"], "number");
  assert.ok(Number.isFinite(out.rows[0]["Signed Mean Error"]));
});

test("multiSheetSummaryFollowOnOperations skips base summary ops", () => {
  const follow = multiSheetSummaryFollowOnOperations([
    { type: "source.compose" },
    { type: "summary.multi_sheet" },
    { type: "computed.column", column: "x" },
  ]);
  assert.equal(follow.length, 1);
  assert.equal(follow[0].column, "x");
});

test("multiSheetSummarySyncFingerprint changes when follow-on ops change", () => {
  const rows = [{ source_sheet_id: "s-100a", "Sample Mean": 1 }];
  const a = multiSheetSummarySyncFingerprint(rows, ["Sample Mean"], []);
  const b = multiSheetSummarySyncFingerprint(rows, ["Sample Mean"], [
    { type: "computed.column", id: "1", column: "Signed Mean Error", ts: 1 },
  ]);
  assert.notEqual(a, b);
});

test("recomputeAllMultiSheetSummarySheets restores follow-on columns across workbook", () => {
  const cfg = {
    sourceSheetIds: ["s-100a"],
    metrics: [{ outputName: "Sample Mean", op: "avg", column: "volume" }],
    resultSheetId: "mss-1",
  };
  const workbook = {
    ...sheets,
    "mss-1": {
      name: "Multi summary",
      multiSheetSummaryConfig: cfg,
      data: [],
      operationHistory: [
        { type: "summary.multi_sheet", multiSheetSummaryConfig: cfg },
        {
          type: "computed.column",
          column: "Signed Mean Error",
          expression: {
            kind: "binary",
            op: "subtract",
            leftColumn: "Sample Mean",
            rightColumn: "Sample Mean",
            leftKind: "column",
            rightKind: "column",
          },
        },
      ],
    },
  };
  const next = recomputeAllMultiSheetSummarySheets(workbook);
  assert.equal(next["mss-1"].data.length, 1);
  assert.equal(next["mss-1"].data[0]["Sample Mean"], 20);
  assert.equal(next["mss-1"].data[0]["Signed Mean Error"], 0);
});
