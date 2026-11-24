import assert from "node:assert/strict";
import { isWeatherSeries, locateMarket, pointGeometry, WEATHER_CITY_SERIES } from "./geography.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("weather city series are unique HIGH tickers excluding NYC featured", () => {
  assert.ok(WEATHER_CITY_SERIES.includes("KXHIGHCHI"));
  assert.ok(WEATHER_CITY_SERIES.includes("KXHIGHMIA"));
  assert.equal(WEATHER_CITY_SERIES.includes("KXHIGHNY"), false);
  assert.equal(new Set(WEATHER_CITY_SERIES).size, WEATHER_CITY_SERIES.length);
});

test("locateMarket maps Kalshi weather series to the city", () => {
  const chi = locateMarket({ seriesTicker: "KXHIGHCHI-26NOV21-B54.5", title: "Highest temperature in Chicago" });
  assert.equal(chi.region, "Chicago");
  assert.equal(chi.precision, "station");
  assert.ok(isWeatherSeries("KXHIGHCHI"));
  const ny = locateMarket({ seriesTicker: "KXHIGHNY", title: "" });
  assert.equal(ny.region, "New York City");
});

test("locateMarket maps geopolitics titles and series", () => {
  assert.equal(locateMarket({ seriesTicker: "KXUKRAINE" }).region, "Kyiv");
  assert.equal(locateMarket({ title: "Will Iran close the Strait of Hormuz?" }).region, "Tehran");
  assert.equal(locateMarket({ title: "Fed rate decision in December" }).region, "Washington, D.C.");
});

test("locateMarket maps sports homes to stadiums via shared catalog", () => {
  const bournemouth = locateMarket({ title: "Will AFC Bournemouth win?" });
  assert.equal(bournemouth.region, "Bournemouth · Vitality Stadium");
  assert.equal(bournemouth.precision, "venue");
  assert.ok(Math.abs(bournemouth.lat - 50.7352) < 0.01);
});

test("locateMarket places Jacksonville wins in Florida (not mid-Atlantic fallback)", () => {
  const jax = locateMarket({ title: "Jacksonville wins" });
  assert.ok(jax, "expected geocode hit");
  assert.ok(String(jax.region).includes("Jacksonville"));
  assert.ok(jax.lat > 30 && jax.lat < 31, `lat ${jax.lat}`);
  assert.ok(jax.lon < -81 && jax.lon > -82, `lon ${jax.lon}`);
  assert.notEqual(jax.precision, "global");
});

test("locateMarket maps crypto to NYC and entity HQs to city", () => {
  const btc = locateMarket({ title: "Will Bitcoin hit $100k this year?", tags: ["Crypto"] });
  assert.equal(btc.region, "New York City");
  const nvidia = locateMarket({ title: "Will Jensen Huang stay CEO of Nvidia?" });
  assert.match(nvidia.region, /Santa Clara/);
});

test("pointGeometry jitters stacked contracts in the same city", () => {
  const base = locateMarket({ seriesTicker: "KXHIGHNY" });
  const a = pointGeometry(base, "KXHIGHNY-A");
  const b = pointGeometry(base, "KXHIGHNY-B");
  assert.notDeepEqual(a.coordinates, b.coordinates);
});
