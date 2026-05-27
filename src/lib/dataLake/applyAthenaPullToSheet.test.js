import { describe, it, expect } from "vitest";
import { applyAthenaPullToSheetPatch, athenaPollToSheetRows } from "./applyAthenaPullToSheet";

describe("athenaPollToSheetRows", () => {
  it("converts string[][] to objects", () => {
    const rows = athenaPollToSheetRows(["a", "b"], [["1", "2"], ["3", "4"]]);
    expect(rows).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("respects rowLimit", () => {
    const rows = athenaPollToSheetRows(["x"], [["1"], ["2"], ["3"]], { rowLimit: 2 });
    expect(rows).toHaveLength(2);
  });
});

describe("applyAthenaPullToSheetPatch", () => {
  it("sets data and snapshot in one update", () => {
    const prev = { "sheet-1": { name: "Sheet 1", data: [] } };
    const next = applyAthenaPullToSheetPatch(prev, "sheet-1", [{ col: "v" }], {
      provenance: { kind: "compose" },
    });
    expect(next["sheet-1"].data).toHaveLength(1);
    expect(next["sheet-1"].athenaPullSnapshot.rowCount).toBe(1);
    expect(next["sheet-1"].storageMode).toBe("inline");
    expect(next["sheet-1"].provenance).toEqual({ kind: "compose" });
  });
});
