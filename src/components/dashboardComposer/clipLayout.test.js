import assert from "node:assert/strict";

import {
  CLIP,
  canvasGridMetrics,
  heightForRows,
  rowsOf,
  setCanvasGridWidth,
  snapMove,
  snapResize,
  snapResizeEdges,
  packReadingOrder,
  separateOverlaps,
  spanOf,
  widthForSpan,
  xForCol,
  yForRow,
} from "./clipLayout.js";

setCanvasGridWidth(1142);
const grid = canvasGridMetrics();

assert.equal(CLIP.cols, 24);
assert.equal(grid.cols, 24);
assert.ok(grid.track > 20);
assert.equal(widthForSpan(24), Math.round(grid.inner));
assert.equal(xForCol(0), CLIP.x0);
assert.ok(widthForSpan(1) < widthForSpan(2));
assert.ok(widthForSpan(12) < widthForSpan(24));
assert.equal(spanOf({ w: widthForSpan(1) }), 1);
assert.equal(spanOf({ w: widthForSpan(12) }), 12);
assert.equal(spanOf({ w: widthForSpan(24) }), 24);
assert.equal(rowsOf({ h: heightForRows(2) }), 2);
assert.equal(yForRow(0), CLIP.originY);
assert.ok(yForRow(3) > yForRow(2));

const block = { id: "sheet", x: CLIP.x0 + 3, y: CLIP.originY + 4, w: widthForSpan(12), h: heightForRows(8) };
const moved = snapMove({ ...block, x: block.x + grid.unit * 0.6, y: block.y + grid.unit * 0.6 }, []);
assert.equal(moved.x, xForCol(1));
assert.equal(moved.y, yForRow(1));
assert.equal(moved.w, widthForSpan(12));

const resized = snapResize(block, widthForSpan(12) + grid.unit * 0.7, heightForRows(8) + grid.unit * 0.6, []);
assert.equal(resized.x, xForCol(0));
assert.equal(resized.w, widthForSpan(13));
assert.equal(resized.h, heightForRows(9));

const anchored = { id: "anchored", x: xForCol(4), y: yForRow(2), w: widthForSpan(6), h: heightForRows(4) };
const pulledWest = snapResizeEdges(
  anchored,
  { x: anchored.x - grid.unit * 1.6, y: anchored.y, w: anchored.w + grid.unit * 1.6, h: anchored.h },
  { left: true },
  [],
);
assert.equal(pulledWest.x, xForCol(2));
assert.equal(pulledWest.w, widthForSpan(8));
assert.equal(pulledWest.y, yForRow(2));

const neighbor = { id: "other", x: xForCol(0), y: yForRow(1), w: widthForSpan(12), h: heightForRows(8) };
const nudged = snapMove({ ...block, x: xForCol(0), y: yForRow(1) }, [neighbor]);
assert.ok(nudged.y >= yForRow(1) + heightForRows(8) - 1);

function blockAt(id, col, row, span, rows) {
  return { id, type: "sheet", x: xForCol(col), y: yForRow(row), w: widthForSpan(span), h: heightForRows(rows) };
}

const quad = [
  blockAt("a", 0, 0, 12, 8),
  blockAt("b", 12, 0, 12, 8),
  blockAt("c", 0, 8, 12, 8),
  blockAt("d", 12, 8, 12, 8),
];
const withoutB = packReadingOrder(quad.filter((block) => block.id !== "b"));
assert.deepEqual(withoutB.map((block) => block.id), ["a", "c", "d"]);
assert.equal(withoutB[0].x, xForCol(0));
assert.equal(withoutB[0].y, yForRow(0));
assert.equal(withoutB[1].id, "c");
assert.equal(withoutB[1].x, xForCol(12));
assert.equal(withoutB[1].y, yForRow(0));
assert.equal(withoutB[2].id, "d");
assert.equal(withoutB[2].x, xForCol(0));
assert.equal(withoutB[2].y, yForRow(8));

const withoutA = packReadingOrder(quad.filter((block) => block.id !== "a"));
assert.equal(withoutA[0].id, "b");
assert.equal(withoutA[0].x, xForCol(0));
assert.equal(withoutA[0].y, yForRow(0));
assert.equal(withoutA[1].x, xForCol(12));
assert.equal(withoutA[1].y, yForRow(0));

const sideBySide = [
  blockAt("left", 0, 0, 12, 8),
  blockAt("right", 12, 0, 12, 8),
  blockAt("below", 0, 8, 12, 8),
];
const grown = { ...sideBySide[0], w: widthForSpan(16) };
const relieved = separateOverlaps([grown, sideBySide[1], sideBySide[2]]);
const right = relieved.find((block) => block.id === "right");
const below = relieved.find((block) => block.id === "below");
assert.equal(relieved.find((block) => block.id === "left").w, widthForSpan(16));
assert.ok(right.x >= grown.x + grown.w || right.y >= grown.y + grown.h);
assert.ok(right.x + right.w <= CLIP.x0 + widthForSpan(24) + 1);
assert.ok(below.y >= right.y + right.h - 1 || below.x >= right.x + right.w || right.x >= below.x + below.w);

const untouched = separateOverlaps(quad);
assert.equal(untouched[1].x, quad[1].x);
assert.equal(untouched[1].y, quad[1].y);

console.log("clipLayout.test.js ok");
