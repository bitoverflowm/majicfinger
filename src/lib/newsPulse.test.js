import assert from "node:assert/strict";
import {
  formatPulsePrice,
  formatPulsePriceChange,
  mergePulsePairs,
  pickKalshiMatch,
  pulseArticleUrl,
} from "./newsPulseFormat.js";
import { kalshiCandlesToHistory, priceChangeFromHistory } from "./newsPulsePrices.js";

{
  const best = pickKalshiMatch("Fed decision in June?", [
    { title: "Will bitcoin hit 150k?", ticker: "BTC", yes_price: 0.1 },
    { title: "Fed funds rate after June FOMC", ticker: "KXFED", yes_price: 0.44 },
  ]);
  assert.equal(best?.ticker, "KXFED");
  assert.equal(best?.venue, "kalshi");
  assert.equal(best?.price, 0.44);
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

{
  assert.equal(formatPulsePrice(0.255), "26¢");
  assert.equal(formatPulsePrice(0.042), "4.2¢");
  assert.equal(formatPulsePriceChange(0.035), "+3.5¢");
  assert.equal(formatPulsePriceChange(-0.04), "−4.0¢");
}

{
  const article = Date.parse("2026-03-12T14:00:00Z");
  const points = [
    { tMs: article - 3_600_000, p: 0.4 },
    { tMs: article - 60_000, p: 0.42 },
    { tMs: article + 3_600_000, p: 0.47 },
  ];
  const sinceArticle = priceChangeFromHistory(points, article, article + 3_600_000);
  assert.equal(sinceArticle.price_change_window, "since_article");
  assert.equal(sinceArticle.price, 0.47);
  assert.equal(sinceArticle.price_change, 0.05);

  const trailing = priceChangeFromHistory(
    [
      { tMs: article - 8 * 3_600_000, p: 0.3 },
      { tMs: article - 7 * 3_600_000, p: 0.31 },
      { tMs: article + 1_000, p: 0.4 },
    ],
    article - 48 * 3_600_000,
    article + 1_000,
  );
  assert.equal(trailing.price_change_window, "trailing_6h");
  assert.equal(trailing.price, 0.4);
}

{
  const map = kalshiCandlesToHistory([
    {
      market_ticker: "kxfed",
      candlesticks: [
        { end_period_ts: 100, price: { close_dollars: "0.40" } },
        { end_period_ts: 200, yes_bid: { close_dollars: "0.45" } },
      ],
    },
  ]);
  assert.equal(map.get("KXFED")?.length, 2);
  assert.equal(map.get("KXFED")[1].p, 0.45);
}

console.log("newsPulse.test.js: ok");
