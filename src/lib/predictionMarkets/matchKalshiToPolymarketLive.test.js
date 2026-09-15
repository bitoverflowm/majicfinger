import assert from "node:assert/strict";
import {
  buildPolymarketMatchQueryFromKalshi,
  cleanKalshiTextForPolymarketSearch,
  findPolymarketLiveMatchesForKalshi,
  inferKalshiAssetHorizon,
  preferredKalshiSearchText,
  polymarketHorizonFromSlug,
  polymarketMatchQueriesFromKalshi,
  polymarketSeriesSlugFromKalshi,
  rankPolymarketCandidatesForKalshi,
  scoreKalshiToPolymarketPair,
} from "./matchKalshiToPolymarketLive.js";

const kalshi15m = {
  ticker: "KXBTC15M-26SEP15-123",
  seriesTicker: "KXBTC15M",
  title: "BTC 15 min · $77,250.27 target — BTC price up in next 15 mins?",
  eventTitle: "BTC 15 min · $77,250.27 target",
  tags: ["Crypto", "BTC"],
};

{
  const cleaned = cleanKalshiTextForPolymarketSearch(kalshi15m.title);
  assert.ok(!cleaned.includes("77,250"));
  assert.ok(!/\$/.test(cleaned));
  assert.match(cleaned, /BTC price up/i);
}

{
  const preferred = preferredKalshiSearchText(kalshi15m);
  assert.equal(preferred, "BTC price up in next 15 mins?");
}

{
  const inferred = inferKalshiAssetHorizon(kalshi15m);
  assert.equal(inferred.asset, "btc");
  assert.equal(inferred.horizon, "15m");
  assert.equal(polymarketSeriesSlugFromKalshi(kalshi15m), "btc-up-or-down-15m");
}

{
  const query = buildPolymarketMatchQueryFromKalshi(kalshi15m);
  assert.match(query, /Bitcoin Up or Down 15m/i);
  assert.doesNotMatch(query, /15 minutes/i);
  assert.doesNotMatch(query, /77,250/);
}

{
  assert.equal(polymarketHorizonFromSlug("btc-updown-15m-1789456500"), "15m");
  assert.equal(polymarketHorizonFromSlug("btc-updown-5m-1789457100"), "5m");
  assert.equal(
    polymarketHorizonFromSlug(
      "microstrategy-announces-1000-btc-purchase-september-15-21-2026",
      "Microstrategy announces > 1000 BTC purchases September 15-21",
    ),
    null,
  );
}

{
  const nowMs = Date.parse("2026-09-15T07:20:00Z");
  const updown = scoreKalshiToPolymarketPair(
    kalshi15m,
    {
      title: "Bitcoin Up or Down - September 15, 3:15AM-3:30AM ET",
      slug: "btc-updown-15m-1789456500",
      startDate: "2026-09-15T07:15:00Z",
      endDate: "2026-09-15T07:30:00Z",
      tags: ["Crypto"],
    },
    { nowMs },
  );
  const fiveMin = scoreKalshiToPolymarketPair(
    kalshi15m,
    {
      title: "Bitcoin Up or Down - September 15, 3:25AM-3:30AM ET",
      slug: "btc-updown-5m-1789457100",
      tags: ["Crypto"],
    },
    { nowMs },
  );
  const micro = scoreKalshiToPolymarketPair(
    kalshi15m,
    {
      title: "Microstrategy announces > 1000 BTC purchases September 15-21",
      slug: "microstrategy-announces-1000-btc-purchase-september-15-21-2026",
      tags: ["Crypto"],
    },
    { nowMs },
  );
  assert.ok(updown.score > fiveMin.score);
  assert.ok(updown.score > micro.score);
  assert.ok(["exact", "close"].includes(updown.tier));
  assert.equal(fiveMin.tier, "none");
  assert.equal(micro.tier, "none");

  const ranked = rankPolymarketCandidatesForKalshi(
    kalshi15m,
    [
      { title: "Microstrategy announces > 1000 BTC purchases September 15-21", slug: "mstr" },
      { title: "Bitcoin Up or Down - September 15, 3:25AM-3:30AM ET", slug: "btc-updown-5m-1789457100" },
      {
        title: "Bitcoin Up or Down - September 15, 3:15AM-3:30AM ET",
        slug: "btc-updown-15m-1789456500",
      },
    ],
    { nowMs },
  );
  assert.equal(ranked.length, 1);
  assert.match(String(ranked[0].market.slug), /btc-updown-15m/);
}

