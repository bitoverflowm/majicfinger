import assert from "node:assert/strict";
import { isOrderBookSheet, rowsToOrderBook, rowsToOutcomeBooks } from "./orderBookLadder.js";

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
assert.equal(isOrderBookSheet({ table: "getOrderbooks" }), true);
assert.equal(isOrderBookSheet({ title: "Order book · AST", columns: [] }), true);
assert.equal(isOrderBookSheet({ title: "Orderbook(s) · WTI", columns: [] }), true);
assert.equal(isOrderBookSheet({ title: "Trades · AST", columns: [] }), false);
assert.equal(
  isOrderBookSheet({
    table: "getTradesByMarket",
    title: "Trade History · WTI",
    columns: [{ id: "side" }, { id: "price" }, { id: "size" }],
  }),
  false,
);
assert.equal(
  isOrderBookSheet({
    title: "Trade History · WTI",
    columns: [{ id: "outcome" }, { id: "side" }, { id: "price" }, { id: "size" }],
  }),
  false,
);

const polymarket = rowsToOrderBook(
  [
    { id: "outcome" },
    { id: "side" },
    { id: "price" },
    { id: "size" },
  ],
  [
    ["Yes", "BUY", "0.47", "100"],
    ["Yes", "SELL", "0.49", "40"],
    ["No", "BUY", "0.51", "999"],
    ["No", "SELL", "0.53", "999"],
  ],
);
assert.equal(polymarket.bids[0].price, 0.47);
assert.equal(polymarket.bids[0].size, 999);
assert.equal(polymarket.asks[0].price, 0.49);
assert.equal(polymarket.asks[0].size, 999);
assert.equal(polymarket.mid, 0.48);

const mirrored = rowsToOrderBook(
  [
    { id: "outcome" },
    { id: "side" },
    { id: "price" },
    { id: "size" },
  ],
  [
    ["Yes", "SELL", "0.99", "100"],
    ["No", "BUY", "0.01", "100"],
  ],
);
assert.equal(mirrored.asks.length, 1);
assert.equal(mirrored.asks[0].price, 0.99);
assert.equal(mirrored.asks[0].size, 100);

const outcomes = rowsToOutcomeBooks(
  [
    { id: "outcome" },
    { id: "side" },
    { id: "price" },
    { id: "size" },
  ],
  [
    ["Yes", "BUY", "0.47", "100"],
    ["Yes", "SELL", "0.49", "40"],
    ["No", "BUY", "0.51", "999"],
    ["No", "SELL", "0.53", "20"],
  ],
);
assert.deepEqual(
  outcomes.map((book) => book.outcome),
  ["Yes", "No"],
);
assert.equal(outcomes[0].bids[0].price, 0.47);
assert.equal(outcomes[0].asks[0].price, 0.49);
assert.equal(outcomes[1].bids[0].price, 0.51);
assert.equal(outcomes[1].bids[0].size, 999);
assert.equal(outcomes[1].asks[0].price, 0.53);
assert.equal(rowsToOutcomeBooks(columns, [["MKT", "yes", "0.47", "100"]]).length, 0);

console.log("order book ladder ok");
