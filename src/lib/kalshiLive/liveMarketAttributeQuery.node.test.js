import assert from "node:assert/strict";
import { dateRangePreset } from "@/components/dashboardComposer/dateRangePresets.js";
import {
  describeKalshiLiveServerFilters,
  kalshiLiveDiscoveryFromFilters,
  kalshiRetryDelayMs,
  KALSHI_LIVE_MARKET_PAGE_GAP_MS,
} from "@/lib/kalshiLive/liveMarketAttributeQuery.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("open time and volume stay off the markets request", () => {
  const params = kalshiLiveDiscoveryFromFilters({
    open_time: { from: "2026-10-01", to: "2026-10-05" },
    volume_fp: { min: "100000" },
  });
  assert.equal(params.minCreatedTs, "");
  assert.equal(params.maxCreatedTs, "");
  assert.equal(params.minCloseTs, "");
  assert.equal(params.maxCloseTs, "");
  assert.equal(describeKalshiLiveServerFilters(params).length, 0);
  assert.equal("minOpenTs" in params, false);
});

test("created time is sent as min and max unix seconds", () => {
  const params = kalshiLiveDiscoveryFromFilters({
    created_time: { from: "2026-10-01", to: "2026-10-05" },
  });
  assert.equal(params.minCreatedTs, Math.floor(new Date(2026, 9, 1, 0, 0, 0).getTime() / 1000));
  assert.equal(params.maxCreatedTs, Math.floor(new Date(2026, 9, 5, 23, 59, 59).getTime() / 1000));
  assert.deepEqual(describeKalshiLiveServerFilters(params), ["created time"]);
});

test("page gap stays under the 30 requests per minute limiter", () => {
  assert.ok(KALSHI_LIVE_MARKET_PAGE_GAP_MS >= 2_000);
  assert.ok(60_000 / KALSHI_LIVE_MARKET_PAGE_GAP_MS < 30);
});

test("rate limit retry uses Retry-After, then backs off", () => {
  assert.equal(kalshiRetryDelayMs({ retryAfterSec: 4 }, 0), 4_000);
  assert.equal(kalshiRetryDelayMs({ retryAfterSec: 90 }, 0), 60_000);
  assert.equal(kalshiRetryDelayMs({}, 0), 1_500);
  assert.equal(kalshiRetryDelayMs({}, 2), 6_000);
});

test("date presets are windows through today", () => {
  const now = new Date(2026, 9, 4, 16, 0, 0);
  assert.deepEqual(dateRangePreset("past-24h", now), { from: "2026-10-03", to: "2026-10-04" });
  assert.deepEqual(dateRangePreset("past-3d", now), { from: "2026-10-01", to: "2026-10-04" });
  assert.deepEqual(dateRangePreset("past-7d", now), { from: "2026-09-27", to: "2026-10-04" });
  assert.deepEqual(dateRangePreset("past-month", now), { from: "2026-09-04", to: "2026-10-04" });
  assert.deepEqual(dateRangePreset("this-quarter", now), { from: "2026-10-01", to: "2026-10-04" });
  assert.deepEqual(dateRangePreset("this-year", now), { from: "2026-01-01", to: "2026-10-04" });
});
