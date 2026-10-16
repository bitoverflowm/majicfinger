import assert from "node:assert/strict";
import { createRunSheetStage } from "./runSheetStage.js";

const instant = () => Promise.resolve();

function recorder(opensChart = () => false) {
  const calls = [];
  const stage = createRunSheetStage({
    reveal: (sheets, options = {}) => calls.push({ ids: sheets.map((sheet) => sheet.id), ...options }),
    opensChart,
    frame: instant,
    wait: instant,
  });
  return { stage, calls };
}

{
  const { stage, calls } = recorder();
  stage.put({ id: "markets" });
  await stage.settle();
  assert.deepEqual(calls, [{ ids: ["markets"] }], "a sheet is placed as soon as it is added");
  stage.put({ id: "trades-a" });
  stage.put({ id: "trades-b" });
  await stage.settle();
  assert.deepEqual(
    calls.map((call) => call.ids),
    [["markets"], ["markets", "trades-a"], ["markets", "trades-a", "trades-b"]],
    "every reveal carries the sheets placed before it",
  );
}

{
  const { stage, calls } = recorder(() => true);
  stage.put({ id: "markets" });
  await stage.settle();
  assert.deepEqual(
    calls,
    [
      { ids: ["markets"], holdChartsFor: "markets" },
      { ids: ["markets"], spotlightChartsFor: "markets" },
    ],
    "a sheet with a chart holds the chart, then spotlights it",
  );
}

{
  const { stage, calls } = recorder(() => true);
  stage.put({ id: "a" });
  stage.put({ id: "b" });
  stage.put({ id: "c" });
  await stage.settle();
  assert.deepEqual(
    calls,
    [{ ids: ["a"] }, { ids: ["a", "b"] }, { ids: ["a", "b", "c"], holdChartsFor: "c" }, { ids: ["a", "b", "c"], spotlightChartsFor: "c" }],
    "queued sheets skip the pause; the last one is spotlighted",
  );
}

{
  const { stage, calls } = recorder();
  stage.put({ id: "a", rows: [1] });
  stage.put({ id: "a", rows: [1, 2] });
  await stage.settle();
  assert.equal(stage.sheets.length, 1, "the same id replaces its sheet");
  assert.deepEqual(stage.sheets[0].rows, [1, 2]);
  assert.equal(calls.length, 2);
}

{
  let first = true;
  const calls = [];
  const stage = createRunSheetStage({
    reveal: (sheets) => {
      if (first) {
        first = false;
        throw new Error("draw failed");
      }
      calls.push(sheets.map((sheet) => sheet.id));
    },
    frame: instant,
    wait: instant,
  });
  stage.put({ id: "a" });
  stage.put({ id: "b" });
  await stage.settle();
  assert.deepEqual(calls, [["a", "b"]], "a failed reveal does not stop the next sheet");
}

console.log("runSheetStage tests passed");
