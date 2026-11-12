/**
 * Offline unit smoke for MCP helpers (no Mongo / no Next).
 *   npm run test:mcp-unit
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { flattenPolymarketHoldersV2 } from "../src/lib/mcp/data/holdersFlatten.js";
import { analyzeCalibration, analyzeHolders, analyzeTape } from "../src/lib/mcp/data/stats.js";
import { guidancePreamble, textResult } from "../src/lib/mcp/toolResult.js";
import { getFlowsCatalog, findDataset, findFlow } from "../src/lib/mcp/data/flowsCatalog.js";
import { lycheeMcpInstructions } from "../src/lib/mcp/instructions.js";
import { buildOpenNowMarkdown, sharePayloadFromResult } from "../src/lib/mcp/shareLinks.js";
import {
  CRAZY_WORKFLOWS,
  findCrazyWorkflow,
  listCrazyWorkflows,
  pitchCrazyWorkflows,
} from "../src/lib/mcp/data/crazyWorkflows.js";

const COSTS = {
  orient: 1,
  sample: 8,
  analyze: 15,
  compose: 4,
  publish: 6,
  materialize_base: 80,
  materialize_per_1k_rows: 25,
};

function quoteCredits(actionClass, { rows = 0 } = {}) {
  const cls = String(actionClass || "").toLowerCase();
  if (cls === "orient") return COSTS.orient;
  if (cls === "sample") return COSTS.sample;
  if (cls === "analyze") return COSTS.analyze;
  if (cls === "compose") return COSTS.compose;
  if (cls === "publish") return COSTS.publish;
  if (cls === "materialize" || cls === "export") {
    const n = Math.max(0, Number(rows) || 0);
    return COSTS.materialize_base + Math.ceil(n / 1000) * COSTS.materialize_per_1k_rows;
  }
  return COSTS.sample;
}

assert.equal(quoteCredits("orient"), 1);
assert.equal(quoteCredits("sample"), 8);
assert.equal(quoteCredits("analyze"), 15);
assert.equal(quoteCredits("materialize", { rows: 5000 }), 80 + 5 * 25);
assert.ok(crypto.createHash("sha256").update("verifier").digest("base64url").length > 20);

const nestedV2 = {
  data: [
    {
      token_id: "tok-yes",
      holders: [
        { proxy_wallet: "0xyes1", name: "Alpha", amount: 100, outcome_index: 0 },
        { proxy_wallet: "0xyes2", amount: 40, outcome_index: 0 },
      ],
    },
    {
      token_id: "tok-no",
      holders: [{ proxyWallet: "0xno1", pseudonym: "Beta", amount: "55.5", outcomeIndex: 1 }],
    },
  ],
};
const flat = flattenPolymarketHoldersV2(nestedV2, { conditionId: "0xabc" });
assert.equal(flat.length, 3);
assert.equal(flat[0].outcome, "YES");
assert.equal(flat[2].outcome, "NO");
assert.equal(flat[2].proxy_wallet, "0xno1");
assert.equal(flat[2].amount, 55.5);
assert.equal(
  flat.every((r) => r.condition_id === "0xabc"),
  true,
);

assert.equal(flattenPolymarketHoldersV2({ data: [{ token_id: "t", holders: [] }] }).length, 0);

const analysis = analyzeHolders(flat, { marketTitle: "Test", yesPrice: 0.62, noPrice: 0.39 });
assert.ok(analysis.inferences.length >= 1);
assert.ok(analysis.trade_hypotheses.length >= 1);
assert.ok(analysis.risk_checklist.length >= 3);
assert.ok(analysis.yes.concentration);

const tape = analyzeTape([
  { side: "BUY", price: 0.61, size: 10 },
  { side: "BUY", price: 0.62, size: 12 },
  { side: "SELL", price: 0.5, size: 4 },
]);
assert.equal(tape.trade_count, 3);
assert.ok(tape.inferences.length >= 1);

const preamble = guidancePreamble();
assert.match(preamble.identity, /source-of-truth/);
assert.ok(preamble.hard_rules.some((r) => /Never scrape/i.test(r)));
assert.ok(preamble.compose_loop.some((s) => /pull_market_bundle|pull_and_compose/.test(s)));

const catalog = getFlowsCatalog();
assert.ok(catalog.flows.some((f) => f.id === "active_market_deep_dive" && f.status === "live"));
assert.ok(catalog.flows.some((f) => f.id === "cross_venue_gap" && f.status === "live"));
assert.ok(catalog.flows.some((f) => f.id === "recipe_holder_analysis" && f.status === "live"));
assert.ok(catalog.flows.some((f) => f.id === "calibration_postmortem" && f.status === "live"));
assert.ok(catalog.datasets.some((d) => d.id === "polymarket.holders" && d.status === "live"));
assert.equal(findDataset("polymarket.prices")?.chart_view, "price");
assert.ok(findFlow("trader_deep_dive")?.tools.includes("preview_trader"));
assert.ok(findFlow("cross_venue_gap")?.tools.includes("compare_venues"));
assert.ok(catalog.best_practices.length >= 5);

const cal = analyzeCalibration(
  [
    { forecast: 0.7, outcome_won: 1, label: "A" },
    { forecast: 0.7, outcome_won: 0, label: "B" },
    { forecast: 0.2, outcome_won: 0, label: "C" },
    { forecast: 0.9, outcome_won: 1, label: "D" },
  ],
  { bins: 5 },
);
assert.ok(cal.brier >= 0 && cal.brier <= 1);
assert.ok(cal.reliability.length >= 1);
assert.ok(cal.chart_rows.length >= 1);
assert.match(lycheeMcpInstructions(), /walkthrough/i);
assert.ok(guidancePreamble().walkthrough?.length >= 4);
assert.ok(guidancePreamble().compose_loop.some((s) => /list_realtime_feeds|get_realtime_snapshot/.test(s)));
assert.match(lycheeMcpInstructions(), /list_realtime_feeds/);

const share = sharePayloadFromResult({
  composed: { dashboard_url: "https://lycheedata.com/dashboard?workspace=abc", title: "Test mkt" },
  publication: {
    url: "https://lycheedata.com/alice/test-mkt",
    og_image_url: "https://lycheedata.com/alice/test-mkt/image?kind=og",
    title: "Test mkt",
  },
});
assert.ok(share.open_now_markdown.includes("](https://lycheedata.com/dashboard?workspace=abc)"));
assert.ok(share.open_now_markdown.includes("](https://lycheedata.com/alice/test-mkt)"));
assert.ok(share.open_now_markdown.includes("![Test mkt preview]("));
assert.equal(share.og_image_url, "https://lycheedata.com/alice/test-mkt/image?kind=og");
assert.match(buildOpenNowMarkdown({ dashboard_url: "https://x/y" }), /Open charts now/);

const led = textResult({ hello: 1 }, { share });
assert.ok(led.content[0].text.includes("Open charts now"));
assert.ok(led.content.some((c) => c.type === "resource_link" && c.name === "lychee-workspace"));
assert.ok(led.content.some((c) => c.type === "resource_link" && c.name === "lychee-preview"));

assert.ok(findFlow("bot_realtime_poll")?.tools.includes("get_realtime_snapshot"));
assert.ok(findFlow("bot_realtime_poll")?.tools.includes("list_realtime_feeds"));
assert.equal(findFlow("realtime_webhook_push")?.status, "next");
assert.ok(catalog.best_practices.some((p) => /get_realtime_snapshot/.test(p)));
assert.ok(catalog.best_practices.some((p) => /open_now_markdown|PASTE publication\.url/.test(p)));
assert.ok(catalog.best_practices.some((p) => /list_crazy_workflows/.test(p)));

assert.ok(CRAZY_WORKFLOWS.length >= 6);
assert.ok(findCrazyWorkflow("whale_war_room")?.prompt.includes("get_most_active_markets"));
assert.ok(findCrazyWorkflow("jarvis_always_on")?.tools.includes("jarvis_on"));
assert.equal(listCrazyWorkflows().count, CRAZY_WORKFLOWS.length);
assert.equal(pitchCrazyWorkflows(3).length, 3);
assert.equal(pitchCrazyWorkflows(3)[0].vibe, "Whale war room");
assert.match(lycheeMcpInstructions(), /list_crazy_workflows/);
assert.match(lycheeMcpInstructions(), /Jarvis mode/i);
assert.ok(guidancePreamble().walkthrough.some((s) => /Jarvis/i.test(s)));
assert.ok(findFlow("jarvis_proactive")?.tools.includes("jarvis_pulse"));

import {
  jarvisPowerUpImage,
  imageMarkdown,
  renderBarsSvg,
  renderLineSvg,
  snapshotForSheet,
  collectChartImages,
} from "../src/lib/mcp/chartSnapshots.js";

assert.ok(renderBarsSvg([{ name: "A", amount: 10 }, { name: "B", amount: 4 }])?.includes("<svg"));
assert.ok(
  renderLineSvg([
    { timestamp: "1", price: 0.2 },
    { timestamp: "2", price: 0.4 },
    { timestamp: "3", price: 0.3 },
  ])?.includes("path"),
);
const snap = snapshotForSheet({
  title: "Trades chart",
  chartView: "trade-price",
  rows: [
    { timestamp: "1", price: 0.1 },
    { timestamp: "2", price: 0.2 },
  ],
});
assert.ok(snap?.image?.data);
assert.equal(snap.image.mimeType, "image/svg+xml");
const powerImg = jarvisPowerUpImage();
assert.ok(powerImg.data.length > 20);
assert.ok(imageMarkdown(powerImg, "Jarvis powering up").includes("![Jarvis powering up]"));
const withCharts = textResult({
  composed: { dashboard_url: "https://lycheedata.com/dashboard?workspace=x" },
  chart_images: [snap],
});
assert.ok(withCharts.content.some((c) => c.type === "image"));
assert.ok(withCharts.content[0].text.includes("![Trades chart]"));
assert.equal(collectChartImages({ sheets: [{ chart_snapshot: snap }] }).length, 1);

console.log("mcp-smoke-unit: ok");
