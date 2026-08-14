import assert from "node:assert/strict";
import {
  expandLiveVolumeToMarketRows,
  liveEventVolumeLayoutIncludesMetadata,
  liveEventVolumeLayoutIsPerEvent,
  normalizePolymarketLiveEventVolumeComposeState,
  normalizePolymarketLiveEventVolumeSheetLayout,
  projectEventMetadataRow,
  projectEventPrefixForMarketRow,
  splitLiveEventVolumeSelectedColumns,
  POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_ONE_SHEET,
  POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_PER_EVENT,
  POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_ONE_SHEET,
  POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_PER_EVENT,
} from "./liveEventVolumeCompose.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("normalize live event volume sheet layout defaults to one sheet", () => {
  assert.equal(normalizePolymarketLiveEventVolumeSheetLayout("nope"), POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_ONE_SHEET);
  assert.equal(
    normalizePolymarketLiveEventVolumeSheetLayout(POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_PER_EVENT),
    POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_PER_EVENT,
  );
  assert.equal(
    normalizePolymarketLiveEventVolumeSheetLayout(POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_ONE_SHEET),
    POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_ONE_SHEET,
  );
  assert.equal(
    normalizePolymarketLiveEventVolumeSheetLayout(POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_PER_EVENT),
    POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_PER_EVENT,
  );
});

test("layout helpers distinguish metadata and per-event sheets", () => {
  assert.equal(liveEventVolumeLayoutIncludesMetadata("one_sheet"), false);
  assert.equal(liveEventVolumeLayoutIncludesMetadata("meta_plus_one_sheet"), true);
  assert.equal(liveEventVolumeLayoutIsPerEvent("one_sheet"), false);
  assert.equal(liveEventVolumeLayoutIsPerEvent("sheet_per_event"), true);
  assert.equal(liveEventVolumeLayoutIsPerEvent("meta_plus_per_event"), true);
});

test("compose state keeps event filters and sheet layout", () => {
  const state = normalizePolymarketLiveEventVolumeComposeState({
    mode: "advanced",
    limit: 12,
    sheetLayout: "meta_plus_per_event",
    eventRefs: [{ id: "42", slug: "weather", title: "Weather" }],
  });
  assert.equal(state.mode, "advanced");
  assert.equal(state.limit, 12);
  assert.equal(state.sheetLayout, "meta_plus_per_event");
  assert.equal(state.eventRefs[0].id, "42");
});

test("projectEventMetadataRow keeps original event field names", () => {
  const row = projectEventMetadataRow(
    { id: "9", title: "Seoul weather", slug: "seoul-weather", tags: [{ slug: "weather" }] },
    ["id", "title", "tags"],
  );
  assert.equal(row.id, "9");
  assert.equal(row.title, "Seoul weather");
  assert.equal(typeof row.tags, "string");
  assert.equal(row.event_id, undefined);
});

test("projectEventPrefixForMarketRow prefixes event fields", () => {
  const row = projectEventPrefixForMarketRow({ id: "9", title: "Seoul weather" }, ["id", "title"]);
  assert.equal(row.event_id, "9");
  assert.equal(row.event_title, "Seoul weather");
  assert.equal(row.id, undefined);
});

test("expandLiveVolumeToMarketRows stamps event metadata and live total", () => {
  const rows = expandLiveVolumeToMarketRows(
    [{ total: 1200, markets: [{ market: "0xabc", value: 800 }, { market: "0xdef", value: 400 }] }],
    { id: "77", title: "Election", slug: "election" },
    { selectedColumns: ["id", "title", "live_total", "market", "market_value"] },
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].event_id, "77");
  assert.equal(rows[0].event_title, "Election");
  assert.equal(rows[0].live_total, 1200);
  assert.equal(rows[0].market, "0xabc");
  assert.equal(rows[0].market_value, 800);
  assert.equal(rows[1].market, "0xdef");
  assert.equal(rows[1].market_value, 400);
});

test("expandLiveVolumeToMarketRows keeps a stub row when markets are empty", () => {
  const rows = expandLiveVolumeToMarketRows(
    { total: 0, markets: [] },
    { id: "1", title: "Empty" },
    { selectedColumns: ["id", "live_total", "market", "market_value"] },
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].event_id, "1");
  assert.equal(rows[0].live_total, 0);
  assert.equal(rows[0].market, "");
  assert.equal(rows[0].market_value, "");
});

test("multi-event expansion groups independently", () => {
  const a = expandLiveVolumeToMarketRows(
    { total: 10, markets: [{ market: "0xaa", value: 10 }] },
    { id: "1", title: "A" },
    { selectedColumns: ["id", "title", "market", "market_value", "live_total"] },
  );
  const b = expandLiveVolumeToMarketRows(
    { total: 30, markets: [{ market: "0xbb", value: 12 }, { market: "0xcc", value: 18 }] },
    { id: "2", title: "B" },
    { selectedColumns: ["id", "title", "market", "market_value", "live_total"] },
  );
  const all = [...a, ...b];
  assert.equal(all.length, 3);
  assert.deepEqual(all.map((r) => r.event_id), ["1", "2", "2"]);
  assert.equal(all[0].live_total, 10);
  assert.equal(all[2].live_total, 30);
});

test("splitLiveEventVolumeSelectedColumns separates event vs live fields", () => {
  const split = splitLiveEventVolumeSelectedColumns(["id", "title", "live_total", "market"]);
  assert.deepEqual(split.eventColumns, ["id", "title"]);
  assert.deepEqual(split.liveColumns, ["live_total", "market"]);
});
