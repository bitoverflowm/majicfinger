import assert from "node:assert/strict";
import { applyQuote, compareSignals, sortSignals, upsertSignal } from "./timeline.js";
import { fixtureSignals, replayFixtureEvents } from "./fixture.js";
import { fillDisplayState, isLargeFill } from "./ranking.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("sortSignals uses occurredAt, not observedAt, so late arrivals keep source order", () => {
  const late = { id: "late", occurredAt: "2026-11-21T12:00:00.000Z", observedAt: "2026-11-21T20:00:00.000Z" };
  const quote = { id: "quote", occurredAt: "2026-11-21T14:00:00.000Z", observedAt: "2026-11-21T14:00:01.000Z" };
  const sorted = sortSignals([quote, late]);
  assert.deepEqual(sorted.map((s) => s.id), ["late", "quote"]);
});

test("upsertSignal is idempotent on reconnect of the same id", () => {
  const a = { id: "q1", kind: "quote", occurredAt: "2026-11-21T18:10:00.000Z", observedAt: "2026-11-21T18:10:04.000Z", data: { price: 0.5 } };
  const reconnect = { ...a, observedAt: "2026-11-21T19:20:00.000Z" };
  const once = upsertSignal([], a);
  const twice = upsertSignal(once, reconnect);
  assert.equal(twice.length, 1);
  assert.equal(twice[0].id, "q1");
  assert.equal(twice[0].occurredAt, a.occurredAt);
});

test("delayed attribution enriches the original fill instead of duplicating it", () => {
  const { timeline } = replayFixtureEvents();
  const fills = timeline.filter((s) => s.kind === "fill");
  assert.equal(fills.length, 2);
  const large = fills.find((s) => isLargeFill(s));
  assert.ok(large);
  assert.equal(large.data.attributed, true);
  assert.equal(large.data.wallet, "0x56687bf447db6ffa42ffe2204a05edaa20f55839");
  assert.equal(timeline.filter((s) => s.kind === "attribution").length, 0);
});

test("stale quote cannot regress the displayed last price", () => {
  const fresh = { marketId: "m", price: 0.5, sourceTs: "2026-11-21T18:10:00.000Z", observedTs: "2026-11-21T18:10:04.000Z" };
  const stale = { marketId: "m", price: 0.4, sourceTs: "2026-11-21T13:00:00.000Z", observedTs: "2026-11-21T20:30:00.000Z" };
  const applied = applyQuote(fresh, stale);
  assert.equal(applied.price, 0.5);
});

test("headline published after a price move stays after it", () => {
  const { timeline } = replayFixtureEvents();
  const quoteIdx = timeline.findIndex((s) => s.id.includes("18:10"));
  const headlineIdx = timeline.findIndex((s) => s.kind === "headline");
  assert.ok(quoteIdx >= 0 && headlineIdx >= 0);
  assert.ok(headlineIdx > quoteIdx);
});

test("fixture covers fills above and below the $5k threshold", () => {
  const s = fixtureSignals();
  assert.equal(isLargeFill(s.smallFill), false);
  assert.equal(isLargeFill(s.largeFill), true);
  assert.equal(fillDisplayState(s.smallFill), "fill");
  assert.equal(fillDisplayState(s.largeFill), "large_fill");
});

test("compareSignals is a stable tie-breaker on id", () => {
  const a = { id: "a", occurredAt: "2026-11-21T12:00:00.000Z", observedAt: "2026-11-21T12:00:00.000Z" };
  const b = { id: "b", occurredAt: "2026-11-21T12:00:00.000Z", observedAt: "2026-11-21T12:00:00.000Z" };
  assert.ok(compareSignals(a, b) < 0);
  assert.deepEqual(sortSignals([b, a]).map((s) => s.id), ["a", "b"]);
});
