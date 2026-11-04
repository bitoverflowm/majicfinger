import assert from "node:assert/strict";
import { NEW_WALLET_DAYS, pullWalletCreated, walletAge } from "./polymarketHolderAnalysisSource.js";

const DAY = 86_400_000;
const now = Date.parse("2026-11-04T12:00:00Z");

assert.deepEqual(walletAge(undefined, now), { wallet_created: "", age_days: null, new_wallet: false });
assert.deepEqual(walletAge(now - 3 * DAY - 1000, now), {
  wallet_created: new Date(now - 3 * DAY - 1000).toISOString(),
  age_days: 3,
  new_wallet: true,
});
assert.equal(walletAge(now - (NEW_WALLET_DAYS - 1) * DAY, now).new_wallet, true);
assert.equal(walletAge(now - NEW_WALLET_DAYS * DAY, now).new_wallet, false);
assert.equal(walletAge(now + DAY, now).age_days, 0);

const a = `0x${"a".repeat(40)}`;
const b = `0x${"b".repeat(40)}`;
const calls = [];
globalThis.fetch = async (url) => {
  const params = new URL(url, "http://local").searchParams;
  calls.push(params.get("addresses"));
  return {
    ok: true,
    json: async () => [{ profiles: [{ address: a, createdAt: "2026-10-30T00:00:00Z" }, { address: b }] }],
  };
};
const created = await pullWalletCreated([a, b, a, "not-a-wallet"]);
assert.deepEqual(calls, [`${a},${b}`]);
assert.equal(created.get(a), Date.parse("2026-10-30T00:00:00Z"));
assert.equal(created.has(b), false);

const many = Array.from({ length: 205 }, (_, i) => `0x${i.toString(16).padStart(40, "0")}`);
calls.length = 0;
await pullWalletCreated(many);
assert.deepEqual(calls.map((value) => value.split(",").length), [100, 100, 5]);

globalThis.fetch = async () => ({ ok: false, status: 502, json: async () => ({ message: "down" }) });
assert.equal((await pullWalletCreated([a])).size, 0);

console.log("polymarketHolderAnalysisSource ok");
