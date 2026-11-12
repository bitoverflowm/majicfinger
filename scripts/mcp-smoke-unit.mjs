/**
 * Offline unit smoke for MCP helpers (no Mongo).
 *   node scripts/mcp-smoke-unit.mjs
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function pkceChallengeS256(verifier) {
  return crypto.createHash("sha256").update(String(verifier)).digest("base64url");
}

const COSTS = {
  orient: 1,
  sample: 8,
  compose: 4,
  publish: 6,
  materialize_base: 80,
  materialize_per_1k_rows: 25,
};

function quoteCredits(actionClass, { rows = 0 } = {}) {
  const cls = String(actionClass || "").toLowerCase();
  if (cls === "orient") return COSTS.orient;
  if (cls === "sample") return COSTS.sample;
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
assert.equal(quoteCredits("materialize", { rows: 5000 }), 80 + 5 * 25);
assert.ok(String(pkceChallengeS256("verifier")).length > 20);
assert.equal(sha256Hex("a").length, 64);
console.log("mcp-smoke-unit: ok");
