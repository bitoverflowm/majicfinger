#!/usr/bin/env node
/**
 * Local dry-run for @lychee_news X threads.
 *
 *   node --import ./scripts/register-alias.mjs ./scripts/x-news-dry-run.mjs
 *   NEWS_PULSE_DEMO=1 node --import ./scripts/register-alias.mjs ./scripts/x-news-dry-run.mjs
 *   node --import ./scripts/register-alias.mjs ./scripts/x-news-dry-run.mjs --limit 3
 *
 * Never posts. Live create-tweet stays gated until LN-7 warmup unlock.
 */
import { buildLycheeNewsXPreview, dryRunDemoItems } from "@/lib/lycheeNews/pipeline.js";
import { xNewsEnvStatus } from "@/lib/lycheeNews/xClient.js";

const args = process.argv.slice(2);
let limit = 5;
let demo = process.env.NEWS_PULSE_DEMO === "1" || args.includes("--demo");
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--limit" && args[i + 1]) limit = Math.max(1, Number(args[++i]) || 5);
}

const env = xNewsEnvStatus();
console.log("=== lychee_news X dry-run ===");
console.log(
  JSON.stringify(
    {
      account: env.username,
      kill_switch: env.kill_switch,
      live_flag: env.live_flag,
      allow_lychee_news: env.allow_lychee_news,
      can_post: env.can_post,
      gate_reasons: env.gate_reasons,
    },
    null,
    2,
  ),
);

let preview;
if (demo) {
  const drafts = dryRunDemoItems({ limit });
  preview = {
    demo: true,
    dry_run: true,
    count: drafts.length,
    drafts,
    note: "Demo fixtures — no network, no create-tweet.",
  };
} else {
  preview = await buildLycheeNewsXPreview({ limit, live: false });
}

for (const draft of preview.drafts || []) {
  console.log("\n---", draft.id || "(no id)", "---");
  console.log("[main]");
  console.log(draft.thread?.main || "(empty)");
  for (const [i, reply] of (draft.thread?.replies || []).entries()) {
    console.log(`[reply ${i + 1}]`);
    console.log(reply);
  }
}

console.log(`\n${preview.count || 0} draft(s). dry_run=${preview.dry_run !== false}. No tweets posted.`);
