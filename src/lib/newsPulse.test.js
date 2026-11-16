import assert from "node:assert/strict";
import { mergePulsePairs, pickKalshiMatch, pulseArticleUrl } from "./newsPulseFormat.js";

{
  const best = pickKalshiMatch("Fed decision in June?", [
    { title: "Will bitcoin hit 150k?", ticker: "BTC" },
    { title: "Fed funds rate after June FOMC", ticker: "KXFED" },
  ]);
  assert.equal(best?.ticker, "KXFED");
  assert.equal(best?.venue, "kalshi");
  assert.match(best.url, /kalshi\.com\/markets\/KXFED/);
}

{
  const none = pickKalshiMatch("Nvidia earnings beat", [
    { title: "Will the Lakers win the NBA Finals?", ticker: "NBA" },
  ]);
  assert.equal(none, null);
}

{
  const items = mergePulsePairs([
    {
      article: {
        title: "Fed signals June cut",
        url: "https://reuters.com/a",
        source: "Reuters",
        t: 2_000,
      },
      markets: [
        {
          venue: "polymarket",
          title: "Fed decision in June?",
          url: "https://polymarket.com/event/fed",
          condition_id: "0x1",
        },
      ],
    },
    {
      article: {
        title: "Fed signals June cut",
        url: "https://reuters.com/a",
        source: "Reuters",
        t: 3_000,
      },
      markets: [
        {
          venue: "kalshi",
          title: "Fed funds rate after June",
          url: "https://kalshi.com/markets/KXFED",
          ticker: "KXFED",
        },
      ],
    },
    {
      article: { title: "Unrelated with no markets", url: "https://x.com", source: "X", t: 9_000 },
      markets: [],
    },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].headline, "Fed signals June cut");
  assert.equal(items[0].source, "Reuters");
  assert.equal(items[0].t, 3_000);
  assert.equal(items[0].markets.length, 2);
  assert.deepEqual(
    items[0].markets.map((m) => m.venue).sort(),
    ["kalshi", "polymarket"],
  );
}

{
  assert.equal(
    pulseArticleUrl({
      publisher_url: null,
      url: "https://news.google.com/rss/articles/CBMiOPAQUE",
    }),
    null,
  );
  assert.equal(
    pulseArticleUrl({
      publisher_url: "https://www.reuters.com/world/example/",
      url: "https://news.google.com/rss/articles/CBMiOPAQUE",
    }),
    "https://www.reuters.com/world/example/",
  );

  const items = mergePulsePairs([
    {
      article: {
        title: "Fed signals June cut",
        url: "https://news.google.com/rss/articles/CBMiOPAQUE",
        google_url: "https://news.google.com/rss/articles/CBMiOPAQUE",
        publisher_url: null,
        source: "Reuters",
        t: 4_000,
      },
      markets: [
        {
          venue: "polymarket",
          title: "Fed decision in June?",
          url: "https://polymarket.com/event/fed",
          condition_id: "0x1",
        },
      ],
    },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].url, null);
  assert.equal(items[0].headline, "Fed signals June cut");
}

console.log("newsPulse.test.js: ok");
