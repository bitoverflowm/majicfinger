import { describe, expect, it } from "vitest";
import {
  mergeLiveSheetRowPreserve,
  normalizeLiveEndPeriodTs,
  shouldApplyLiveCell,
  upsertCandlestickRowsByEndPeriodTs,
} from "./kalshiCandlestickUpsert.js";

describe("kalshiCandlestickUpsert null-safe merge", () => {
  it("does not let null incoming wipe filled OHLC", () => {
    const existing = {
      market_ticker: "KX-A",
      end_period_ts: 100,
      price_open_dollars: 0.5,
      price_close_dollars: 0.55,
      yes_bid_close_dollars: 0.54,
    };
    const incoming = {
      market_ticker: "KX-A",
      end_period_ts: 100,
      price_open_dollars: null,
      price_close_dollars: null,
      yes_bid_close_dollars: 0.56,
      volume_fp: 0,
    };
    const merged = mergeLiveSheetRowPreserve(existing, incoming);
    expect(merged.price_open_dollars).toBe(0.5);
    expect(merged.price_close_dollars).toBe(0.55);
    expect(merged.yes_bid_close_dollars).toBe(0.56);
    expect(merged.volume_fp).toBe(0);
  });

  it("shouldApplyLiveCell rejects null over real values", () => {
    expect(shouldApplyLiveCell(null, 0.9)).toBe(false);
    expect(shouldApplyLiveCell(null, null)).toBe(true);
    expect(shouldApplyLiveCell(0.91, 0.9)).toBe(true);
    expect(shouldApplyLiveCell("", 0.9)).toBe(false);
  });

  it("normalizes Date / ms end_period_ts to unix seconds", () => {
    expect(normalizeLiveEndPeriodTs(1_785_522_060)).toBe(1_785_522_060);
    expect(normalizeLiveEndPeriodTs(1_785_522_060_000)).toBe(1_785_522_060);
    expect(normalizeLiveEndPeriodTs(new Date(1_785_522_060 * 1000))).toBe(1_785_522_060);
  });

  it("upsert preserves prior OHLC and never trims below prior row count", () => {
    const existing = [
      {
        market_ticker: "KX-A",
        end_period_ts: 100,
        price_close_dollars: 0.4,
        yes_bid_close_dollars: 0.39,
      },
      {
        market_ticker: "KX-A",
        end_period_ts: 160,
        price_close_dollars: 0.5,
        yes_bid_close_dollars: 0.49,
      },
    ];
    const incoming = [
      {
        market_ticker: "KX-A",
        end_period_ts: 160,
        price_close_dollars: null,
        yes_bid_close_dollars: 0.51,
      },
      {
        market_ticker: "KX-A",
        end_period_ts: 220,
        price_close_dollars: 0.6,
        yes_bid_close_dollars: 0.59,
      },
    ];
    const rows = upsertCandlestickRowsByEndPeriodTs(existing, incoming, { softRowCap: 2 });
    // priorCount=2 >= softRowCap → do not trim; keep all 3
    expect(rows).toHaveLength(3);
    expect(rows[1].price_close_dollars).toBe(0.5);
    expect(rows[1].yes_bid_close_dollars).toBe(0.51);
    expect(rows[2].end_period_ts).toBe(220);
  });
});
