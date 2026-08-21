import assert from "node:assert/strict";
import {
  buildKalshiMatchQueryFromPolymarket,
  matchTierLabel,
  rankKalshiCandidatesForPolymarket,
  scorePolymarketKalshiMarketPair,
  tokenizeMatchText,
} from "./matchPolymarketToKalshiLive.js";

{
  const tokens = tokenizeMatchText("Will Benjamin Netanyahu be the next Prime Minister of Israel?");
  assert.ok(tokens.includes("netanyahu"));
  assert.ok(tokens.includes("israel"));
  assert.ok(!tokens.includes("will"));
}

{
  const q = buildKalshiMatchQueryFromPolymarket({
    title: "Will Benjamin Netanyahu be the next Prime Minister of Israel?",
    outcomes: ["Yes", "No"],
    tags: ["Politics"],
    endDateIso: "2026-12-01T00:00:00Z",
  });
  assert.match(q, /Netanyahu/i);
  assert.match(q, /Yes \/ No/);
  assert.match(q, /Politics/);
}

{
  const poly = {
    title: "Will Benjamin Netanyahu be the next Prime Minister of Israel?",
    outcomes: ["Yes", "No"],
    tags: ["Politics"],
    endDateIso: "2026-12-01T00:00:00Z",
    active: true,
  };
  const scored = scorePolymarketKalshiMarketPair(poly, {
    marketTicker: "KXNETANYAHU-26",
    title: "Netanyahu next Prime Minister of Israel",
    status: "open",
    closeTime: "2026-12-05T00:00:00Z",
    suggestionTitle: "Israel PM",
    raw: {},
  });
  assert.ok(scored.score > 0.4);
  assert.ok(["exact", "close", "related"].includes(scored.tier));
  assert.equal(matchTierLabel("close"), "Close match");
}

{
  const ranked = rankKalshiCandidatesForPolymarket(
    {
      title: "Fed rate decision March",
      outcomes: ["Yes", "No"],
      endDateIso: "2026-03-20T00:00:00Z",
    },
    [
      {
        ticker: "FED",
        title: "Fed funds rate",
        eventTicker: "FED-26MAR",
        category: "Economics",
        markets: [
          {
            ticker: "FED-26MAR-T5.00",
            yes_sub_title: "Fed rate above 5%",
            status: "open",
            close_time: "2026-03-19T00:00:00Z",
            last_price_dollars: 0.42,
          },
        ],
      },
    ],
  );
  assert.ok(ranked.length >= 1);
  assert.ok(ranked[0].market.marketTicker.includes("FED"));
}

console.log("ok matchPolymarketToKalshiLive");
