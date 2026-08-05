import { describe, expect, it } from "vitest";
import {
  applyKalshiCandlestickUpsertToSheets,
  mergeLiveSheetRowPreserve,
  normalizeLiveEndPeriodTs,
  sheetDataLooksLikeCandlesticks,
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

  it("upsert trims oldest rows when over softRowCap so newest history wins", () => {
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
    expect(rows).toHaveLength(2);
    expect(rows[0].end_period_ts).toBe(160);
    expect(rows[0].price_close_dollars).toBe(0.5);
    expect(rows[0].yes_bid_close_dollars).toBe(0.51);
    expect(rows[1].end_period_ts).toBe(220);
  });

  it("drops oldest history when backfill would exceed the working window", () => {
    const existing = Array.from({ length: 5 }, (_, i) => ({
      market_ticker: "KX-A",
      end_period_ts: 100 + i * 60,
      price_close_dollars: 0.1 + i * 0.01,
    }));
    const incoming = Array.from({ length: 3 }, (_, i) => ({
      market_ticker: "KX-A",
      end_period_ts: 400 + i * 60,
      price_close_dollars: 0.9 + i * 0.01,
    }));
    // 5 existing (100..340) + 3 new (400..520) = 8 → keep newest 5
    const rows = upsertCandlestickRowsByEndPeriodTs(existing, incoming, { softRowCap: 5 });
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.end_period_ts)).toEqual([280, 340, 400, 460, 520]);
  });

  it("never writes candles onto the markets metadata sheet id", () => {
    const dataSheets = {
      "sheet-1": {
        name: "EVT · markets",
        provenance: { sheetKind: "markets_metadata", source: "kalshi-live", endpoint: "event_candlesticks" },
        data: [{ ticker: "KX-A", yes_sub_title: "range", last_price_dollars: "0.20" }],
      },
      "sheet-2": {
        name: "KX-A",
        provenance: {
          sheetKind: "market_candlesticks",
          marketTicker: "KX-A",
          source: "kalshi-live",
          endpoint: "event_candlesticks",
        },
        data: [],
      },
    };
    const feed = {
      sheets: {
        marketsMetadataSheetId: "sheet-1",
        // Collision: ticker wrongly points at markets sheet
        marketSheetIdsByTicker: { "KX-A": "sheet-1" },
      },
    };
    const tick = {
      metaRows: [{ ticker: "KX-A", yes_sub_title: "range", last_price_dollars: "0.22" }],
      byMarket: [
        {
          ticker: "KX-A",
          rows: [
            {
              market_ticker: "KX-A",
              end_period_ts: 100,
              yes_bid_open_dollars: 0.1,
              yes_bid_high_dollars: 0.2,
              yes_bid_low_dollars: 0.05,
              yes_bid_close_dollars: 0.15,
            },
          ],
        },
      ],
    };
    const { dataSheets: next, stats } = applyKalshiCandlestickUpsertToSheets(dataSheets, feed, tick);
    expect(stats.marketsMatched).toBe(0);
    expect(stats.marketsUnmatched).toBe(1);
    expect(next["sheet-1"].data[0].ticker).toBe("KX-A");
    expect(next["sheet-1"].data[0].yes_sub_title).toBe("range");
    expect(next["sheet-1"].data[0].end_period_ts).toBeUndefined();
    expect(next["sheet-1"].name).toBe("EVT · markets");
  });

  it("heals a markets sheet that was previously overwritten with OHLC", () => {
    expect(
      sheetDataLooksLikeCandlesticks([
        { market_ticker: "KX-A", end_period_ts: 100, yes_bid_close_dollars: 0.2 },
      ]),
    ).toBe(true);

    const dataSheets = {
      "sheet-1": {
        name: "EVT · markets",
        provenance: { sheetKind: "markets_metadata" },
        data: [{ market_ticker: "KX-A", end_period_ts: 100, yes_bid_close_dollars: 0.2 }],
      },
      "sheet-2": {
        name: "KX-A",
        provenance: { sheetKind: "market_candlesticks", marketTicker: "KX-A" },
        data: [],
      },
    };
    const feed = {
      sheets: {
        marketsMetadataSheetId: "sheet-1",
        marketSheetIdsByTicker: { "KX-A": "sheet-2" },
      },
    };
    const tick = {
      metaRows: [{ ticker: "KX-A", yes_sub_title: "range", last_price_dollars: "0.22" }],
      byMarket: [
        {
          ticker: "KX-A",
          rows: [{ market_ticker: "KX-A", end_period_ts: 120, yes_bid_close_dollars: 0.25 }],
        },
      ],
    };
    const { dataSheets: next } = applyKalshiCandlestickUpsertToSheets(dataSheets, feed, tick);
    expect(next["sheet-1"].data).toHaveLength(1);
    expect(next["sheet-1"].data[0].ticker).toBe("KX-A");
    expect(next["sheet-1"].data[0].yes_sub_title).toBe("range");
    expect(next["sheet-2"].data[0].end_period_ts).toBe(120);
  });

  it("coerces market meta dollar strings so number cells stay valid", () => {
    const dataSheets = {
      "sheet-1": {
        name: "EVT · markets",
        provenance: {
          sheetKind: "markets_metadata",
          source: "kalshi-live",
          endpoint: "event_candlesticks",
        },
        data: [
          {
            ticker: "KX-A",
            yes_bid_dollars: 0.5,
            last_price_dollars: 0.5,
            updated_time: new Date("2026-08-05T04:00:00.000Z"),
          },
        ],
      },
    };
    const feed = {
      sheets: {
        marketsMetadataSheetId: "sheet-1",
        marketSheetIdsByTicker: {},
      },
    };
    const tick = {
      metaRows: [
        {
          ticker: "KX-A",
          yes_bid_dollars: "0.5300",
          yes_ask_dollars: "0.5500",
          last_price_dollars: "0.5300",
          notional_value_dollars: "1.0000",
          previous_yes_bid_dollars: "0.0000",
          updated_time: "2026-08-05T04:20:57.664296Z",
          latest_expiration_time: "2026-08-19T03:00:00Z",
        },
      ],
      byMarket: [],
    };
    const { dataSheets: next } = applyKalshiCandlestickUpsertToSheets(dataSheets, feed, tick);
    const row = next["sheet-1"].data[0];
    expect(row.yes_bid_dollars).toBe(0.53);
    expect(row.yes_ask_dollars).toBe(0.55);
    expect(row.last_price_dollars).toBe(0.53);
    expect(row.notional_value_dollars).toBe(1);
    expect(row.previous_yes_bid_dollars).toBe(0);
    expect(row.updated_time).toBeInstanceOf(Date);
    expect(row.latest_expiration_time).toBeInstanceOf(Date);
  });
});
