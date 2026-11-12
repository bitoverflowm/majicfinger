/**
 * Offline unit smoke for MCP helpers (no Mongo / no Next).
 *   npm run test:mcp-unit
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { flattenPolymarketHoldersV2 } from "../src/lib/mcp/data/holdersFlatten.js";
import { analyzeHolders, analyzeTape } from "../src/lib/mcp/data/stats.js";
import { guidancePreamble } from "../src/lib/mcp/toolResult.js";
import { getFlowsCatalog, findDataset, findFlow } from "../src/lib/mcp/data/flowsCatalog.js";

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
assert.ok(catalog.datasets.some((d) => d.id === "polymarket.holders" && d.status === "live"));
assert.equal(findDataset("polymarket.prices")?.chart_view, "price");
assert.ok(findFlow("trader_deep_dive")?.tools.includes("preview_trader"));
assert.ok(catalog.best_practices.length >= 5);

console.log("mcp-smoke-unit: ok");