{
  const nowMs = Date.parse("2026-09-15T07:20:00Z");
  const result = await findPolymarketLiveMatchesForKalshi(kalshi15m, {
    nowMs,
    fetchEventsBySeries: async (slug) => {
      assert.equal(slug, "btc-up-or-down-15m");
      return [
        {
          id: "2",
          slug: "btc-updown-15m-1789457400",
          title: "Bitcoin Up or Down - September 15, 3:30AM-3:45AM ET",
          closed: false,
          markets: [
            {
              id: "m2",
              slug: "btc-updown-15m-1789457400",
              question: "Bitcoin Up or Down - September 15, 3:30AM-3:45AM ET",
              conditionId: "0xdef",
              closed: false,
              clobTokenIds: '["tok-up-next","tok-down-next"]',
              outcomes: '["Up","Down"]',
            },
          ],
        },
        {
          id: "1",
          slug: "btc-updown-15m-1789456500",
          title: "Bitcoin Up or Down - September 15, 3:15AM-3:30AM ET",
          closed: false,
          markets: [
            {
              id: "m1",
              slug: "btc-updown-15m-1789456500",
              question: "Bitcoin Up or Down - September 15, 3:15AM-3:30AM ET",
              conditionId: "0xabc",
              closed: false,
              clobTokenIds: '["tok-up","tok-down"]',
              outcomes: '["Up","Down"]',
            },
          ],
        },
      ];
    },
    fetchSuggestions: async () => {
      throw new Error("public-search should not run when series lookup hits");
    },
  });
  assert.equal(result.candidates.length, 2);
  assert.ok(result.preselected);
  assert.equal(result.preselected?.tier, "exact");
  assert.match(String(result.preselected?.market.slug), /btc-updown-15m-1789456500/);
  assert.equal(result.candidates[1]?.tier, "close");
}

{
  const nowMs = Date.parse("2026-09-15T07:20:00Z");
  const result = await findPolymarketLiveMatchesForKalshi(kalshi15m, {
    nowMs,
    fetchEventsBySeries: async () => [],
    fetchSuggestions: async () => ({
      suggestions: [
        {
          entity: "event",
          id: "micro",
          slug: "microstrategy-announces-1000-btc-purchase-september-15-21-2026",
          title: "Microstrategy announces > 1000 BTC purchases September 15-21",
          closed: false,
          raw: {
            slug: "microstrategy-announces-1000-btc-purchase-september-15-21-2026",
            title: "Microstrategy announces > 1000 BTC purchases September 15-21",
            closed: false,
            markets: [
              {
                id: "m-micro",
                slug: "microstrategy-announces-1000-btc-purchase-september-15-21-2026",
                question: "Microstrategy announces > 1000 BTC purchases September 15-21",
                conditionId: "0xmicro",
                closed: false,
                clobTokenIds: '["yes","no"]',
                outcomes: '["Yes","No"]',
              },
            ],
          },
        },
      ],
    }),
  });
  assert.equal(result.candidates.length, 0);
  assert.equal(result.preselected, null);
}

{
  const tennis = {
    ticker: "KXWTACHALLENGERMATCH-26SEP15ITOKNU-KNU",
    seriesTicker: "KXWTACHALLENGERMATCH",
    title: "Ito vs Knutson — Gabriela Knutson wins",
    eventTitle: "Ito vs Knutson",
    tags: ["Sports", "Tennis"],
  };
  const queries = polymarketMatchQueriesFromKalshi(tennis);
  assert.equal(queries[0], "Ito vs Knutson");
  assert.ok(queries.includes("Gabriela Knutson wins"));

  const scored = scoreKalshiToPolymarketPair(tennis, {
    title: "Caldas da Rainha: Aoi Ito vs Gabriela Knutson",
    slug: "caldas-da-rainha-aoi-ito-vs-gabriela-knutson",
    outcomes: ["Aoi Ito", "Gabriela Knutson"],
    closed: false,
  });
  assert.notEqual(scored.tier, "none");
  assert.ok(scored.score >= 0.18);

  const result = await findPolymarketLiveMatchesForKalshi(tennis, {
    fetchEventsBySeries: async () => {
      throw new Error("tennis should not use crypto series lookup");
    },
    fetchSuggestions: async (q) => {
      assert.match(String(q), /Ito vs Knutson|Gabriela Knutson/i);
      return {
        suggestions: [
          {
            entity: "market",
            id: "tennis-1",
            slug: "caldas-da-rainha-aoi-ito-vs-gabriela-knutson",
            title: "Caldas da Rainha: Aoi Ito vs Gabriela Knutson",
            closed: false,
            raw: {
              slug: "caldas-da-rainha-aoi-ito-vs-gabriela-knutson",
              question: "Caldas da Rainha: Aoi Ito vs Gabriela Knutson",
              conditionId: "0xtennis",
              closed: false,
              clobTokenIds: '["tok-ito","tok-knutson"]',
              outcomes: '["Aoi Ito","Gabriela Knutson"]',
            },
          },
        ],
      };
    },
  });
  assert.equal(result.candidates.length, 1);
  assert.equal(result.preselected, null);
  assert.match(String(result.candidates[0]?.market.title), /Aoi Ito vs Gabriela Knutson/);
}
