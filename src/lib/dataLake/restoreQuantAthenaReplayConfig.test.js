import assert from "node:assert/strict";
import { restoreQuantAthenaReplayConfig } from "./restoreQuantAthenaReplayConfig.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("restoreQuantAthenaReplayConfig infers metrics and end column from preview sheet", () => {
  const { join, quant } = restoreQuantAthenaReplayConfig({
    sheet: {
      data: [
        {
          ticker: "APPLECAR-24DEC31",
          lifecycle_checkpoint: 0.25,
          selected_close_time: "2024-12-31T23:14:00.000Z",
          selected_kalshi_taxonomy_category: "Politics",
          selected_volume: 14899,
        },
      ],
    },
    operation: {
      join: { lake: "kalshi", table: "trades", leftKeyColumn: "ticker", rightKeyColumn: "ticker" },
      quant: { groupColumn: "ticker", progressColumn: "created_time" },
    },
    dataSheets: {
      "sheet-1": {
        columns: ["ticker", "title", "volume", "close_time", "open_time"],
      },
    },
    rootSheetId: "sheet-1",
  });

  assert.ok(quant.metricColumns.includes("close_time"));
  assert.ok(quant.metricColumns.includes("volume"));
  assert.equal(quant.endRule, "column");
  assert.equal(quant.endColumn, "close_time");
  assert.equal(quant.snapshotRule, "latest_before");
  assert.ok(join.columns.includes("created_time"));
  assert.ok(!join.columns.includes("kalshi_taxonomy_category"));
  assert.ok(quant.metricColumns.includes("kalshi_taxonomy_category"));
  assert.deepEqual(quant.checkpoints, [0.25]);
});
