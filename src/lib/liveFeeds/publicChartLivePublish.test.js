import assert from "node:assert/strict";
import {
  buildChartLivePublishConfig,
  resolveChartLiveEligibility,
  sanitizeChartLivePublish,
} from "@/lib/liveFeeds/chartLivePublishConfig.js";
import { applyLiveOverlay } from "@/lib/liveFeeds/applyLiveOverlay.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

function candleSheet(ticker, eventTicker = "KXEVENT") {
  return {
    name: ticker,
    data: [{ end_period_ts: 1, price_close: 0.5 }],
    provenance: {
      source: "kalshi-live",
      endpoint: "event_candlesticks",
      sheetKind: "market_candlesticks",
      marketTicker: ticker,
      eventTicker,
      seriesTicker: "KXSERIES",
      whereFilters: [{ column: "period_interval", op: "eq", value: 1 }],
    },
  };
}

test("sanitizes live_publish configs", () => {
  assert.equal(sanitizeChartLivePublish(null), null);
  const ok = sanitizeChartLivePublish({
    integration: "kalshi-live",
    endpoint: "event_candlesticks",
    pollIntervalMs: 60_000,
    overlayKind: "candlestick_ohlc",
    params: {
      eventTicker: "KXE",
      seriesTicker: "KXS",
      periodInterval: 1,
      marketTickers: ["A"],
      sheetIds: ["sheet-2"],
    },
  });
  assert.equal(ok?.endpoint, "event_candlesticks");
  assert.deepEqual(ok?.params.marketTickers, ["A"]);
});

test("is eligible for any chart type on a live candle sheet", () => {
  const dataSheets = {
    "sheet-meta": {
      name: "markets",
      data: [],
      provenance: {
        source: "kalshi-live",
        endpoint: "event_candlesticks",
        sheetKind: "markets_metadata",
        eventTicker: "KXEVENT",
        seriesTicker: "KXSERIES",
      },
    },
    "sheet-2": candleSheet("KX-A"),
  };
  const lineSnap = {
    v: 1,
    selChartType: "line",
    selX: "sheet-2::end_period_ts",
    selY: ["sheet-2::price_close"],
  };
  const eligibility = resolveChartLiveEligibility({
    snapshot: lineSnap,
    dataSheets,
  });
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.config?.endpoint, "event_candlesticks");
  assert.deepEqual(eligibility.config?.params.marketTickers, ["KX-A"]);
  assert.equal(eligibility.config?.overlayKind, "sheet_rows");
});

test("uses candlestick_ohlc overlay for candlestick charts", () => {
  const dataSheets = {
    "sheet-meta": {
      name: "markets",
      data: [],
      provenance: {
        source: "kalshi-live",
        endpoint: "event_candlesticks",
        sheetKind: "markets_metadata",
        eventTicker: "KXEVENT",
        seriesTicker: "KXSERIES",
      },
    },
    "sheet-2": candleSheet("KX-A"),
  };
  const cfg = buildChartLivePublishConfig({
    snapshot: {
      v: 1,
      selChartType: "candlestick",
      candlestickSheetId: "sheet-2",
    },
    dataSheets,
  });
  assert.equal(cfg?.overlayKind, "candlestick_ohlc");
});

test("applies sheet_rows overlay", () => {
  const base = {
    chart: { chart_name: "T" },
    rows: [],
    dataSheets: {
      "sheet-2": { name: "KX-A", data: [{ end_period_ts: 1, price_close: 0.1 }] },
    },
  };
  const next = applyLiveOverlay(base, {
    overlayKind: "sheet_rows",
    params: { periodInterval: 1 },
    sheets: {
      "sheet-2": [
        { end_period_ts: 1, price_close: 0.2 },
        { end_period_ts: 2, price_close: 0.3 },
      ],
    },
  });
  assert.equal(next?.dataSheets?.["sheet-2"]?.data?.length, 2);
});
