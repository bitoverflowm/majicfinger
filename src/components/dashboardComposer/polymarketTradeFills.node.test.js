import assert from "node:assert/strict";
import { marketOutcomes, priceFill } from "./polymarketTradeFills.js";

const yes = "123456789012345";
const no = "987654321098765";
const tokens = [yes, no];

const makerBuys = priceFill(
  { maker_asset_id: "0", taker_asset_id: yes, maker_amount: "65000000", taker_amount: "100000000", fee: "0" },
  tokens,
  ["Yes", "No"],
);
assert.equal(makerBuys.price, 0.65);
assert.equal(makerBuys.outcome, "Yes");
assert.equal(makerBuys.side, "SELL");
assert.equal(makerBuys.size, 100);
assert.equal(makerBuys.usdc_amount, 65);
assert.equal(makerBuys.maker_amount, 65);
assert.equal(makerBuys.taker_amount, 100);

const makerSells = priceFill(
  { maker_asset_id: no, taker_asset_id: "0", maker_amount: "40000000", taker_amount: "14000000", fee: "20000" },
  tokens,
  ["Yes", "No"],
);
assert.equal(makerSells.price, 0.35);
assert.equal(makerSells.outcome, "No");
assert.equal(makerSells.side, "BUY");
assert.equal(makerSells.size, 40);
assert.equal(makerSells.fee, 0.02);

const named = priceFill({ maker_asset_id: "0", taker_asset_id: no, maker_amount: "1", taker_amount: "2" }, tokens, ["Lakers", "Celtics"]);
assert.equal(named.outcome, "Celtics");

const unlabeled = priceFill({ maker_asset_id: "0", taker_asset_id: no, maker_amount: "1", taker_amount: "2" }, tokens);
assert.equal(unlabeled.outcome, "No");

const tokenSwap = priceFill({ maker_asset_id: yes, taker_asset_id: no, maker_amount: "5", taker_amount: "5" }, tokens);
assert.equal(tokenSwap.price, null);
assert.equal(tokenSwap.outcome, "");

assert.deepEqual(marketOutcomes('["Yes", "No"]'), ["Yes", "No"]);
assert.deepEqual(marketOutcomes("[Yes, No]"), ["Yes", "No"]);
assert.deepEqual(marketOutcomes(""), []);

console.log("polymarket trade fills ok");
