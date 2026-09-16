import assert from "node:assert/strict";

import { validateDashboardPublishSeo } from "./dashboardPublishSeo.js";
import {
  applyComparePairToDraft,
  applyComparePairToLayout,
  createKalshiPolymarketCompareLayout,
  isKalshiPolymarketCompareLayout,
  KALSHI_POLYMARKET_COMPARE_DEFAULT_NAME,
  KALSHI_POLYMARKET_COMPARE_LAYOUT_KIND,
  readComparePairFromLayout,
  startKalshiPolymarketCompareDashboard,
} from "./kalshiPolymarketCompareDashboard.js";
import { CONNECT_HOME_CENTER_VIEW } from "./connectHomeFlow.js";

{
  const layout = createKalshiPolymarketCompareLayout(null);
  assert.equal(layout.kind, KALSHI_POLYMARKET_COMPARE_LAYOUT_KIND);
  assert.equal(isKalshiPolymarketCompareLayout(layout), true);
  assert.equal(readComparePairFromLayout(layout), null);
  assert.equal(layout.rows.length, 1);
  assert.equal(layout.rows[0].type, "text");
  assert.match(layout.rows[0].body, /Kalshi vs Polymarket/);
}

{
  const pair = {
    kalshiTicker: "KXFED-26",
    kalshiTitle: "Fed hike",
    polyMarket: { id: "poly-1", title: "Fed hike" },
    polyTitle: "Fed hike Poly",
    childSide: "yes",
    matchFromKalshi: false,
  };
  const layout = createKalshiPolymarketCompareLayout(pair);
  assert.deepEqual(readComparePairFromLayout(layout), pair);
  assert.match(layout.rows[0].body, /Fed hike/);
}

{
  const pair = {
    kalshiTicker: "TICK",
    kalshiTitle: "Kalshi market",
    polyMarket: { id: "p" },
    polyTitle: "Poly market",
    childSide: "yes",
    matchFromKalshi: true,
  };
  const withExtra = applyComparePairToLayout(
    {
      kind: KALSHI_POLYMARKET_COMPARE_LAYOUT_KIND,
      rows: [
        { id: "kalshi-poly-compare-narrative", type: "text", body: "old" },
        { id: "chart-row", type: "cards", columns: [{ id: "c1", chart_id: "abc" }] },
      ],
    },
    pair,
  );
  assert.equal(withExtra.rows.length, 2);
  assert.equal(withExtra.rows[1].id, "chart-row");
  assert.equal(withExtra.compare.pair.kalshiTicker, "TICK");
}

{
  const draft = applyComparePairToDraft(
    {
      dashboard_name: KALSHI_POLYMARKET_COMPARE_DEFAULT_NAME,
      page_heading: KALSHI_POLYMARKET_COMPARE_DEFAULT_NAME,
      page_subheading: "Live odds comparison dashboard.",
    },
    {
      kalshiTicker: "A",
      kalshiTitle: "Alpha",
      polyMarket: { id: "b" },
      polyTitle: "Beta",
      childSide: "yes",
      matchFromKalshi: false,
    },
  );
  assert.equal(draft.dashboard_name, "Alpha vs Beta");
  assert.equal(draft.page_heading, "Alpha vs Beta");
  assert.match(draft.page_subheading, /Alpha/);
}

{
  const layout = createKalshiPolymarketCompareLayout(null);
  assert.equal(
    validateDashboardPublishSeo({
      layout,
      page_heading: "Kalshi vs Polymarket",
      page_subheading: "Live odds comparison dashboard.",
    }),
    null,
  );
}

{
  const calls = [];
  startKalshiPolymarketCompareDashboard({
    requestConnectWorkspace: (id, options) => calls.push(["workspace", id, options]),
    setConnectHomeAnalyzeActive: (v) => calls.push(["analyze", v]),
    setConnectHomeCenterView: (v) => calls.push(["view", v]),
    setRightPanelTab: (v) => calls.push(["tab", v]),
    setRightPanelOpen: (v) => calls.push(["panel", v]),
    setActiveChartDashboardId: (v) => calls.push(["active", v]),
    setChartDashboardDraft: (v) => calls.push(["draft", v.layout.kind, v.dashboard_name]),
    requestConnectAnalyzeScroll: () => calls.push(["scroll"]),
    providerValue: { setPolymarketLiveDashboardActive: (v) => calls.push(["polyLive", v]) },
  });
  assert.deepEqual(
    calls.filter((c) => c[0] === "workspace")[0].slice(0, 2),
    ["workspace", "blank"],
  );
  assert.equal(calls.some((c) => c[0] === "view" && c[1] === CONNECT_HOME_CENTER_VIEW.DASHBOARD), true);
  assert.equal(calls.some((c) => c[0] === "draft" && c[1] === KALSHI_POLYMARKET_COMPARE_LAYOUT_KIND), true);
  assert.equal(calls.some((c) => c[0] === "polyLive" && c[1] === false), true);
}

{
  const calls = [];
  startKalshiPolymarketCompareDashboard({
    connectWorkspace: "kalshiLive",
    requestConnectWorkspace: () => calls.push("workspace"),
    setConnectHomeCenterView: (v) => calls.push(v),
    setChartDashboardDraft: () => {},
  });
  assert.equal(calls.includes("workspace"), false);
  assert.equal(calls.includes(CONNECT_HOME_CENTER_VIEW.DASHBOARD), true);
}
