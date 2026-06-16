import assert from "node:assert/strict";
import { normalizeQuantAthenaRows } from "./normalizeQuantAthenaRows.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("normalizeQuantAthenaRows converts scientific epoch strings to ISO datetimes", () => {
  const [row] = normalizeQuantAthenaRows([
    {
      lifecycle_checkpoint: "0.5%",
      relative_position: "0.0",
      relative_position_pct: "0.0",
      selected_progress_value: "1.698166002975065E9",
      selected_close_time: "1.73570754E18",
      selected_volume: "14899.0",
    },
  ]);
  assert.equal(row.lifecycle_checkpoint, 0.5);
  assert.equal(row.relative_position, 0);
  assert.equal(row.relative_position_pct, 0);
  assert.equal(row.selected_volume, 14899);
  assert.ok(row.selected_progress_value instanceof Date);
  assert.ok(row.selected_close_time instanceof Date);
});
