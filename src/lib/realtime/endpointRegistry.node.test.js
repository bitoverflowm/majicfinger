import assert from "node:assert/strict";
import { LIVE_FEED_REGISTRY } from "@/lib/liveFeeds/registry.js";
import {
  getRealtimeEndpoint,
  isRealtimeEnabled,
  listRealtimeEndpoints,
} from "@/lib/realtime/endpointRegistry.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("kalshi enabled set matches the live poll registry", () => {
  const fromPoll = Object.values(LIVE_FEED_REGISTRY)
    .filter((def) => def.integration === "kalshi-live")
    .map((def) => def.endpoint)
    .sort();
  const enabled = listRealtimeEndpoints({ integration: "kalshiLive", enabled: true })
    .map((def) => def.endpoint)
    .sort();
  assert.deepEqual(enabled, fromPoll);
  for (const endpoint of enabled) {
    const def = getRealtimeEndpoint("kalshi-live", endpoint);
    assert.equal(def?.livePath, "api_poll");
    assert.equal(def?.transport, "rest_poll");
    assert.ok(def?.apiRoute);
  }
});

test("kalshi snapshot endpoints stay off", () => {
  assert.equal(isRealtimeEnabled("kalshi-live", "markets"), false);
  assert.equal(isRealtimeEnabled("kalshi-live", "events"), false);
  assert.equal(isRealtimeEnabled("kalshi-live", "series"), false);
});

test("polymarket socket feeds are on and playground names resolve", () => {
  for (const endpoint of [
    "book",
    "price_change",
    "last_trade_price",
    "candlesticks",
    "tick_size_change",
    "best_bid_ask",
  ]) {
    const def = getRealtimeEndpoint("polymarket-live", endpoint);
    assert.equal(def?.enabled, true, endpoint);
    assert.equal(def?.livePath, "client_websocket");
    assert.equal(def?.socketUrl, "wss://ws-subscriptions-clob.polymarket.com/ws/market");
  }
  assert.equal(getRealtimeEndpoint("polymarket", "wsPrice")?.endpoint, "price_change");
  assert.equal(getRealtimeEndpoint("polymarket", "wsOrderbookSnapshot")?.endpoint, "book");
  assert.equal(isRealtimeEnabled("polymarket", "new_market"), false);
  assert.equal(isRealtimeEnabled("polymarket", "wsMarketResolved"), false);
  assert.equal(isRealtimeEnabled("polymarket", "getMarkets"), false);
  assert.equal(getRealtimeEndpoint("polymarket", "getOrderbooks")?.endpoint, "book");
  assert.equal(getRealtimeEndpoint("polymarket", "getBatchPricesHistory")?.endpoint, "price_change");
  assert.equal(getRealtimeEndpoint("polymarket", "getTradesByMarket")?.endpoint, "last_trade_price");
  assert.equal(getRealtimeEndpoint("polymarket", "getMarketPrices")?.endpoint, "best_bid_ask");
});

test("chainlink and binance prices resolve by table id and by symbol", () => {
  assert.equal(isRealtimeEnabled("chainlink", "prices"), true);
  assert.equal(getRealtimeEndpoint("chainlink", "btc/usd")?.endpoint, "prices");
  assert.equal(getRealtimeEndpoint("chainlink", "btc/usd")?.topic, "crypto_prices_chainlink");
  assert.equal(getRealtimeEndpoint("chainlink", "twap_60")?.topic, "crypto_prices_twap_sixty");
  assert.equal(getRealtimeEndpoint("chainlink", "twap_30")?.topic, "crypto_prices_twap_thirty");
  assert.equal(getRealtimeEndpoint("chainlink", "twap_60")?.livePath, "client_websocket");
  assert.ok(getRealtimeEndpoint("chainlink", "twap_60")?.symbols.includes("zec/usd"));
  assert.equal(getRealtimeEndpoint("chainlink", "hype/usd")?.endpoint, "prices");
  assert.equal(isRealtimeEnabled("binance", "prices"), true);
  assert.equal(getRealtimeEndpoint("binance", "btcusdt")?.endpoint, "prices");
  assert.equal(getRealtimeEndpoint("binance", "ethusdt")?.topic, "crypto_prices");
  assert.equal(isRealtimeEnabled("binance", "unknown"), false);
});
