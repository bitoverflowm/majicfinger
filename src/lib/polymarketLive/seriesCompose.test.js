import assert from "node:assert/strict";

import { buildPolymarketSeriesListQueryValues } from "./seriesCompose.js";
import { extractPolymarketSeriesPayload } from "./polymarketSeriesPull.js";

{
  const values = buildPolymarketSeriesListQueryValues({
    limit: 50,
    offset: 10,
    orderFields: ["volume", "startDate"],
    ascending: true,
    slugs: ["election-2028"],
    categoryIds: ["1", "2"],
    categoryLabels: ["Politics"],
    recurrence: "annual",
    includeChat: true,
    closed: false,
    excludeEvents: true,
  });
  assert.deepEqual(values, {
    limit: "50",
    offset: "10",
    order: "volume,startDate",
    ascending: "true",
    slug: "election-2028",
    categories_ids: "1,2",
    categories_labels: "Politics",
    recurrence: "annual",
    include_chat: "true",
    closed: "false",
    exclude_events: "true",
  });
  console.log("ok series list query values serialize");
}

{
  const extracted = extractPolymarketSeriesPayload(
    {
      id: "7",
      title: "2028 Democratic nomination",
      slug: "dem-2028",
      events: [
        {
          id: "event-1",
          title: "Will Gavin Newsom win?",
          slug: "gavin",
          markets: [{ id: "market-1", question: "Yes?", slug: "gavin-yes", volume: 123 }],
        },
      ],
    },
    {
      sheetLayout: "series_events_and_markets",
      selectedColumns: [
        "series:id",
        "series:title",
        "event:id",
        "event:title",
        "market:id",
        "market:question",
        "market:event_title",
      ],
    },
  );
  assert.deepEqual(extracted.seriesRow, { id: "7", title: "2028 Democratic nomination" });
  assert.deepEqual(extracted.eventRows, [{ id: "event-1", title: "Will Gavin Newsom win?" }]);
  assert.deepEqual(extracted.marketSheets[0]?.rows, [
    { id: "market-1", question: "Yes?", event_title: "Will Gavin Newsom win?" },
  ]);
  console.log("ok series extraction splits series events and markets");
}

