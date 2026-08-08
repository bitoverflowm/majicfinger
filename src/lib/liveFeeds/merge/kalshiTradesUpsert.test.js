import { describe, expect, it } from "vitest";
import {
  applyKalshiTradesUpsertToSheets,
  maxTradeCreatedTs,
  sheetDataLooksLikeTrades,
  upsertTradeRowsByTradeId,
} from "./kalshiTradesUpsert.js";

describe("kalshiTradesUpsert", () => {
  it("upserts by trade_id and keeps newest softRowCap", () => {
    const existing = [
      { trade_id: "a", created_time: 1_000, yes_price_dollars: 0.4 },
      { trade_id: "b", created_time: 2_000, yes_price_dollars: 0.5 },
    ];
    const incoming = [
      { trade_id: "b", created_time: 2_000, yes_price_dollars: 0.55 },
      { trade_id: "c", created_time: 3_000, yes_price_dollars: 0.6 },
    ];
    const merged = upsertTradeRowsByTradeId(existing, incoming, { softRowCap: 50_000 });
    expect(merged.map((r) => r.trade_id)).toEqual(["a", "b", "c"]);
    expect(merged.find((r) => r.trade_id === "b")?.yes_price_dollars).toBe(0.55);
  });

  it("drops oldest rows when over soft cap", () => {
    const existing = [
      { trade_id: "1", created_time: 100 },
      { trade_id: "2", created_time: 200 },
      { trade_id: "3", created_time: 300 },
    ];
    const merged = upsertTradeRowsByTradeId(existing, [{ trade_id: "4", created_time: 400 }], {
      softRowCap: 3,
    });
    expect(merged.map((r) => r.trade_id)).toEqual(["2", "3", "4"]);
  });

  it("does not wipe filled cells with null", () => {
    const existing = [{ trade_id: "a", created_time: 1000, yes_price_dollars: 0.4, count_fp: 10 }];
    const incoming = [{ trade_id: "a", created_time: 1000, yes_price_dollars: null, count_fp: 12 }];
    const merged = upsertTradeRowsByTradeId(existing, incoming);
    expect(merged[0].yes_price_dollars).toBe(0.4);
    expect(merged[0].count_fp).toBe(12);
  });

  it("maxTradeCreatedTs reads ms or sec", () => {
    expect(maxTradeCreatedTs([{ created_time: 1_700_000_000_000 }])).toBe(1_700_000_000);
    expect(maxTradeCreatedTs([{ created_time: 1_700_000_000 }])).toBe(1_700_000_000);
  });

  it("sheetDataLooksLikeTrades detects trade_id", () => {
    expect(sheetDataLooksLikeTrades([{ trade_id: "x", created_time: 1 }])).toBe(true);
    expect(sheetDataLooksLikeTrades([{ end_period_ts: 1 }])).toBe(false);
  });

  it("applyKalshiTradesUpsertToSheets patches matching ticker sheets only", () => {
    const dataSheets = {
      "sheet-1": {
        name: "KX-A",
        data: [{ trade_id: "a", created_time: 1000, yes_price_dollars: 0.4 }],
        provenance: { source: "kalshi-live", endpoint: "trades", marketTicker: "KX-A" },
      },
      "sheet-other": {
        name: "other",
        data: [{ trade_id: "z", created_time: 1 }],
      },
    };
    const feed = {
      sheets: { marketSheetIdsByTicker: { "KX-A": "sheet-1" } },
    };
    const { dataSheets: next, stats } = applyKalshiTradesUpsertToSheets(dataSheets, feed, {
      byMarket: [
        {
          ticker: "KX-A",
          rows: [{ trade_id: "b", created_time: 2000, yes_price_dollars: 0.5 }],
        },
        { ticker: "KX-MISSING", rows: [{ trade_id: "m", created_time: 3 }] },
      ],
    });
    expect(stats.tradesAdded).toBe(1);
    expect(stats.marketsMatched).toBe(1);
    expect(stats.marketsUnmatched).toBe(1);
    expect(next["sheet-1"].data.map((r) => r.trade_id)).toEqual(["a", "b"]);
    expect(next["sheet-other"].data).toEqual([{ trade_id: "z", created_time: 1 }]);
  });
});
