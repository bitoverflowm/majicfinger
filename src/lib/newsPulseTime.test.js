import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatRelativeAgo } from "./newsPulseTime.js";

describe("formatRelativeAgo", () => {
  const now = Date.UTC(2026, 10, 16, 16, 0, 0);

  it("uses seconds, minutes, hours, and days", () => {
    assert.equal(formatRelativeAgo(now, now), "just now");
    assert.equal(formatRelativeAgo(now - 1_000, now), "1 second ago");
    assert.equal(formatRelativeAgo(now - 45_000, now), "45 seconds ago");
    assert.equal(formatRelativeAgo(now - 60_000, now), "1 minute ago");
    assert.equal(formatRelativeAgo(now - 12 * 60_000, now), "12 minutes ago");
    assert.equal(formatRelativeAgo(now - 3_600_000, now), "1 hour ago");
    assert.equal(formatRelativeAgo(now - 5 * 3_600_000, now), "5 hours ago");
    assert.equal(formatRelativeAgo(now - 86_400_000, now), "1 day ago");
    assert.equal(formatRelativeAgo(now - 3 * 86_400_000, now), "3 days ago");
  });
});
