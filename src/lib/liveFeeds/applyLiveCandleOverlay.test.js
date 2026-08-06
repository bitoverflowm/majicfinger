import { describe, expect, it } from "vitest";
import { applyLiveCandleOverlay } from "./applyLiveCandleOverlay.js";

const liveRows = [
  {
    market_ticker: "KXSENATEMID-26-AELS",
    end_period_ts: 1785825300,
    price_open_dollars: 0.981,
    price_high_dollars: 0.982,
    price_low_dollars: 0.981,
    price_close_dollars: 0.982,
    yes_bid_open_dollars: 0.981,
    yes_bid_high_dollars: 0.981,
    yes_bid_low_dollars: 0.981,
    yes_bid_close_dollars: 0.981,
    yes_ask_open_dollars: 0.982,
    yes_ask_high_dollars: 0.982,
    yes_ask_low_dollars: 0.982,
    yes_ask_close_dollars: 0.982,
  },
];

describe("applyLiveCandleOverlay", () => {
  it("synthesizes candlestick config when base is missing", () => {
    const out = applyLiveCandleOverlay(null, { sheetId: "sheet-4", rows: liveRows });
    expect(out).toBeTruthy();
    expect(out.chart.rechartsBuilder.selChartType).toBe("candlestick");
    expect(out.chart.rechartsBuilder.candlestickSheetId).toBe("sheet-4");
    expect(out.rows).toHaveLength(1);
    expect(out.dataSheets["sheet-4"].data).toHaveLength(1);
  });

  it("preserves real chart config when base already has candlestick settings", () => {
    const base = {
      chart: {
        chart_name: "Abdul El-Sayed",
        rechartsBuilder: {
          v: 1,
          selChartType: "candlestick",
          candlestickSheetId: "sheet-4",
          candlestickOhlcSetId: "auto",
        },
      },
      rows: [],
      dataSheets: { "sheet-4": { name: "AELS", data: [] } },
    };
    const out = applyLiveCandleOverlay(base, { sheetId: "sheet-4", rows: liveRows });
    expect(out.chart.chart_name).toBe("Abdul El-Sayed");
    expect(out.dataSheets["sheet-4"].data).toHaveLength(1);
  });

  it("upgrades SSR shell stubs into candlestick charts", () => {
    const stub = {
      chart: { chart_name: "Abdul El-Sayed — 98%" },
      rows: [],
      dataSheets: {},
    };
    const out = applyLiveCandleOverlay(stub, { sheetId: "sheet-4", rows: liveRows });
    expect(out.chart.chart_name).toBe("Abdul El-Sayed — 98%");
    expect(out.chart.rechartsBuilder.selChartType).toBe("candlestick");
    expect(out.rows).toHaveLength(1);
  });

  it("merges live rows into existing seeded history by end_period_ts", () => {
    const base = {
      chart: {
        chart_name: "Abdul El-Sayed",
        rechartsBuilder: {
          v: 1,
          selChartType: "candlestick",
          candlestickSheetId: "sheet-4",
        },
      },
      rows: [],
      dataSheets: {
        "sheet-4": {
          name: "AELS",
          data: [
            {
              market_ticker: "KXSENATEMID-26-AELS",
              end_period_ts: 1785825200,
              price_close_dollars: 0.97,
            },
          ],
        },
      },
    };
    const out = applyLiveCandleOverlay(base, {
      sheetId: "sheet-4",
      rows: liveRows,
      periodInterval: 1,
    });
    expect(out.dataSheets["sheet-4"].data).toHaveLength(2);
    expect(out.dataSheets["sheet-4"].data[0].end_period_ts).toBe(1785825200);
    expect(out.dataSheets["sheet-4"].data[1].end_period_ts).toBe(1785825300);
  });
});
