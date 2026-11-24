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

test("resolveMarketLocation places NCAAF / NHL spreads at home venues", () => {
  const tech = resolveMarketLocation({ title: "Spread: Texas Tech (-5.5)" });
  assert.equal(tech.region, "Lubbock");
  assert.equal(tech.venue, "Jones AT&T Stadium");
  assert.ok(tech.lon < -100 && tech.lat > 33 && tech.lat < 34);

  const islanders = resolveMarketLocation({ title: "Spread: Islanders (-1.5)" });
  assert.equal(islanders.region, "Elmont");
  assert.equal(islanders.venue, "UBS Arena");

  const utah = resolveMarketLocation({ title: "Spread: Utah (-7.5)" });
  assert.equal(utah.region, "Salt Lake City");
  assert.equal(utah.venue, "Rice-Eccles Stadium");

  const celta = resolveMarketLocation({ title: "Spread: RC Celta de Vigo (-1.5)" });
  assert.equal(celta.region, "Vigo");
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

test("resolveMarketLocation places bare city sports titles in the real city (not ocean fallback)", () => {
  // Kalshi-style moneyline short titles — previously missed jaguars/CITY catalogs and
  // fell through to warRoom fallbackWorldPoint (~Azores / mid-Atlantic).
  const jax = resolveMarketLocation({ title: "Jacksonville wins" });
  assert.equal(jax.region, "Jacksonville");
  assert.ok(jax.lat > 30 && jax.lat < 31, `lat ${jax.lat}`);
  assert.ok(jax.lon < -81 && jax.lon > -82, `lon ${jax.lon}`);
  assert.equal(jax.method, "sports_home");

  const kc = resolveMarketLocation({ title: "Kansas City wins" });
  assert.equal(kc.region, "Kansas City");
  assert.ok(kc.lat > 38 && kc.lat < 40);
  assert.ok(kc.lon < -94 && kc.lon > -95);

  const madrid = resolveMarketLocation({ title: "Real Madrid wins" });
  assert.equal(madrid.region, "Madrid");
  assert.equal(madrid.venue, "Santiago Bernabéu");
});

test("resolveMarketLocation places US weather city names without series ticker", () => {
  const orlando = resolveMarketLocation({ title: "Highest temperature in Orlando today?" });
  assert.equal(orlando.region, "Orlando");
  assert.ok(orlando.lat > 28 && orlando.lat < 29);
  assert.ok(orlando.lon < -81 && orlando.lon > -82);
});
