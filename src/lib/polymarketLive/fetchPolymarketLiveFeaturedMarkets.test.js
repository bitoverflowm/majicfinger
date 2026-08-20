import assert from "node:assert/strict";

import {
  isPolymarketFeaturedMarketChartable,
  normalizePolymarketFeaturedMarket,
} from "./fetchPolymarketLiveFeaturedMarkets.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("normalizePolymarketFeaturedMarket pairs Yes/No token ids", () => {
  const market = normalizePolymarketFeaturedMarket({
    id: "m1",
    conditionId: "0xabc",
    slug: "will-it-rain",
    question: "Will it rain in NYC tomorrow?",
    volume24hr: 123456,
    featured: true,
    clobTokenIds: '["tok-yes","tok-no"]',
    outcomes: '["Yes","No"]',
    outcomePrices: '["0.63","0.37"]',
    image: "https://example.com/rain.png",
    tags: [{ label: "Weather" }, { slug: "nyc" }],
  });

  assert.equal(market?.title, "Will it rain in NYC tomorrow?");
  assert.equal(market?.featured, true);
  assert.equal(market?.volume24h, 123456);
  assert.equal(market?.imageUrl, "https://example.com/rain.png");
  assert.deepEqual(market?.tags, ["Weather", "nyc"]);
  assert.deepEqual(
    market?.outcomes.map((row) => [row.outcome, row.tokenId, row.lastPrice]),
    [
      ["Yes", "tok-yes", 0.63],
      ["No", "tok-no", 0.37],
    ],
  );
});

test("normalizePolymarketFeaturedMarket skips markets without two tokens", () => {
  assert.equal(
    normalizePolymarketFeaturedMarket({
      id: "m2",
      question: "Too thin",
      clobTokenIds: '["only-one"]',
      outcomes: '["Yes"]',
    }),
    null,
  );
});

test("isPolymarketFeaturedMarketChartable drops Yes 0¢ / No 100¢ markets", () => {
  const pinned = normalizePolymarketFeaturedMarket({
    id: "m3",
    question: "Already decided",
    clobTokenIds: '["tok-yes","tok-no"]',
    outcomes: '["Yes","No"]',
    outcomePrices: '["0.00","1.00"]',
  });
  assert.equal(isPolymarketFeaturedMarketChartable(pinned), false);

  const live = normalizePolymarketFeaturedMarket({
    id: "m4",
    question: "Still moving",
    clobTokenIds: '["tok-yes","tok-no"]',
    outcomes: '["Yes","No"]',
    outcomePrices: '["0.63","0.37"]',
  });
  assert.equal(isPolymarketFeaturedMarketChartable(live), true);
});
