import test from "node:test";
import assert from "node:assert/strict";
import { groupPositionsByEvent, isProxyWallet, rankProfileHits } from "./walletLookup.js";

test("rankProfileHits prefers exact name then handle", () => {
  const ranked = rankProfileHits(
    [
      { proxyWallet: "0x1111111111111111111111111111111111111111", name: "Fredi999", pseudonym: "other" },
      { proxyWallet: "0x2222222222222222222222222222222222222222", name: "Theo4", xUsername: "Theo4" },
      { proxyWallet: "not-a-wallet", name: "Theo4" },
    ],
    "Theo4",
  );
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].proxy_wallet, "0x2222222222222222222222222222222222222222");
  assert.equal(ranked[0].exact, true);
  assert.equal(ranked[1].exact, false);
});

test("groupPositionsByEvent matches Holder Terminal event rollup", () => {
  const events = groupPositionsByEvent([
    {
      event_id: "42",
      event_slug: "fed-decision",
      title: "Fed cuts 25bps in Dec?",
      outcome: "Yes",
      current_size: 100,
      current_value: 40,
      total_pnl: 10,
      unrealized_pnl: 10,
      realized_pnl: 0,
      condition_id: "0xaaa",
    },
    {
      event_id: "42",
      event_slug: "fed-decision",
      title: "Fed holds in Dec?",
      outcome: "No",
      current_size: 50,
      current_value: 20,
      total_pnl: -4,
      unrealized_pnl: -4,
      realized_pnl: 0,
      condition_id: "0xbbb",
    },
    {
      event_id: "9",
      event_slug: "btc-100k",
      title: "BTC above 100k?",
      outcome: "Yes",
      current_value: 5,
      total_pnl: 1,
    },
  ]);
  assert.equal(events.length, 2);
  assert.equal(events[0].event_id, "42");
  assert.equal(events[0].markets, 2);
  assert.equal(events[0].current_value, 60);
  assert.equal(events[0].total_pnl, 6);
  assert.equal(events[0].outcomes.length, 2);
  assert.equal(events[1].event_slug, "btc-100k");
});

test("isProxyWallet", () => {
  assert.equal(isProxyWallet("0x24ded84d901a743cfee095f8082b0f9f647183cb"), true);
  assert.equal(isProxyWallet("Theo4"), false);
});
