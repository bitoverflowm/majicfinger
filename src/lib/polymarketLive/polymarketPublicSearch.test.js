import assert from "node:assert/strict";

import {
  isPolymarketSelectionMatch,
  polymarketSelectionTokenSet,
} from "@/lib/polymarketLive/polymarketPublicSearch.js";

{
  const picks = [
    { entity: "market", id: "2378913", slug: "will-the-bank-of-korea-cut-by-25-bps" },
  ];
  const tokens = polymarketSelectionTokenSet(picks);
  assert.ok(
    isPolymarketSelectionMatch({ entity: "market", id: "2378913" }, tokens),
    "matches by id",
  );
  assert.ok(
    isPolymarketSelectionMatch(
      { entity: "market", slug: "will-the-bank-of-korea-cut-by-25-bps" },
      tokens,
    ),
    "matches by slug",
  );
  assert.equal(
    isPolymarketSelectionMatch({ entity: "market", id: "2378914" }, tokens),
    false,
    "unselected market does not match",
  );
  console.log("ok polymarket selection match by id or slug");
}

{
  // Compose refs store conditionId / tokenIds; suggestions expose conditionId.
  const refs = [
    { id: "", conditionId: "0xabc", tokenIds: ["999"] },
    { condition_id: "0xdef" },
  ];
  const tokens = polymarketSelectionTokenSet(refs);
  assert.ok(isPolymarketSelectionMatch({ conditionId: "0xABC" }, tokens), "case-insensitive cond");
  assert.ok(isPolymarketSelectionMatch({ tokenId: "999" }, tokens), "token id from array");
  assert.ok(isPolymarketSelectionMatch({ conditionId: "0xdef" }, tokens), "snake_case cond");
  console.log("ok polymarket selection match across ref shapes");
}

{
  assert.equal(isPolymarketSelectionMatch({ id: "1" }, polymarketSelectionTokenSet([])), false);
  assert.equal(isPolymarketSelectionMatch({ id: "1" }, null), false);
  assert.equal(isPolymarketSelectionMatch(null, polymarketSelectionTokenSet([{ id: "1" }])), false);
  console.log("ok polymarket selection match empty guards");
}
