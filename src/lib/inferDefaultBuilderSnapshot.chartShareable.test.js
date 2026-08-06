import { describe, expect, it } from "vitest";
import {
  chartSheetIsShareable,
  isPlaceholderChartSheet,
  isPlottableBuilderSnapshot,
} from "./inferDefaultBuilderSnapshot";

describe("isPlottableBuilderSnapshot", () => {
  it("rejects empty or default snapshots", () => {
    expect(isPlottableBuilderSnapshot(null)).toBe(false);
    expect(isPlottableBuilderSnapshot({ v: 1, selChartType: "area", selY: [] })).toBe(false);
    expect(isPlottableBuilderSnapshot({ v: 1, selX: "t", selY: [] })).toBe(false);
  });

  it("accepts X + Y or candlestick", () => {
    expect(isPlottableBuilderSnapshot({ v: 1, selX: "t", selY: ["price"] })).toBe(true);
    expect(isPlottableBuilderSnapshot({ v: 1, selChartType: "candlestick" })).toBe(true);
  });
});

describe("chartSheetIsShareable / isPlaceholderChartSheet", () => {
  it("does not treat default Chart 1 as shareable", () => {
    const sheet = { name: "Chart 1", snapshot: null, chartMeta: null, userCreated: false };
    expect(chartSheetIsShareable(sheet)).toBe(false);
    expect(isPlaceholderChartSheet(sheet, 0)).toBe(true);
  });

  it("treats a plottable canvas snapshot as shareable", () => {
    const sheet = {
      name: "Chart 1",
      userCreated: false,
      chartMeta: null,
      snapshot: { v: 1, selX: "end_period_ts", selY: ["price"] },
    };
    expect(chartSheetIsShareable(sheet)).toBe(true);
    expect(isPlaceholderChartSheet(sheet, 0)).toBe(false);
  });

  it("treats +Chart (userCreated) as shareable", () => {
    const sheet = { name: "Chart 2", snapshot: null, chartMeta: null, userCreated: true };
    expect(chartSheetIsShareable(sheet)).toBe(true);
    expect(isPlaceholderChartSheet(sheet, 1)).toBe(false);
  });
});
