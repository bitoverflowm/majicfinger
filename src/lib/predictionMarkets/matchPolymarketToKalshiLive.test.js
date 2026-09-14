import assert from "node:assert/strict";
import {
  buildKalshiMatchQueryFromPolymarket,
  findKalshiLiveMatchesForPolymarket,
  matchTierLabel,
  rankKalshiCandidatesForPolymarket,
  scorePolymarketKalshiMarketPair,
  tokenizeMatchText,
} from "./matchPolymarketToKalshiLive.js";
import {
  clipKalshiEmbeddingSearchQuery,
  KALSHI_EMBEDDING_SEARCH_QUERY_MAX,
  kalshiUpstreamErrorMessage,
} from "../kalshiLive/kalshiLiveEmbeddingSearch.js";

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

{
  assert.equal(KALSHI_EMBEDDING_SEARCH_QUERY_MAX, 128);
  assert.equal(clipKalshiEmbeddingSearchQuery("a".repeat(128)).length, 128);
  assert.ok(clipKalshiEmbeddingSearchQuery("a".repeat(200)).length <= 128);
  const nested = kalshiUpstreamErrorMessage(
    {
      error: {
        code: "invalid_parameters",
        message: "Some of your input is not valid",
        details: "Key: 'SearchSeriesRequest.Query' Error:Field validation for 'Query' failed on the 'max' tag",
      },
    },
    "fallback",
  );
  assert.match(nested, /not valid/i);
  assert.equal(kalshiUpstreamErrorMessage({}, "Bad Request"), "Bad Request");
}

{
  const q = buildKalshiMatchQueryFromPolymarket({
    title: "Will there be no change in Fed interest rates after the September 2026 meeting?",
    outcomes: ["Yes", "No"],
    tags: ["Economics"],
    endDateIso: "2026-09-17T00:00:00Z",
  });
  assert.ok(q.length <= KALSHI_EMBEDDING_SEARCH_QUERY_MAX);
  assert.match(q, /Fed interest rates/i);
  assert.doesNotMatch(q, /prediction market/i);
}

{
  const q = buildKalshiMatchQueryFromPolymarket({
    title: "Will ".concat("really long polymarket question words ").repeat(8),
    outcomes: ["Yes", "No"],
    tags: ["Politics"],
  });
  assert.ok(q.length <= KALSHI_EMBEDDING_SEARCH_QUERY_MAX);
}

{
  const result = await findKalshiLiveMatchesForPolymarket(
    {
      title: "Will there be no change in Fed interest rates after the September 2026 meeting?",
      outcomes: ["Yes", "No"],
    },
    {
      fetchSuggestions: async () => {
        throw new Error("Bad Request");
      },
    },
  );
  assert.equal(result.candidates.length, 0);
  assert.match(String(result.emptyMessage), /Kalshi/i);
}

console.log("ok matchPolymarketToKalshiLive");
