#!/usr/bin/env node
/**
 * Offline smoke: fused intent + gate + X format (no network).
 *   node scripts/x-jarvis-smoke.mjs
 */
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const intentMod = await import(pathToFileURL(path.join(root, "src/lib/mcp/research/intent.js")).href);
const gateMod = await import(pathToFileURL(path.join(root, "src/lib/mcp/research/gate.js")).href);
const formatMod = await import(pathToFileURL(path.join(root, "src/lib/mcp/research/formatX.js")).href);
const relMod = await import(pathToFileURL(path.join(root, "src/lib/mcp/research/relevance.js")).href);
const { parseResearchIntent } = intentMod;
const { gateResearchPack } = gateMod;
const { formatXReply } = formatMod;
const { relevanceScore } = relMod;

let failed = 0;
function check(ok, msg) {
  console.log(ok ? "ok" : "FAIL", msg);
  if (!ok) failed += 1;
}

const samples = [
  { text: "@lychee_data pulse", expect: "pulse" },
  { text: "@lychee_data holders on election", expect: "holders" },
  { text: "@lychee_data gap kalshi vs polymarket", expect: "gap" },
  { text: "@lychee_data dig into Trump", expect: "research" },
  { text: "@lychee_data is there a market for this", parent_text: "Fed cuts 25bp in December", expect: "market_for" },
  { text: "@lychee_data what markets is this affecting?", parent_text: "Breaking: oil pipeline explosion", expect: "news_impact" },
  {
    text: "@lychee_data is this accurate?",
    parent_text: "Smart money loaded YES on 0x24ded84d901a743cfee095f8082b0f9f647183cb",
    expect: "verify",
  },
  {
    text: "@lychee_data what you got for me on the above?",
    parent_text: "@lychee_data pulse — where is the smart money crowded?",
    expect: "market_for",
  },
];

for (const s of samples) {
  const intent = parseResearchIntent({ text: s.text, parent_text: s.parent_text || "", author_handle: "tester" });
  check(intent.mode === s.expect, `${s.text.slice(0, 48)} → ${intent.mode} (want ${s.expect})`);
}

check(relevanceScore("fed december rate cut", "Will the Fed cut 25 bps in December?") > 0.3, "relevance fed");
check(relevanceScore("smart money crowded", "Louisiana Ragin Cajuns vs UNCW") < 0.2, "relevance sports vs smart money");

const bad = gateResearchPack({
  intent: { mode: "market_for" },
  verdict: "listed",
  draft_reply: "condition_id ready for pull_market_bundle",
  markets: [{ venue: "polymarket", title: "Fed" }],
});
check(!bad.can_post, "gate blocks MCP jargon");

const x = formatXReply({
  intent: { mode: "market_for" },
  verdict: "listed",
  markets: [{ venue: "polymarket", title: "Fed cut Dec", yes_price: 0.64 }],
  take: "",
});
check(x.includes("Yes") && x.includes("lycheedata.com") && !x.includes("condition_id"), "x format clean");

const envMod = await import(pathToFileURL(path.join(root, "src/lib/mcp/xJarvis/xClient.js")).href);
console.log("env_status", JSON.stringify(envMod.xJarvisEnvStatus(), null, 2));
console.log(failed ? `SMOKE FAILED (${failed})` : "SMOKE OK");
process.exit(failed ? 1 : 0);
