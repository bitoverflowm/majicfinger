#!/usr/bin/env node
/**
 * End-to-end Jarvis mention path without Next/Mongo.
 * Simulates a tag → intent → research → draft reply (and optional live X post).
 *
 *   node --import ./scripts/register-alias.mjs ./scripts/x-jarvis-e2e-demo.mjs
 *   LIVE=1 node --import ./scripts/register-alias.mjs ./scripts/x-jarvis-e2e-demo.mjs
 *
 * LIVE=1 also requires TWITTER_* user OAuth + X_JARVIS_LIVE=1 and a real in_reply_to tweet id:
 *   REPLY_TO=<tweet_id> LIVE=1 ...
 */
import { runXJarvisJob } from "@/lib/mcp/xJarvis/runJob.js";
import { xJarvisEnvStatus } from "@/lib/mcp/xJarvis/xClient.js";

const text = process.env.MENTION_TEXT || "@lychee_data pulse — what's hot on Polymarket right now?";
const parent_text =
  process.env.PARENT_TEXT ||
  "Trump vs Harris election markets heating up ahead of the debate";
const author_handle = process.env.AUTHOR || "e2e_demo";
const wantLive = process.env.LIVE === "1";
const replyTo = String(process.env.REPLY_TO || "").trim();

const env = xJarvisEnvStatus();
console.log("env", {
  can_read_mentions: env.can_read_mentions,
  can_post_replies: env.can_post_replies,
  live_flag: env.live_flag,
  username: env.username,
});

console.log("\n— mention —");
console.log(`@${author_handle}: ${text}`);
if (parent_text) console.log(`(parent) ${parent_text}`);

const packed = await runXJarvisJob({
  text,
  parent_text,
  author_handle,
  deliver_default: "public_reply",
  live: wantLive,
});

console.log("\n— intent —");
console.log(JSON.stringify(packed.intent, null, 2));
console.log("\n— draft_reply —");
console.log(packed.draft_reply || "(empty)");
console.log("\n— status —", packed.status);

if (wantLive && replyTo && packed.draft_reply && packed.status !== "needs_clarification") {
  process.env.X_JARVIS_LIVE = process.env.X_JARVIS_LIVE || "1";
  const { postPublicReply } = await import("@/lib/mcp/xJarvis/deliver.js");
  const posted = await postPublicReply({
    in_reply_to_tweet_id: replyTo,
    text: packed.draft_reply,
  });
  console.log("\n— posted —", posted);
} else if (wantLive) {
  console.log("\n(skip post) set REPLY_TO=<tweet_id> and Twitter user OAuth to post live");
}

console.log("\nE2E demo complete.");
