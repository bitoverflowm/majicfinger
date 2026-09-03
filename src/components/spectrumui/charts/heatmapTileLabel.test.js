import assert from "node:assert/strict";
import test from "node:test";
import { wrapTileLabel, labelCopyForTier, tileLabelFontSize } from "./heatmapTileLabel.js";

test("wrapTileLabel wraps to two lines and ellipsizes overflow", () => {
  const label = "Will Donald Trump win the 2024 US Presidential Election?";
  const { lines, truncated } = wrapTileLabel(label, {
    maxWidth: 120,
    fontSize: 11,
    maxLines: 2,
  });
  assert.equal(lines.length, 2);
  assert.equal(truncated, true);
  assert.ok(lines[1].endsWith("…"));
  for (const line of lines) {
    assert.ok(line.length > 0);
    assert.notEqual(line, label);
  }
});

test("wrapTileLabel keeps short labels on one line", () => {
  const { lines, truncated } = wrapTileLabel("Trump", {
    maxWidth: 200,
    fontSize: 12,
    maxLines: 2,
  });
  assert.deepEqual(lines, ["Trump"]);
  assert.equal(truncated, false);
});

test("wrapTileLabel ticker maxLines 1 truncates aggressively", () => {
  const { lines, truncated } = wrapTileLabel("Will Kamala Harris win the election", {
    maxWidth: 64,
    fontSize: 8,
    maxLines: 1,
  });
  assert.equal(lines.length, 1);
  assert.equal(truncated, true);
  assert.ok(lines[0].endsWith("…"));
});

test("labelCopyForTier shortens compact and ticker copy", () => {
  const long = "Will Donald Trump win the 2024 US Presidential Election?";
  assert.ok(labelCopyForTier(long, "ticker").split(/\s+/).length <= 2);
  assert.ok(labelCopyForTier(long, "compact").split(/\s+/).length <= 5);
  assert.equal(labelCopyForTier(long, "full"), long);
});

test("tileLabelFontSize shrinks for longer labels", () => {
  const short = tileLabelFontSize(90, 60, "Trump", "full");
  const long = tileLabelFontSize(
    90,
    60,
    "Will Donald Trump win the 2024 US Presidential Election?",
    "full",
  );
  assert.ok(long < short);
});
