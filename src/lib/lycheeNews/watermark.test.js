import assert from "node:assert/strict";
import {
  enablementWatermark,
  filterLivePostCandidates,
  isLivePostEligible,
  parseLiveSince,
  resolveLiveWatermark,
} from "./watermark.js";
import { deliverPulseItem } from "./deliver.js";
import { buildLycheeNewsXPreview } from "./pipeline.js";

{
  assert.equal(parseLiveSince(null), null);
  assert.equal(parseLiveSince(""), null);
  assert.equal(parseLiveSince(1_700_000_000_000), 1_700_000_000_000);
  assert.equal(parseLiveSince("1700000000"), 1_700_000_000_000);
  assert.equal(parseLiveSince("2026-03-12T15:00:00Z"), Date.parse("2026-03-12T15:00:00Z"));
}

{
  // No watermark → refuse all (no backlog dump).
  const items = [
    { id: "a", t: 100, headline: "old" },
    { id: "b", t: 200, headline: "newer" },
  ];
  const none = filterLivePostCandidates(items, null);
  assert.equal(none.watermark_ms, null);
  assert.equal(none.eligible.length, 0);
  assert.equal(none.skipped_history, 2);
  assert.equal(none.reason, "no_watermark");
}

{
  const enable = Date.parse("2026-03-12T12:00:00Z");
  const items = [
    { id: "old", t: enable - 60_000, headline: "before" },
    { id: "edge", t: enable, headline: "at watermark" },
    { id: "new1", t: enable + 1_000, headline: "after 1" },
    { id: "new2", t: enable + 5_000, headline: "after 2" },
  ];
  const slice = filterLivePostCandidates(items, { live_since_ms: enable });
  assert.equal(slice.eligible.length, 2);
  assert.deepEqual(
    slice.eligible.map((i) => i.id),
    ["new1", "new2"],
  );
  assert.equal(slice.skipped_history, 2);
  assert.equal(isLivePostEligible(items[0], { live_since_ms: enable }), false);
  assert.equal(isLivePostEligible(items[2], { live_since_ms: enable }), true);
}

{
  // After last_posted high-water, don't re-post.
  const enable = 1_000;
  const items = [
    { id: "a", t: 2_000 },
    { id: "b", t: 3_000 },
    { id: "c", t: 4_000 },
  ];
  const slice = filterLivePostCandidates(items, {
    live_since_ms: enable,
    last_posted_item_t: 3_000,
    last_posted_id: "b",
  });
  assert.deepEqual(
    slice.eligible.map((i) => i.id),
    ["c"],
  );
}

{
  const stamp = enablementWatermark(5_000_000);
  assert.equal(stamp.live_since_ms, 5_000_000);
  assert.ok(stamp.live_since_iso);
  assert.equal(stamp.last_posted_id, null);
}

{
  const prev = process.env.X_NEWS_LIVE_SINCE;
  process.env.X_NEWS_LIVE_SINCE = "2026-01-01T00:00:00Z";
  try {
    assert.equal(resolveLiveWatermark(null), Date.parse("2026-01-01T00:00:00Z"));
    // Cursor wins over env.
    assert.equal(resolveLiveWatermark({ live_since_ms: 99 }), 99);
  } finally {
    if (prev === undefined) delete process.env.X_NEWS_LIVE_SINCE;
    else process.env.X_NEWS_LIVE_SINCE = prev;
  }
}

{
  const enable = Date.parse("2026-03-12T12:00:00Z");
  const blocked = await deliverPulseItem(
    { id: "old", t: enable - 1, headline: "Old", markets: [{ venue: "polymarket", title: "X", url: "https://x.com" }] },
    { forceLive: true, cursor: { live_since_ms: enable } },
  );
  assert.equal(blocked.posted, false);
  assert.equal(blocked.reason, "before_watermark");
}

{
  const enable = Date.now();
  const preview = await buildLycheeNewsXPreview({
    items: [
      {
        id: "hist",
        t: enable - 10_000,
        headline: "History stays on /news",
        source: "Reuters",
        url: "https://www.reuters.com/",
        markets: [{ venue: "polymarket", title: "Fed?", url: "https://polymarket.com/event/fed" }],
      },
      {
        id: "fresh",
        t: enable + 10_000,
        headline: "Fresh after go-live",
        source: "Bloomberg",
        url: "https://www.bloomberg.com/",
        markets: [{ venue: "polymarket", title: "Tariffs?", url: "https://polymarket.com/event/tariffs" }],
      },
    ],
    cursor: { live_since_ms: enable },
    limit: 8,
  });
  assert.equal(preview.dry_run, true);
  assert.equal(preview.count, 2);
  assert.equal(preview.live_candidate_count, 1);
  assert.equal(preview.live_drafts[0].id, "fresh");
  assert.equal(preview.watermark.skipped_history, 1);
}

console.log("lycheeNews/watermark.test.js: ok");
