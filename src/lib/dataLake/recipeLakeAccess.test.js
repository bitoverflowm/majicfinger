import assert from "node:assert/strict";
import {
  RECIPE_POLYMARKET_TRADE_HISTORY,
  RECIPE_TRADE_HISTORY,
  RECIPE_TRADE_ROW_LIMIT,
  isRecipeTradeHistoryQuery,
  recipeLakeAccess,
} from "./recipeLakeAccess.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

const YES = "21742633143463906290569050155826241533067272736897614950488156847949938836455";
const NO = "48331043336612883890938759509493159234755048973500640148014422747788308965732";

function polymarketFills(tokens = [YES, NO]) {
  return {
    lake: "polymarket",
    table: "trades",
    queryType: "compose",
    limit: RECIPE_TRADE_ROW_LIMIT,
    caseSensitive: false,
    recipe: RECIPE_POLYMARKET_TRADE_HISTORY,
    filters: {
      and: [{ column: "taker", kind: "string", op: "not_in", value: '"0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e"' }],
      or: tokens.flatMap((token) => [
        { column: "maker_asset_id", kind: "string", op: "eq", value: token },
        { column: "taker_asset_id", kind: "string", op: "eq", value: token },
      ]),
    },
    compose: {
      select: [
        { column: "block_number", alias: "block_number" },
        { column: "timestamp", alias: "timestamp", sourceTable: "blocks" },
        { column: "maker_amount", alias: "maker_amount" },
      ],
      joins: [{ table: "blocks", joinType: "left", on: { leftColumn: "block_number", rightColumn: "block_number" } }],
      groupByAliases: [],
      orderBy: [{ alias: "block_number", direction: "desc" }],
    },
  };
}

test("lifts the cap for one Polymarket market's fills", () => {
  const body = polymarketFills();
  assert.equal(isRecipeTradeHistoryQuery(body), true);
  const access = recipeLakeAccess(body, { maxSelectRows: 1000, maxComposeRows: 1000 });
  assert.equal(access.maxComposeRows, RECIPE_TRADE_ROW_LIMIT);
});

test("keeps the cap when the fills span more than one market", () => {
  assert.equal(isRecipeTradeHistoryQuery(polymarketFills([YES, NO, "123456789"])), false);
});

test("keeps the cap without the Polymarket recipe flag", () => {
  assert.equal(isRecipeTradeHistoryQuery({ ...polymarketFills(), recipe: RECIPE_TRADE_HISTORY }), false);
  assert.equal(isRecipeTradeHistoryQuery({ ...polymarketFills(), recipe: undefined }), false);
});

test("keeps the cap for aggregates and other joins", () => {
  const body = polymarketFills();
  assert.equal(
    isRecipeTradeHistoryQuery({ ...body, compose: { ...body.compose, groupByAliases: ["timestamp"] } }),
    false,
  );
  assert.equal(
    isRecipeTradeHistoryQuery({
      ...body,
      compose: { ...body.compose, select: [{ column: "maker_amount", alias: "total", aggregate: "sum" }] },
    }),
    false,
  );
  assert.equal(
    isRecipeTradeHistoryQuery({
      ...body,
      compose: { ...body.compose, joins: [{ table: "markets", joinType: "left", on: { leftColumn: "a", rightColumn: "b" } }] },
    }),
    false,
  );
});

test("Kalshi single-ticker trades still lift the cap", () => {
  const body = {
    lake: "kalshi",
    table: "trades",
    queryType: "compose",
    recipe: RECIPE_TRADE_HISTORY,
    filters: { and: [{ column: "ticker", kind: "string", op: "eq", value: "KXBTCD-25DEC31-T100000" }], or: [] },
    compose: { select: [{ column: "ticker", alias: "ticker" }], groupByAliases: [], orderBy: [] },
  };
  assert.equal(isRecipeTradeHistoryQuery(body), true);
});
