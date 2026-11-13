#!/usr/bin/env node
/**
 * Ask Jarvis something about a tweet and print only the reply a user would see.
 *
 *   npm run jarvis:ask -- --tweet "Fed is cutting again in December" --ask "is there a market for this?"
 *   npm run jarvis:ask -- --ask "what's hot right now?"
 *   npm run jarvis:ask -- --tweet "…" --ask "…" --debug     # also prints how Jarvis got there (stderr)
 *
 * Runs the same research engine as MCP and X (`runResearchPack`) in-process; no dev server needed.
 */
import { parseArgs } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local"), quiet: true });
dotenv.config({ path: path.join(root, ".env"), quiet: true });

const { values } = parseArgs({
  options: {
    tweet: { type: "string", short: "t", default: "" },
    ask: { type: "string", short: "a", default: "" },
    debug: { type: "boolean", short: "d", default: false },
    registered: { type: "boolean", short: "r", default: false },
  },
});

const ask = values.ask.trim();
if (!ask) {
  console.error(
    'Usage: npm run jarvis:ask -- --tweet "<tweet text>" --ask "<what you want to know>" [--debug] [--registered]',
  );
  process.exit(1);
}

const { runResearchPack } = await import("@/lib/mcp/research/pack.js");
const started = Date.now();
const pack = await runResearchPack({
  text: /@lychee_data/i.test(ask) ? ask : `@lychee_data ${ask}`,
  parent_text: values.tweet.trim(),
  author_handle: "jarvis_ask",
  asker_registered: values.registered,
});

console.log(pack.draft_reply || pack.x_reply || "(no reply)");

if (values.debug) {
  const cents = (p) => (p == null ? "–" : `${Math.round(p > 1.5 ? p : p * 100)}¢`);
  const llm = pack.llm || {};
  const lines = [
    "",
    `── how Jarvis got there (${Date.now() - started}ms) ──`,
    `model: ${llm.on ? llm.model : "off (set JARVIS_LLM_API_KEY)"}   writer: ${llm.writer || "template"}`,
    `mode: ${pack.intent?.mode}   verdict: ${pack.verdict}   status: ${pack.status}`,
    pack.intent?.subject?.summary ? `subject: ${pack.intent.subject.summary}` : null,
    `search: ${JSON.stringify(pack.intent?.subject?.queries || [pack.intent?.subject?.query || ""])}`,
    ...(pack.markets || []).map(
      (m) =>
        `  market  ${m.venue.padEnd(10)} ${m.match || `rel ${(m.relevance ?? 0).toFixed(2)}`}  ${cents(m.yes_price)}  ${m.title}` +
        (m.match_reason ? `  (${m.match_reason})` : ""),
    ),
    llm.picks ? `picked ${llm.picks.filter((p) => p.verdict !== "unrelated").length}/${llm.picks.length} candidates:` : null,
    ...(llm.picks || []).map(
      (p) => `  ${p.verdict.padEnd(9)} ${String(p.venue).padEnd(10)} ${p.title}  — ${p.reason}`,
    ),
    llm.second_search
      ? `second search: ${JSON.stringify(llm.second_search.queries)} → ${llm.second_search.new_candidates} new candidates`
      : null,
    pack.whale_line ? `holders (${pack.whale_market}): ${pack.whale_line}` : null,
    ...(pack.news || []).map((n) => `  news    ${n.title} (${n.source || "?"})`),
    llm.writer === "template" && llm.model_draft ? `model draft (rejected): ${llm.model_draft}` : null,
    ...(llm.issues || []).map((issue) => `issue: ${issue}`),
    ...(pack.lookalikes || []).map((m) => `  lookalike ${m.venue.padEnd(8)} ${cents(m.yes_price)}  ${m.title}`),
    ...(pack.pulse_alerts || []).map((a) => `  alert   ${a.headline}`),
    pack.take ? `take: ${pack.take}` : null,
    pack.gate && !pack.gate.can_post ? `gate blocked: ${JSON.stringify(pack.gate.reasons || pack.gate)}` : null,
  ].filter((line) => line != null);
  console.error(lines.join("\n"));
}
