import { describe, expect, it } from "vitest";
import {
  maxEndPeriodTsForFeedSheets,
  maxEndPeriodTsInRows,
  resolveCandlestickBackfillStartTs,
} from "./candlestickBackfill.js";

describe("candlestickBackfill", () => {
  it("reads max end_period_ts from rows (including Date/ms)", () => {
    expect(
      maxEndPeriodTsInRows([
        { end_period_ts: 100 },
        { end_period_ts: 160 },
        { end_period_ts: 1_785_522_060_000 }, // ms
        { end_period_ts: new Date(1_785_400_000 * 1000) },
      ]),
    ).toBe(1_785_522_060);
  });

  it("reads max across feed market sheets only", () => {
    const dataSheets = {
      "sheet-meta": { data: [{ end_period_ts: 999 }] },
      "sheet-a": { data: [{ end_period_ts: 100 }, { end_period_ts: 200 }] },
      "sheet-b": { data: [{ end_period_ts: 250 }] },
    };
    const feed = {
      sheets: {
        marketsMetadataSheetId: "sheet-meta",
        marketSheetIdsByTicker: { "KX-A": "sheet-a", "KX-B": "sheet-b" },
      },
    };
    expect(maxEndPeriodTsForFeedSheets(dataSheets, feed)).toBe(250);
  });

  it("resolves backfill start from sheet cutoff with one-period overlap", () => {
    const dataSheets = {
      "sheet-a": { data: [{ end_period_ts: 1_000_000 }] },
    };
    const feed = {
      params: { periodInterval: 1 },
      sheets: { marketSheetIdsByTicker: { "KX-A": "sheet-a" } },
    };
    const startTs = resolveCandlestickBackfillStartTs({
      dataSheets,
      feed,
      endTs: 1_000_600,
      softRowCap: 50_000,
      overlapPeriods: 1,
    });
    // 1m period → 60s overlap
    expect(startTs).toBe(1_000_000 - 60);
  });

  it("clamps backfill window to softRowCap periods from endTs", () => {
    const dataSheets = {
      "sheet-a": { data: [{ end_period_ts: 1_000 }] },
    };
    const feed = {
      params: { periodInterval: 1 },
      sheets: { marketSheetIdsByTicker: { "KX-A": "sheet-a" } },
    };
    const endTs = 1_000_000;
    const softRowCap = 100;
    const startTs = resolveCandlestickBackfillStartTs({
      dataSheets,
      feed,
      endTs,
      softRowCap,
      overlapPeriods: 1,
    });
    expect(startTs).toBe(endTs - softRowCap * 60);
  });

  it("returns null when sheets have no candle history", () => {
    expect(
      resolveCandlestickBackfillStartTs({
        dataSheets: { "sheet-a": { data: [] } },
        feed: {
          params: { periodInterval: 1 },
          sheets: { marketSheetIdsByTicker: { "KX-A": "sheet-a" } },
        },
        endTs: 1_000_000,
      }),
    ).toBeNull();
  });
});
