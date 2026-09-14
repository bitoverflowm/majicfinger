import assert from "node:assert/strict";

import {
  composeKalshiFeaturedTitle,
  diversifyKalshiDiscoveryFeatured,
  isKalshiDiscoveryFeaturedFlag,
  kalshiDiscoveryVolumeScore,
  rankKalshiMarketsForDiscoveryFeatured,
  tagsFromKalshiSeries,
} from "./fetchKalshiLiveFeaturedMarkets.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("isKalshiDiscoveryFeaturedFlag reads featured / is_featured", () => {
  assert.equal(isKalshiDiscoveryFeaturedFlag({ featured: true }), true);
  assert.equal(isKalshiDiscoveryFeaturedFlag({ is_featured: true }), true);
  assert.equal(isKalshiDiscoveryFeaturedFlag({ featured: false }), false);
  assert.equal(isKalshiDiscoveryFeaturedFlag({ ticker: "KXTEST" }), false);
});

test("kalshiDiscoveryVolumeScore prefers 24h volume", () => {
  assert.equal(kalshiDiscoveryVolumeScore({ volume_24h_fp: 10, volume_fp: 99 }), 10);
  assert.equal(kalshiDiscoveryVolumeScore({ volume_fp: 7 }), 7);
  assert.equal(kalshiDiscoveryVolumeScore({}), 0);
});

test("rankKalshiMarketsForDiscoveryFeatured puts featured ahead of volume", () => {
  const ranked = rankKalshiMarketsForDiscoveryFeatured(
    [
      { ticker: "LOW", volume_24h_fp: 1 },
      { ticker: "HOT", volume_24h_fp: 50, featured: true },
      { ticker: "HIGH", volume_24h_fp: 400 },
      { ticker: "", volume_24h_fp: 999 },
      { ticker: "ZERO", volume_24h_fp: 0 },
    ],
    10,
  );
  assert.deepEqual(
    ranked.map((row) => row.ticker),
    ["HOT", "HIGH", "LOW"],
  );
});

test("rankKalshiMarketsForDiscoveryFeatured falls back to volume only", () => {
  const ranked = rankKalshiMarketsForDiscoveryFeatured(
    [
      { ticker: "B", volume_24h_fp: 20 },
      { ticker: "A", volume_24h_fp: 80 },
      { ticker: "C", volume_fp: 5 },
    ],
    2,
  );
  assert.deepEqual(
    ranked.map((row) => row.ticker),
    ["A", "B"],
  );
});

test("composeKalshiFeaturedTitle prefixes sparse market names with the event", () => {
  assert.equal(
    composeKalshiFeaturedTitle(
      { ticker: "KXGAME-O2", yes_sub_title: "Over 2.5 1H points scored" },
      { title: "Akron vs Minnesota" },
    ),
    "Akron vs Minnesota — Over 2.5 1H points scored",
  );
});

test("tagsFromKalshiSeries uses category and tags", () => {
  assert.deepEqual(
    tagsFromKalshiSeries({ category: "Sports", tags: ["NCAAF", "Football"] }),
    ["Sports", "NCAAF", "Football"],
  );
});

test("diversifyKalshiDiscoveryFeatured keeps one market per event", () => {
  const picked = diversifyKalshiDiscoveryFeatured(
    [
      { ticker: "A1", event_ticker: "EVT1", series_ticker: "SER1" },
      { ticker: "A2", event_ticker: "EVT1", series_ticker: "SER1" },
      { ticker: "B1", event_ticker: "EVT2", series_ticker: "SER1" },
      { ticker: "C1", event_ticker: "EVT3", series_ticker: "SER2" },
    ],
    10,
  );
  assert.deepEqual(
    picked.map((row) => row.ticker),
    ["A1", "B1", "C1"],
  );
});
