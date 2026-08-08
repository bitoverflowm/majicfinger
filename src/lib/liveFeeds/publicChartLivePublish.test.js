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

test("empty candlestickSheetId scopes live publish to the primary sheet only", () => {
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
    "sheet-1": candleSheet("KX-A"),
    "sheet-2": candleSheet("KX-B"),
  };
  const cfg = buildChartLivePublishConfig({
    snapshot: {
      v: 1,
      selChartType: "candlestick",
      candlestickSheetId: "",
    },
    dataSheets,
  });
  assert.equal(cfg?.endpoint, "event_candlesticks");
  assert.deepEqual(cfg?.params.marketTickers, ["KX-A"]);
  assert.equal(cfg?.params.sheetIds?.[0], "sheet-1");
});

test("preferredSheetId stamps the active market sheet for empty candle id", () => {
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
    "sheet-1": candleSheet("KX-A"),
    "sheet-2": candleSheet("KX-B"),
  };
  const cfg = buildChartLivePublishConfig({
    snapshot: {
      v: 1,
      selChartType: "candlestick",
      candlestickSheetId: "",
    },
    dataSheets,
    preferredSheetId: "sheet-2",
  });
  assert.deepEqual(cfg?.params.marketTickers, ["KX-B"]);
  assert.equal(cfg?.params.sheetIds?.[0], "sheet-2");
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

test("sanitizes trades live_publish and floors public poll at 15s", () => {
  const ok = sanitizeChartLivePublish({
    integration: "kalshi-live",
    endpoint: "trades",
    pollIntervalMs: 1_000,
    overlayKind: "sheet_rows",
    params: {
      marketTickers: ["KX-A"],
      sheetIds: ["sheet-t"],
      sheetIdByTicker: { "KX-A": "sheet-t" },
    },
  });
  assert.equal(ok?.endpoint, "trades");
  assert.equal(ok?.overlayKind, "sheet_rows");
  assert.ok((ok?.pollIntervalMs || 0) >= 15_000);
});

test("is eligible for line chart on a live trades sheet", () => {
  const dataSheets = {
    "sheet-t": {
      name: "KX-A",
      data: [{ trade_id: "1", created_time: 1_700_000_000_000, yes_price_dollars: 0.5 }],
      provenance: {
        source: "kalshi-live",
        endpoint: "trades",
        sheetKind: "market_trades",
        marketTicker: "KX-A",
      },
    },
  };
  const lineSnap = {
    v: 1,
    selChartType: "line",
    selX: "sheet-t::created_time",
    selY: ["sheet-t::yes_price_dollars"],
  };
  const eligibility = resolveChartLiveEligibility({
    snapshot: lineSnap,
    dataSheets,
  });
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.config?.endpoint, "trades");
  assert.equal(eligibility.config?.overlayKind, "sheet_rows");
});

test("merges trades overlay by trade_id without full replace", () => {
  const base = {
    chart: { chart_name: "T" },
    rows: [],
    dataSheets: {
      "sheet-t": {
        name: "KX-A",
        data: [{ trade_id: "a", created_time: 1000, yes_price_dollars: 0.4 }],
      },
    },
  };
  const next = applyLiveOverlay(base, {
    overlayKind: "sheet_rows",
    sheets: {
      "sheet-t": [{ trade_id: "b", created_time: 2000, yes_price_dollars: 0.5 }],
    },
  });
  assert.deepEqual(
    next?.dataSheets?.["sheet-t"]?.data?.map((r) => r.trade_id),
    ["a", "b"],
  );
});
