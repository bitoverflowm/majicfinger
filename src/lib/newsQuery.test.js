import assert from "node:assert/strict";
import { articleKey, cleanTerms, gapLabel, headlineHits, marketNewsTerms, mergeArticles, newsAround, newsQuery } from "./newsQuery.js";
import { decodeGoogleNewsUrl, gdeltArticles, gdeltTime, gdeltVolume, parseGdeltDate, parseGoogleNewsRss, readGdelt, withinWindow } from "./newsSources.js";
import { filterTradesByRange, toUnixSeconds } from "./mcp/data/tradeTime.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("market titles lead with their first name", () => {
  const hegseth = marketNewsTerms("Pete Hegseth out as Secretary of Defense by December 31?");
  assert.deepEqual(hegseth.terms, ["Pete Hegseth"]);
  assert.ok(hegseth.suggestions.includes("Hegseth"));
  assert.ok(hegseth.suggestions.includes("Secretary of Defense"));
});

test("a one-word lead gets a second term", () => {
  assert.deepEqual(marketNewsTerms("Will the Republicans win the Nebraska Senate race in 2026?").terms, ["Republicans", "Nebraska Senate"]);
  assert.deepEqual(marketNewsTerms("MicroStrategy sells any Bitcoin by May 31, 2026?").terms, ["MicroStrategy", "Bitcoin"]);
  assert.deepEqual(marketNewsTerms("Fed decreases interest rates by 25 bps after December 2025 meeting?").terms, ["Fed", "interest"]);
  assert.deepEqual(marketNewsTerms("Will Bitcoin reach $150,000 by December 31, 2026?").terms, ["Bitcoin"]);
});

test("club suffixes and market boilerplate are dropped", () => {
  const match = marketNewsTerms("Sutton United FC vs. Boston United FC: Both Teams to Score", "Sutton United FC vs. Boston United FC - More Markets");
  assert.deepEqual(match.terms, ["Sutton United", "Boston United"]);
  assert.ok(!match.suggestions.includes("Markets"));
  assert.ok(!match.suggestions.includes("Both Teams"));
});

test("names too short to search are skipped", () => {
  assert.deepEqual(marketNewsTerms("US x Iran ceasefire by November 30?").terms, ["Iran", "ceasefire"]);
});

test("the event title fills in when the question has no names", () => {
  assert.deepEqual(marketNewsTerms("Yes", "Super Bowl Champion 2027").terms, ["Super Bowl Champion"]);
});

test("terms are cleaned and phrases quoted", () => {
  assert.deepEqual(cleanTerms(["  Pete   Hegseth ", "pete hegseth", '"Fed"', "x"]), ["Pete Hegseth", "Fed"]);
  assert.equal(newsQuery(["Pete Hegseth", "Fed", "Counter-Strike"]), '"Pete Hegseth" Fed "Counter-Strike"');
});

test("headline hits count a name by its last word", () => {
  assert.equal(headlineHits("Hegseth faces impeachment vote", ["Pete Hegseth"]), 1);
  assert.equal(headlineHits("Defense budget passes", ["Pete Hegseth"]), 0);
  assert.equal(articleKey("Hegseth: 'A hard yes' — BBC"), "hegseth a hard yes bbc");
});

test("the same story from two providers merges, keeping the sharper time and direct link", () => {
  const merged = mergeArticles([
    [{ title: "Jeffries backs impeaching Hegseth", url: "https://news.google.com/x", source: "BBC", t: 2_000, precision: "exact", provider: "google" }],
    [
      { title: "Jeffries backs impeaching Hegseth", url: "https://bbc.com/a", source: "bbc.com", t: 1_000, precision: "seen", provider: "gdelt" },
      { title: "Another story", url: "https://x.com/b", source: "x.com", t: 3_000, precision: "seen", provider: "gdelt" },
    ],
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].title, "Another story");
  assert.deepEqual(merged[1].providers, ["google", "gdelt"]);
  assert.equal(merged[1].url, "https://bbc.com/a");
  assert.equal(merged[1].source, "BBC");
  assert.equal(merged[1].t, 1_000);
});

