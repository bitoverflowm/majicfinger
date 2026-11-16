import assert from "node:assert/strict";
import {
  clipTweet,
  formatMainPost,
  formatMarketReply,
  formatNewsThread,
  formatNewsThreads,
  formatVolume,
  X_CHAR_LIMIT,
} from "./format.js";
import { dryRunOnePulseItem, dryRunDemoItems } from "./pipeline.js";
import { xNewsEnvStatus, xNewsKillSwitchOn, xNewsLiveGate } from "./xClient.js";
import { postNewsThread } from "./deliver.js";
import { NEWS_PULSE_DEMO_ITEMS } from "@/lib/newsPulse.js";

{
  assert.equal(formatVolume(1_250_000), "$1.3M");
  assert.equal(formatVolume(950), "$950");
  assert.equal(formatVolume(12_400), "$12K");
  assert.equal(formatVolume(null), null);
  assert.equal(formatVolume(0), null);
}

{
  const main = formatMainPost({
    headline: "Fed officials signal openness to a June rate cut if inflation cools further",
    source: "Reuters",
    url: "https://www.reuters.com/markets/us/fed-june-cut/",
  });
  assert.match(main, /Fed officials/);
  assert.match(main, /via Reuters/);
  assert.match(main, /reuters\.com/);
  assert.ok(main.length <= X_CHAR_LIMIT);
}

{
  // Prefer fitting without URL when headline+source+url would overflow.
  const long = "A".repeat(250);
  const main = formatMainPost({
    headline: long,
    source: "Bloomberg",
    url: "https://www.bloomberg.com/" + "x".repeat(80),
  });
  assert.match(main, /via Bloomberg/);
  assert.ok(!main.includes("bloomberg.com/x"));
  assert.ok(main.length <= X_CHAR_LIMIT);
}

{
  const reply = formatMarketReply({
    venue: "polymarket",
    title: "Fed decision in June?",
    url: "https://polymarket.com/event/fed-decision-in-june",
    price: 0.42,
    price_change: 0.035,
    volume_24h: 2_400_000,
  });
  assert.match(reply, /Polymarket/);
  assert.match(reply, /Fed decision/);
  assert.match(reply, /42¢/);
  assert.match(reply, /\+3\.5¢/);
  assert.match(reply, /vol \$2\.4M/);
  assert.match(reply, /polymarket\.com/);
  assert.ok(reply.length <= X_CHAR_LIMIT);
}

{
  const thread = formatNewsThread(NEWS_PULSE_DEMO_ITEMS[0]);
  assert.equal(thread.skipped, false);
  assert.ok(thread.main);
  assert.ok(thread.replies.length >= 2);
  assert.match(thread.replies[0], /Polymarket|Kalshi/);
  assert.match(thread.replies.at(-1), /lycheedata\.com\/news/);
}

{
  const skip = formatNewsThread({ headline: "No markets here", url: "https://example.com", source: "X", markets: [] });
  assert.equal(skip.skipped, true);
  assert.equal(skip.reason, "no_markets");
  assert.ok(skip.main);
}

{
  const drafts = formatNewsThreads(NEWS_PULSE_DEMO_ITEMS, { limit: 1 });
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].source, "Reuters");
  assert.ok(drafts[0].thread.main);
}

{
  assert.equal(clipTweet("short"), "short");
  const clipped = clipTweet("word ".repeat(100), 40);
  assert.ok(clipped.length <= 40);
  assert.ok(clipped.endsWith("…"));
}

{
  // Kill-switch defaults ON; live gate must refuse @lychee_news without unlock.
  assert.equal(xNewsKillSwitchOn(), true);
  const gate = xNewsLiveGate();
  assert.equal(gate.allowed, false);
  assert.ok(gate.reasons.includes("kill_switch"));
  assert.ok(gate.reasons.includes("live_flag_off"));
  assert.ok(gate.reasons.includes("lychee_news_warmup"));
  const env = xNewsEnvStatus();
  assert.equal(env.username, "lychee_news");
  assert.equal(env.can_post, false);
  assert.equal(env.dry_run_default, true);
}

{
  const one = dryRunOnePulseItem(NEWS_PULSE_DEMO_ITEMS[0]);
  assert.equal(one.dry_run, true);
  assert.ok(one.tweets.length >= 2);
  assert.equal(one.tweets[0], one.thread.main);
}

{
  const demo = dryRunDemoItems({ limit: 2 });
  assert.equal(demo.length, 2);
}

{
  // deliver must not call create-tweet when gates fail (no OAuth / kill-switch).
  const result = await postNewsThread(
    {
      main: "Test headline\nvia Reuters",
      replies: ["Polymarket · Fed · 42¢"],
    },
    { forceLive: true },
  );
  assert.equal(result.dry_run, true);
  assert.equal(result.posted, false);
  assert.ok(result.gate_reasons?.length);
  assert.ok(result.tweets?.[0]?.includes("Test headline"));
}

{
  const prevKill = process.env.X_NEWS_KILL_SWITCH;
  const prevLive = process.env.X_NEWS_LIVE;
  const prevAllow = process.env.X_NEWS_ALLOW_LYCHEE_NEWS;
  process.env.X_NEWS_KILL_SWITCH = "0";
  process.env.X_NEWS_LIVE = "1";
  delete process.env.X_NEWS_ALLOW_LYCHEE_NEWS;
  try {
    const gate = xNewsLiveGate();
    assert.equal(gate.allowed, false);
    assert.ok(gate.reasons.includes("lychee_news_warmup"));
    assert.ok(!gate.reasons.includes("kill_switch"));
    assert.ok(!gate.reasons.includes("live_flag_off"));
  } finally {
    if (prevKill === undefined) delete process.env.X_NEWS_KILL_SWITCH;
    else process.env.X_NEWS_KILL_SWITCH = prevKill;
    if (prevLive === undefined) delete process.env.X_NEWS_LIVE;
    else process.env.X_NEWS_LIVE = prevLive;
    if (prevAllow === undefined) delete process.env.X_NEWS_ALLOW_LYCHEE_NEWS;
    else process.env.X_NEWS_ALLOW_LYCHEE_NEWS = prevAllow;
  }
}

console.log("lycheeNews/format.test.js: ok");
