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
const { compactSearchQuery, relevanceScore } = relMod;

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
    text: "@lychee_data which markets does this impact?",
    parent_text:
      "An internal post urging the board to consider employee sentiment about Nvidia’s former CEO has drawn more than 1,600 comments, the majority in full support of reinstalling him.",
    expect: "news_impact",
  },
  {
    text: "@lychee_data this headline is talking about reinstating Nividia's CEO. your response has nothing to do with that.",
    parent_text:
      "An internal post urging the board to consider employee sentiment about Nvidia’s former CEO has drawn more than 1,600 comments, the majority in full support of reinstalling him.",
    expect: "news_impact",
  },
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

const nvidiaHeadline =
  "An internal post urging the board to consider employee sentiment about Nvidia’s former CEO has drawn more than 1,600 comments, the majority in full support of reinstalling him.";
check(relevanceScore(nvidiaHeadline, "Which Millennium Prize Problem will be solved next?") < 0.12, "nvidia vs millennium");
check(relevanceScore(nvidiaHeadline, "Will Elon Musk visit Mars in his lifetime?") < 0.12, "nvidia vs mars");
check(relevanceScore(nvidiaHeadline, "Who will be the next Secretary General of NATO?") < 0.12, "nvidia vs nato");
check(relevanceScore(nvidiaHeadline, "Will Jensen Huang remain CEO of Nvidia through 2026?") > 0.32, "nvidia vs nvidia CEO book");
check(relevanceScore(nvidiaHeadline, "Nvidia CEO: will Jensen return?") > 0.32, "nvidia vs short CEO title");
check(
  relevanceScore("which markets does this impact?", "Which Millennium Prize Problem will be solved next?") < 0.2,
  "interrogative which ≠ millennium",
);
check(/nvidia/i.test(compactSearchQuery(nvidiaHeadline)), "compact search keeps Nvidia");
check(!/which markets/i.test(compactSearchQuery("which markets does this impact?")), "compact search drops interrogative");

const nvidiaIntent = parseResearchIntent({
  text: "@lychee_data which markets does this impact?",
  parent_text: nvidiaHeadline,
});
check(/nvidia/i.test(nvidiaIntent.subject.query || ""), "impact-ask uses parent headline as query");
check(!/which markets does this impact/i.test(nvidiaIntent.subject.query || ""), "impact-ask does not search the mention");

const noneReply = formatXReply({
  intent: { mode: "news_impact" },
  verdict: "none",
  markets: [],
  take: "",
});
check(/No listed/i.test(noneReply) && !/Millennium|Mars|NATO/i.test(noneReply), "news_impact none does not name junk books");

const junkGate = gateResearchPack({
  intent: { mode: "news_impact" },
  verdict: "listed",
  draft_reply: "Markets this news can hit (2 listed):\nKalshi · Will Elon Musk visit Mars in his lifetime?",
  markets: [{ venue: "kalshi", title: "Will Elon Musk visit Mars in his lifetime?", relevance: 0 }],
});
check(!junkGate.can_post, "gate blocks zero-relevance news_impact books");

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
