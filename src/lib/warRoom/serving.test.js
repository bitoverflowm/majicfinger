import assert from "node:assert/strict";
import { deskAndMarketFromQuery, normalizeDesk, warRoomHref } from "./href.js";
import { parseWarRoomMarketId, warRoomMarketId } from "./ids.js";
import { buildFixtureBundle } from "./fixture.js";
import { isFeaturedWeatherMarket, rankMarkets } from "./ranking.js";
import { FEATURED_WEATHER_SERIES } from "./constants.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("warRoomHref round-trips desk and market", () => {
  const id = warRoomMarketId("kalshi", "KXHIGHNY-26NOV21-B64.5");
  assert.equal(
    warRoomHref({ desk: "weather", market: id }),
    `/war-room?desk=weather&market=${encodeURIComponent(id)}`,
  );
  assert.equal(warRoomHref({}), "/war-room");
  assert.equal(normalizeDesk("WEATHER"), "weather");
  assert.equal(normalizeDesk("nope"), "all");
});

test("deskAndMarketFromQuery reads Next query objects", () => {
  const parsed = deskAndMarketFromQuery({ desk: "geopolitics", market: "polymarket:abc", fixture: "1" });
  assert.equal(parsed.desk, "geopolitics");
  assert.equal(parsed.market, "polymarket:abc");
  assert.equal(parsed.fixture, true);
});

test("parseWarRoomMarketId rejects junk", () => {
  assert.equal(parseWarRoomMarketId("nope"), null);
  assert.deepEqual(parseWarRoomMarketId("kalshi:KXHIGHNY"), { venue: "kalshi", venueMarketId: "KXHIGHNY" });
});

test("featured weather series ranks first", () => {
  const ranked = rankMarkets([
    { id: "p", category: "geopolitics", quote: { move: 0.4 }, volume24h: 9_000_000 },
    { id: "w", seriesTicker: FEATURED_WEATHER_SERIES, category: "weather", quote: { move: 0.01 } },
  ]);
  assert.equal(ranked[0].id, "w");
  assert.equal(isFeaturedWeatherMarket(ranked[0]), true);
});

test("fixture bundle exposes weather story, geopolitics, and labeled flag", () => {
  const bundle = buildFixtureBundle();
  assert.equal(bundle.fixture, true);
  assert.ok(bundle.markets.some((m) => m.category === "weather"));
  assert.ok(bundle.markets.some((m) => m.category === "geopolitics"));
  assert.ok(bundle.featuredMarketId.startsWith("kalshi:KXHIGHNY"));
  assert.ok(bundle.signals.length >= 6);
});
