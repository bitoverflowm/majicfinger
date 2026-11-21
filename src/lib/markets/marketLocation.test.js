import assert from "node:assert/strict";
import { resolveMarketLocation, resolveSportsVenue } from "./marketLocation.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("resolveSportsVenue finds Premier League home stadiums", () => {
  const row = resolveSportsVenue("Will AFC Bournemouth win?");
  assert.equal(row.venue, "Vitality Stadium");
  assert.equal(row.region, "Bournemouth");
  assert.equal(row.method, "sports_home");
});

test("resolveMarketLocation places crypto in New York", () => {
  const row = resolveMarketLocation({ title: "Will ETH flip BTC?" });
  assert.equal(row.region, "New York City");
  assert.equal(row.method, "crypto_default");
});

test("resolveMarketLocation places known entities at HQ", () => {
  const row = resolveMarketLocation({ title: "Jensen Huang / Nvidia market cap" });
  assert.equal(row.region, "Santa Clara");
  assert.equal(row.method, "entity_hq");
});

test("resolveMarketLocation returns null when nothing matches", () => {
  assert.equal(resolveMarketLocation({ title: "Will the purple widget ship?" }), null);
});

test("resolveMarketLocation places weather cities on the real city", () => {
  const sg = resolveMarketLocation({
    title: "Will the highest temperature in Singapore be 30°C on November 22?",
  });
  assert.equal(sg.region, "Singapore");
  assert.ok(sg.lon > 100 && sg.lat > 0 && sg.lat < 5);
  const hk = resolveMarketLocation({ title: "Highest temperature in Hong Kong on November 21?" });
  assert.equal(hk.region, "Hong Kong");
  assert.ok(hk.lon > 110);
});
