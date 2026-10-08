import assert from "node:assert/strict";

import {
  closedLifeMessage,
  defaultLifeRange,
  lifeCountdown,
  lifeOfMarket,
  presetWithinLife,
  sheetLife,
} from "./marketLife.js";

const openAt = Date.parse("2026-04-01T15:00:00Z");
const closeAt = Date.parse("2026-04-11T03:24:33Z");
const now = Date.parse("2026-10-08T12:00:00Z");

{
  const life = lifeOfMarket({ closed: true, startedAt: Math.floor(openAt / 1000), closesAt: Math.floor(closeAt / 1000), outcome: "yes" }, now);
  assert.equal(life.stopped, true);
  assert.equal(life.trading, false);
  assert.equal(life.outcome, "Yes");
  const range = defaultLifeRange(life);
  assert.equal(range.preset, "market-life");
  assert.equal(range.to, life.latest);
  assert.equal(range.from, life.earliest);
  const week = presetWithinLife("past-7d", life, new Date(now));
  assert.equal(week.to, life.latest);
  assert.ok(week.from >= life.earliest);
  assert.equal(closedLifeMessage(life.outcome), "Market closed. Yes. No more live trades, prices, or order books.");
  console.log("ok closed market uses its own life");
}

{
  const life = lifeOfMarket(
    { closed: false, status: "active", openTime: "2026-10-07T18:00:00Z", closeTime: "2026-10-20T00:00:00Z" },
    now,
  );
  assert.equal(life.trading, true);
  assert.equal(life.stopped, false);
  assert.equal(life.latest, "2026-10-08");
  const range = defaultLifeRange(life);
  assert.equal(range.preset, "past-24h");
  assert.equal(range.to, "2026-10-08");
  assert.ok(range.from >= life.earliest);
  assert.equal(lifeCountdown(life, now).startsWith("Closes in"), true);
  console.log("ok open market ends today and counts down");
}

{
  const life = lifeOfMarket({ closed: true, closeTime: "2022-03-16T11:14:35Z", openTime: "2022-01-01T00:00:00Z" }, now);
  const capped = defaultLifeRange(life, { maxDays: 15 });
  assert.equal(capped.to, life.latest);
  assert.ok(capped.from > life.earliest);
  console.log("ok capped archive window stays inside the close");
}

{
  const life = sheetLife({
    pull: { closed: true, closeAt: closeAt, outcome: "No" },
  });
  assert.equal(life.stopped, true);
  assert.equal(life.outcome, "No");
  console.log("ok sheet life reads the saved pull");
}
