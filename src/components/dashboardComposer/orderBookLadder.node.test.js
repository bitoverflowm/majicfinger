import assert from "node:assert/strict";
import { isOrderBookSheet, rowsToOrderBook } from "./orderBookLadder.js";

const columns = [
  { id: "ticker", title: "Ticker" },
  { id: "side", title: "Side" },
  { id: "price_dollars", title: "Price Dollars" },
  { id: "quantity_fp", title: "Quantity Fp" },
];

const book = rowsToOrderBook(columns, [
  ["MKT", "yes", "0.47", "100"],
  ["MKT", "yes", "0.46", "50"],
  ["MKT", "no", "0.49", "20"],
  ["MKT", "no", "0.48", "80"],
  ["MKT", "yes", "0.47", "10"],
]);

assert.deepEqual(book.bids[0], { price: 0.47, size: 110, total: 110 });
assert.deepEqual(book.bids[1], { price: 0.46, size: 50, total: 160 });
assert.equal(book.asks[0].price, 0.51);
assert.equal(book.asks[0].size, 20);
assert.equal(book.asks[0].total, 20);
assert.equal(book.asks[1].price, 0.52);
assert.equal(book.asks[1].total, 100);
assert.equal(book.mid, 0.49);

const compact = rowsToOrderBook(columns, [["MKT", "yes", "0.14", "22.8K"]]);
assert.equal(compact.bids[0].size, 22800);

assert.equal(isOrderBookSheet({ table: "orderbook" }), true);
assert.equal(isOrderBookSheet({ title: "Order book · AST", columns: [] }), true);
assert.equal(isOrderBookSheet({ title: "Trades · AST", columns: [] }), false);

console.log("order book ladder ok");
