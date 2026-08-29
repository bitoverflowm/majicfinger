import assert from "node:assert/strict";
import {
  applyConnectHomeSheetNameToSheet,
  normalizeConnectHomePullDestination,
  prepareConnectHomePullSheet,
} from "./connectHomePullDestination.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("normalizeConnectHomePullDestination", () => {
  assert.equal(normalizeConnectHomePullDestination("new_sheet"), "new_sheet");
  assert.equal(normalizeConnectHomePullDestination("replace"), "replace");
  assert.equal(normalizeConnectHomePullDestination(null), "replace");
});

test("applyConnectHomeSheetNameToSheet prefers nameOverride over stale ctx", () => {
  let sheets = {
    "sheet-1": { name: "Sheet 1", data: [{ a: 1 }] },
  };
  const ctx = {
    activeSheetId: "sheet-1",
    connectHomePendingSheetName: "stale_name",
    setDataSheets: (updater) => {
      sheets = typeof updater === "function" ? updater(sheets) : updater;
    },
  };
  applyConnectHomeSheetNameToSheet(ctx, "sheet-1", "10000_0");
  assert.equal(sheets["sheet-1"].name, "10000_0");
});

test("prepareConnectHomePullSheet replace uses pendingSheetName option", () => {
  let sheets = {
    "sheet-1": { name: "Sheet 1", data: [{ a: 1 }] },
  };
  let replaced = null;
  const ctx = {
    activeSheetId: "sheet-1",
    dataSheets: sheets,
    connectedData: [{ a: 1 }],
    connectHomePullDestination: "replace",
    connectHomePendingSheetName: "",
    setDataSheets: (updater) => {
      sheets = typeof updater === "function" ? updater(sheets) : updater;
      ctx.dataSheets = sheets;
    },
    replaceCurrentSheetData: (data) => {
      replaced = data;
      sheets = {
        ...sheets,
        "sheet-1": { ...(sheets["sheet-1"] || {}), data: Array.isArray(data) ? data : [] },
      };
      ctx.dataSheets = sheets;
    },
  };
  const dest = prepareConnectHomePullSheet(ctx, { pendingSheetName: "10000_0" });
  assert.equal(dest.action, "replace");
  assert.equal(sheets["sheet-1"].name, "10000_0");
  assert.deepEqual(replaced, []);
});
