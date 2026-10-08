import assert from "node:assert/strict";

import { buildShareModel, formatShareChange, shareCaption } from "./dashboardShareModel.js";

const price = {
  id: "wti-prices",
  type: "sheet",
  title: "Price History",
  table: "getBatchPricesHistory",
  columns: [{ id: "timestamp" }, { id: "p" }],
  cells: {
    "0,0": "2026-10-01T00:00:00Z",
    "1,0": "0.55",
    "0,1": "2026-10-08T00:00:00Z",
    "1,1": "0.40",
  },
  pull: {
    marketTitle: "Will WTI hit $150?",
    side: "Yes",
    openAt: Date.parse("2026-09-25T00:00:00Z"),
    closeAt: Date.parse("2026-10-31T00:00:00Z"),
    closed: false,
  },
};

const book = {
  id: "wti-book",
  type: "sheet",
  title: "Order book · WTI",
  table: "getOrderbooks",
  columns: [{ id: "side" }, { id: "price" }, { id: "size" }, { id: "outcome" }],
  cells: {
    "0,0": "buy",
    "1,0": "0.47",
    "2,0": "100",
    "3,0": "Yes",
    "0,1": "sell",
    "1,1": "0.49",
    "2,1": "40",
    "3,1": "Yes",
  },
  pull: { marketTitle: "Will WTI hit $150?", side: "Yes", ticker: "will-wti" },
};

const catalog = {
  id: "catalog",
  type: "sheet",
  title: "Markets",
  columns: [{ id: "question" }],
  cells: { "0,0": "Question A", "0,1": "Question B" },
};

const model = buildShareModel({
  dashboardName: "Untitled 4",
  activeTabId: "tab-a",
  tabs: [
    { id: "tab-a", name: "Untitled 4" },
    { id: "tab-b", name: "Welcome" },
  ],
  blocksByPage: {
    "welcome:tab-a": [price, book, { id: "chart-1", type: "chart", title: "Price History chart" }],
    "welcome:tab-b": [catalog],
  },
});

const wti = model.assets.find((asset) => asset.id === "wti-prices");
assert.equal(wti.kind, "price");
assert.equal(wti.last, 0.4);
assert.ok(wti.changePct < 0);
assert.equal(formatShareChange(wti.changePct), "−27.27%");

const ladder = model.assets.find((asset) => asset.id === "wti-book");
assert.equal(ladder.kind, "book");
assert.equal(ladder.mid, 0.48);

assert.ok(model.configs.some((config) => config.id === "story:wti-prices"));
assert.ok(model.configs.some((config) => config.id === "combo:tab-a"));
assert.ok(model.configs.some((config) => config.id === "book:wti-book"));
assert.ok(model.configs.some((config) => config.id === "workspace"));
assert.equal(model.configs[0].id, "combo:tab-a");

const caption = shareCaption([wti], "Untitled 4");
assert.match(caption, /Will WTI hit \$150\?/);
assert.match(caption, /0\.400/);
assert.match(caption, /Created with Lychee/);

const catalogAsset = model.assets.find((asset) => asset.id === "catalog");
assert.equal(catalogAsset.kind, "sheet");
assert.equal(catalogAsset.market, "");

console.log("dashboardShareModel.node.test.js ok");
