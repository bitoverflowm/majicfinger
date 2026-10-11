import assert from "node:assert/strict";

import {
  CLIP,
  canvasGridMetrics,
  heightForRows,
  rowsOf,
  setCanvasGridWidth,
  snapMove,
  snapResize,
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

const neighbor = { id: "other", x: xForCol(0), y: yForRow(1), w: widthForSpan(12), h: heightForRows(8) };
const nudged = snapMove({ ...block, x: xForCol(0), y: yForRow(1) }, [neighbor]);
assert.ok(nudged.y >= yForRow(1) + heightForRows(8) - 1);

console.log("clipLayout.test.js ok");
