#!/usr/bin/env node
/**
 * Local smoke for X Jarvis intent + env status (no network required for intent).
 * Usage: node scripts/x-jarvis-smoke.mjs
 */
import { createRequire } from "module";
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Intent is plain JS — load via dynamic import after rewriting aliases isn't needed;
// duplicate minimal checks by importing compiled-less relative paths.
async function loadIntent() {
  const mod = await import(pathToFileURL(path.join(root, "src/lib/mcp/xJarvis/intent.js")).href);
  return mod.parseMentionIntent;
}

async function loadEnvStatus() {
  // xClient imports twitter-api-v2 — fine if installed
  const mod = await import(pathToFileURL(path.join(root, "src/lib/mcp/xJarvis/xClient.js")).href);
  return mod.xJarvisEnvStatus;
}

const samples = [
  { text: "@lychee_data pulse", expect: "pulse" },
  { text: "@lychee_data holders on election", expect: "holders" },
  { text: "@lychee_data gap kalshi vs polymarket", expect: "gap" },
  { text: "@lychee_data dig into Trump", expect: "research" },
];

const parseMentionIntent = await loadIntent();
let failed = 0;
for (const s of samples) {
  const intent = parseMentionIntent({ text: s.text, author_handle: "tester" });
  const ok = intent.mode === s.expect;
  console.log(ok ? "ok" : "FAIL", s.text, "→", intent.mode, ok ? "" : `(expected ${s.expect})`);
  if (!ok) failed += 1;
}

const xJarvisEnvStatus = await loadEnvStatus();
const env = xJarvisEnvStatus();
console.log("env_status", JSON.stringify(env, null, 2));
console.log(
  failed
    ? `SMOKE FAILED (${failed})`
    : "SMOKE OK — wire TWITTER_* + X_JARVIS_LIVE=1 + X_JARVIS_CRON_SECRET on Vercel, then GET /api/x-jarvis/cron",
);
process.exit(failed ? 1 : 0);