test("news around a trade ignores date-only articles", () => {
  const articles = [
    { id: "a", t: 100, precision: "exact" },
    { id: "b", t: 400, precision: "seen" },
    { id: "c", t: 250, precision: "day" },
    { id: "d", t: 10_000, precision: "exact" },
  ];
  const { before, after } = newsAround(articles, 200, 1_000);
  assert.equal(before.id, "a");
  assert.equal(after.id, "b");
  assert.equal(gapLabel(42 * 60_000), "42 min");
  assert.equal(gapLabel(-190 * 60_000), "3 h 10 min");
  assert.equal(gapLabel(2 * 24 * 60 * 60_000), "2 days");
});

test("GDELT dates, plain-text errors and responses parse", () => {
  const t = parseGdeltDate("20261108T193000Z");
  assert.equal(t, Date.UTC(2026, 10, 8, 19, 30, 0));
  assert.equal(gdeltTime(t), "20261108193000");
  assert.deepEqual(readGdelt("Please limit requests to one every 5 seconds"), { limited: true });
  assert.equal(readGdelt("The specified phrase is too short.").message, "The specified phrase is too short.");
  assert.deepEqual(readGdelt(""), { json: {} });
  const articles = gdeltArticles({ articles: [{ url: "https://a.com/x", title: "Hello", seendate: "20261108T193000Z", domain: "a.com" }] });
  assert.equal(articles[0].precision, "seen");
  assert.equal(articles[0].t, t);
  const volume = gdeltVolume({ timeline: [{ data: [{ date: "20261108T194500Z", value: 3 }, { date: "20261108T193000Z", value: 1 }] }] });
  assert.deepEqual(volume.map((point) => point.count), [1, 3]);
});

test("Google News items parse, with date-only times flagged", () => {
  const xml = `<rss><channel>
    <item><title>Jeffries &amp; Hegseth: &#39;hard yes&#39; - BBC</title><link>https://news.google.com/rss/articles/1</link>
      <pubDate>Sun, 08 Nov 2026 19:36:41 GMT</pubDate><source url="https://www.bbc.com">BBC</source></item>
    <item><title>Older story - The Hill</title><link>https://news.google.com/rss/articles/2</link>
      <pubDate>Fri, 02 Oct 2026 07:00:00 GMT</pubDate><source url="https://thehill.com">The Hill</source></item>
  </channel></rss>`;
  const items = parseGoogleNewsRss(xml);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Jeffries & Hegseth: 'hard yes'");
  assert.equal(items[0].domain, "bbc.com");
  assert.equal(items[0].precision, "second");
  assert.equal(items[0].timezone, "UTC");
  assert.equal(items[0].timestamp_type, "google_rss_pubDate");
  assert.equal(items[1].precision, "day");
  const day = 24 * 60 * 60_000;
  const kept = withinWindow(items, Date.UTC(2026, 9, 2, 12), Date.UTC(2026, 9, 2, 12) + day);
  assert.deepEqual(kept.map((item) => item.title), ["Older story"]);
});

test("Google News wrapper URLs decode to the publisher article", () => {
  const publisher = "https://www.timesofisrael.com/example-story/";
  const id = Buffer.from(publisher, "utf8").toString("base64url");
  const wrapped = `https://news.google.com/rss/articles/${id}`;
  const decoded = decodeGoogleNewsUrl(wrapped);
  assert.equal(decoded.publisher_url, publisher);
  assert.equal(decoded.google_url, wrapped);
});

test("trade date filter drops rows outside the UTC window", () => {
  assert.equal(toUnixSeconds("2026-11-04T08:00:00Z"), Math.floor(Date.parse("2026-11-04T08:00:00Z") / 1000));
  const rows = [
    { timestamp: "2026-11-13T12:00:00Z", id: "late" },
    { timestamp: 1793779200, id: "hit" },
    { timestamp: 1793779200 * 1000, id: "hit-ms" },
    { timestamp: "2026-11-01T00:00:00Z", id: "early" },
  ];
  const kept = filterTradesByRange(rows, "2026-11-04T00:00:00Z", "2026-11-04T23:59:59Z");
  assert.deepEqual(kept.map((row) => row.id), ["hit", "hit-ms"]);
});
