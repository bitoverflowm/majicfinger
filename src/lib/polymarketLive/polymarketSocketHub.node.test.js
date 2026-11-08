import assert from "node:assert/strict";
import { createPolymarketHub } from "@/lib/polymarketLive/polymarketSocketHub.js";

const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));

function fakeSockets() {
  const sockets = [];
  const createSocket = () => {
    const socket = {
      readyState: 0,
      sent: [],
      send(data) {
        this.sent.push(typeof data === "string" && data !== "PING" ? JSON.parse(data) : data);
      },
      close() {
        this.readyState = 3;
        this.onclose?.();
      },
      open() {
        this.readyState = 1;
        this.onopen?.();
      },
      emit(msg) {
        this.onmessage?.({ data: JSON.stringify(msg) });
      },
    };
    sockets.push(socket);
    return socket;
  };
  return { sockets, createSocket };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

await test("hub: one socket, assets added in place", async () => {
  const { sockets, createSocket } = fakeSockets();
  const hub = createPolymarketHub({ createSocket, flushMs: 0, graceMs: 20, pingMs: 60_000 });
  const a = hub.subscribe({ assetIds: ["A"], onMessage: () => {} });
  assert.equal(sockets.length, 1);
  sockets[0].open();
  assert.deepEqual(sockets[0].sent[0], { assets_ids: ["A"], type: "market", initial_dump: true, custom_feature_enabled: true });
  const b = hub.subscribe({ assetIds: ["A", "B"], onMessage: () => {} });
  await tick();
  assert.equal(sockets.length, 1);
  assert.deepEqual(sockets[0].sent.at(-1), { assets_ids: ["B"], operation: "subscribe", custom_feature_enabled: true });
  a.close();
  b.close();
  await tick(40);
  assert.deepEqual(sockets[0].sent.at(-1), { assets_ids: ["A", "B"], operation: "unsubscribe" });
  assert.equal(sockets[0].readyState, 3);
});

await test("hub: routes by asset, market-wide events to custom subscribers", async () => {
  const { sockets, createSocket } = fakeSockets();
  const hub = createPolymarketHub({ createSocket, flushMs: 0, graceMs: 20, pingMs: 60_000 });
  const gotA = [];
  const gotB = [];
  hub.subscribe({ assetIds: ["A"], custom: true, onMessage: (msg) => gotA.push(msg.event_type) });
  hub.subscribe({ assetIds: ["B"], onMessage: (msg) => gotB.push(msg.event_type) });
  sockets[0].open();
  sockets[0].emit({ event_type: "last_trade_price", asset_id: "B", price: "0.5" });
  sockets[0].emit({ event_type: "price_change", market: "m", price_changes: [{ asset_id: "A", price: "0.4", size: "10", side: "BUY" }, { asset_id: "A2" }] });
  sockets[0].emit({ event_type: "new_market", market: "0xabc" });
  assert.deepEqual(gotA, ["price_change", "new_market"]);
  assert.deepEqual(gotB, ["last_trade_price"]);
});

await test("hub: late joiner gets the live book", async () => {
  const { sockets, createSocket } = fakeSockets();
  const hub = createPolymarketHub({ createSocket, flushMs: 0, graceMs: 20, pingMs: 60_000 });
  hub.subscribe({ assetIds: ["A"], onMessage: () => {} });
  sockets[0].open();
  sockets[0].emit({ event_type: "book", asset_id: "A", market: "m", bids: [{ price: "0.4", size: "10" }], asks: [{ price: "0.6", size: "5" }] });
  sockets[0].emit({
    event_type: "price_change",
    market: "m",
    price_changes: [
      { asset_id: "A", price: "0.45", size: "3", side: "BUY" },
      { asset_id: "A", price: "0.6", size: "0", side: "SELL" },
    ],
  });
  const got = [];
  hub.subscribe({ assetIds: ["A"], onMessage: (msg) => got.push(msg) });
  await tick();
  assert.equal(got.length, 1);
  assert.equal(got[0].event_type, "book");
  assert.deepEqual(got[0].bids, [
    { price: "0.4", size: "10" },
    { price: "0.45", size: "3" },
  ]);
  assert.deepEqual(got[0].asks, []);
});

await test("hub: brief release keeps the asset subscribed", async () => {
  const { sockets, createSocket } = fakeSockets();
  const hub = createPolymarketHub({ createSocket, flushMs: 0, graceMs: 50, pingMs: 60_000 });
  hub.subscribe({ assetIds: ["X"], onMessage: () => {} });
  const live = hub.subscribe({ assetIds: ["A"], onMessage: () => {} });
  sockets[0].open();
  live.update(["B"]);
  await tick();
  live.update(["A"]);
  await tick(80);
  const ops = sockets[0].sent.slice(1).filter((msg) => typeof msg === "object");
  assert.deepEqual(ops, [
    { assets_ids: ["B"], operation: "subscribe", custom_feature_enabled: true },
    { assets_ids: ["B"], operation: "unsubscribe" },
  ]);
});

await test("hub: reconnects and resubscribes everything", async () => {
  const { sockets, createSocket } = fakeSockets();
  const hub = createPolymarketHub({ createSocket, flushMs: 0, graceMs: 20, pingMs: 60_000 });
  hub.subscribe({ assetIds: ["A"], onMessage: () => {} });
  hub.subscribe({ assetIds: ["B"], onMessage: () => {} });
  sockets[0].open();
  sockets[0].onclose();
  await tick(1100);
  assert.equal(sockets.length, 2);
  sockets[1].open();
  assert.deepEqual(sockets[1].sent[0].assets_ids.sort(), ["A", "B"]);
});
