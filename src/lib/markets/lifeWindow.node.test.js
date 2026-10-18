import assert from "node:assert/strict";
import {
  isLifeWindowPreset,
  kalshiMarketLife,
  lifePullWindow,
  lifeSpanMs,
  lifeWindowDays,
  lifeWindowMs,
  mergeLives,
} from "./lifeWindow.js";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 18, 12);
const open = Date.UTC(2026, 8, 1);
const close = Date.UTC(2026, 9, 1);

const closed = kalshiMarketLife({ open_time: new Date(open).toISOString(), close_time: new Date(close).toISOString(), status: "finalized" });
assert.equal(closed.stopped, true);
assert.deepEqual(lifeSpanMs(closed, now), { startMs: open, endMs: close });
assert.deepEqual(lifeWindowMs("market-life", closed, now), { startMs: open, endMs: close });
assert.deepEqual(lifeWindowMs("life-first-half", closed, now), { startMs: open, endMs: open + 15 * DAY });
assert.deepEqual(lifeWindowMs("life-second-half", closed, now), { startMs: open + 15 * DAY, endMs: close });
assert.deepEqual(lifeWindowMs("life-last-quarter", closed, now), { startMs: close - 7.5 * DAY, endMs: close });
assert.deepEqual(lifeWindowMs("life-first-day", closed, now), { startMs: open, endMs: open + DAY });
assert.deepEqual(lifeWindowMs("life-last-week", closed, now), { startMs: close - 7 * DAY, endMs: close });
assert.equal(lifeWindowMs("past-24h", closed, now), null);
assert.equal(isLifeWindowPreset("life-first-half"), true);
assert.equal(isLifeWindowPreset("past-24h"), false);

const trading = kalshiMarketLife({ openTime: new Date(open).toISOString(), closeTime: new Date(now + 30 * DAY).toISOString(), marketStatus: "active" });
assert.equal(trading.stopped, false);
assert.deepEqual(lifeSpanMs(trading, now), { startMs: open, endMs: now });
assert.deepEqual(lifeWindowMs("life-last-day", trading, now), { startMs: now - DAY, endMs: now });

const notOpen = kalshiMarketLife({ openTime: new Date(now + DAY).toISOString(), closeTime: new Date(now + 9 * DAY).toISOString(), marketStatus: "initialized" });
assert.equal(lifeSpanMs(notOpen, now), null);

const half = lifePullWindow({ period: 60 }, { preset: "life-first-half" }, closed, now);
assert.equal(half.minTs, open / 1000);
assert.equal(half.maxTs, (open + 15 * DAY) / 1000);
assert.equal(half.period, 60);

const picked = lifePullWindow({ minTs: Date.UTC(2026, 7, 1) / 1000, maxTs: Date.UTC(2026, 8, 10) / 1000 }, { from: "2026-08-01", to: "2026-09-10", preset: "" }, closed, now);
assert.equal(picked.minTs, open / 1000);
assert.equal(picked.maxTs, Date.UTC(2026, 8, 10) / 1000);
assert.equal(picked.empty, undefined);

const outside = lifePullWindow({ minTs: Date.UTC(2026, 9, 5) / 1000, maxTs: Date.UTC(2026, 9, 8) / 1000 }, { preset: "" }, closed, now);
assert.equal(outside.empty, true);

const unknown = lifePullWindow({ minTs: 5, maxTs: 9 }, { preset: "life-first-half" }, null, now);
assert.deepEqual(unknown, { minTs: 5, maxTs: 9 });

const merged = mergeLives([closed, trading], now);
assert.equal(merged.openMs, open);
assert.equal(merged.closeMs, now);
assert.equal(merged.stopped, false);
assert.equal(mergeLives([notOpen], now), null);

const days = lifeWindowDays("market-life", closed, now);
assert.ok(days.from <= "2026-09-01" && days.to >= "2026-09-30");

console.log("life window ok");
