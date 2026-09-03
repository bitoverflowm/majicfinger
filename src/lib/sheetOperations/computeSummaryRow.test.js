import assert from "node:assert/strict";
import {
  collectWorkspaceSummaryRefs,
  computeSummaryRow,
  evaluateSummaryMetric,
  formatSummaryMetricPreview,
  normalizeSummaryConfig,
  parseSummaryRefKey,
  summaryRefKey,
  summaryRefOutputName,
  summarySheetRefKey,
} from "./computeSummaryRow.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

const bandRows = [
  { Band: "volume = 0", Market_count: "2", Total_volume: "0" },
  { Band: "0 < volume < 10,000", Market_count: "12", Total_volume: "3456.7" },
  { Band: "volume ≥ 100,000,000", Market_count: "1", Total_volume: "150000000" },
];

test("bands example: SUM market_count and Total_volume", () => {
  const { row, columns, namedValues } = computeSummaryRow(bandRows, {
    destination: "this_view",
    metrics: [
      { id: "m1", outputName: "Total Market Count", op: "sum", scope: "column", columns: ["Market_count"] },
      { id: "m2", outputName: "Total Volume across Markets", op: "sum", scope: "column", columns: ["Total_volume"] },
    ],
  });
  assert.deepEqual(columns, ["Total Market Count", "Total Volume across Markets"]);
  assert.equal(row["Total Market Count"], 15);
  assert.equal(row["Total Volume across Markets"], 150003456.7);
  assert.equal(namedValues[summaryRefKey("Total Market Count")], 15);
});

test("where filter limits rows in aggregate", () => {
  const value = evaluateSummaryMetric(bandRows, {
    id: "m1",
    outputName: "Filtered",
    op: "sum",
    scope: "column",
    columns: ["Market_count"],
    where: {
      enabled: true,
      clauses: [
        {
          condition: {
            leftColumn: "Band",
            operator: "contains",
            rightKind: "raw",
            rightValue: "100,000,000",
          },
        },
      ],
    },
  });
  assert.equal(value, 1);
});

test("binary SUM(A)+SUM(B)", () => {
  const value = evaluateSummaryMetric(bandRows, {
    id: "m1",
    outputName: "Both",
    op: "binary",
    scope: "column",
    columns: ["Market_count", "Total_volume"],
    binary: {
      op: "add",
      left: { op: "sum", scope: "column", columns: ["Market_count"] },
      right: { op: "sum", scope: "column", columns: ["Total_volume"] },
    },
  });
  assert.equal(value, 15 + 150003456.7);
});

test("normalize + preview", () => {
  const cfg = normalizeSummaryConfig({
    destination: "new_sheet",
    metrics: [{ outputName: "Total Market Count", op: "sum", columns: ["Market_count"] }],
  });
  assert.equal(cfg.destination, "new_sheet");
  assert.equal(cfg.metrics[0].scope, "column");
  assert.equal(
    formatSummaryMetricPreview(cfg.metrics[0]),
    "Total Market Count = SUM(Market_count)",
  );
});

test("avg / min / max / stdev", () => {
  const rows = [{ n: 2 }, { n: 4 }, { n: 6 }];
  assert.equal(evaluateSummaryMetric(rows, { op: "avg", columns: ["n"], outputName: "a" }), 4);
  assert.equal(evaluateSummaryMetric(rows, { op: "min", columns: ["n"], outputName: "a" }), 2);
  assert.equal(evaluateSummaryMetric(rows, { op: "max", columns: ["n"], outputName: "a" }), 6);
  const sigma = evaluateSummaryMetric(rows, { op: "stdev", columns: ["n"], outputName: "a" });
  assert.ok(Math.abs(sigma - Math.sqrt(((2 - 4) ** 2 + (4 - 4) ** 2 + (6 - 4) ** 2) / 3)) < 1e-9);
});

test("parseSummaryRefKey distinguishes local and cross-sheet refs", () => {
  assert.deepEqual(parseSummaryRefKey(summaryRefKey("Total Volume")), {
    sheetId: null,
    outputName: "Total Volume",
  });
  assert.deepEqual(parseSummaryRefKey(summarySheetRefKey("sheet-7", "top_10_total_volume")), {
    sheetId: "sheet-7",
    outputName: "top_10_total_volume",
  });
  assert.equal(summaryRefOutputName(summarySheetRefKey("sheet-7", "top_10_total_volume")), "top_10_total_volume");
});

test("collectWorkspaceSummaryRefs includes other sheet this_view and linked summary sheets", () => {
  const { options, namedValues } = collectWorkspaceSummaryRefs({
    activeSheetId: "sheet-1",
    dataSheets: {
      "sheet-1": {
        name: "samples",
        data: [{ volume: 10 }, { volume: 20 }],
        summaryConfig: {
          destination: "this_view",
          metrics: [{ id: "m1", outputName: "sample_sum", op: "sum", scope: "column", columns: ["volume"] }],
        },
      },
      "sheet-2": {
        name: "full_population_summary",
        data: [{ volume: 100 }, { volume: 200 }],
        summaryConfig: {
          destination: "this_view",
          metrics: [{ id: "m1", outputName: "industry_volume", op: "sum", scope: "column", columns: ["volume"] }],
        },
      },
      "sheet-3": {
        name: "top_ten",
        data: [{ total_volume: 50 }],
        summaryConfig: {
          destination: "new_sheet",
          linkedSheetId: "sheet-4",
          metrics: [{ id: "m1", outputName: "top_10_total_volume", op: "sum", scope: "column", columns: ["total_volume"] }],
        },
      },
      "sheet-4": {
        name: "Summary · top_ten",
        sourceSheetId: "sheet-3",
        summaryRow: { top_10_total_volume: 50 },
        data: [{ top_10_total_volume: 50 }],
      },
    },
  });

  const local = options.find((o) => o.value === summaryRefKey("sample_sum"));
  assert.equal(local?.local, true);
  assert.equal(namedValues[summaryRefKey("sample_sum")], 30);

  const otherView = options.find((o) => o.value === summarySheetRefKey("sheet-2", "industry_volume"));
  assert.equal(otherView?.label, "Σ full_population_summary · industry_volume");
  assert.equal(namedValues[summarySheetRefKey("sheet-2", "industry_volume")], 300);

  const linked = options.find((o) => o.value === summarySheetRefKey("sheet-4", "top_10_total_volume"));
  assert.equal(linked?.label, "Σ Summary · top_ten · top_10_total_volume");
  assert.equal(namedValues[summarySheetRefKey("sheet-4", "top_10_total_volume")], 50);

  // Source sheet with new_sheet destination should not also list under the source id.
  assert.equal(
    options.some((o) => o.value === summarySheetRefKey("sheet-3", "top_10_total_volume")),
    false,
  );
});
