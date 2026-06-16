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
      selected_progress_value: "1.698166002975065E9",
      selected_close_time: "1.73570754E18",
    },
  ]);
  assert.equal(row.lifecycle_checkpoint, 0.5);
  assert.match(String(row.selected_progress_value), /^\d{4}-\d{2}-\d{2}T/);
  assert.match(String(row.selected_close_time), /^\d{4}-\d{2}-\d{2}T/);
});
