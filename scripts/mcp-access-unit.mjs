/**
 * Offline unit smoke for MCP docs / prereg gating (no Mongo).
 *   node --import ./scripts/register-alias.mjs scripts/mcp-access-unit.mjs
 */
import assert from "node:assert/strict";
import { mcpDocAccess, userShouldSkipMcpPrereg } from "../src/lib/mcp/access.js";

assert.equal(mcpDocAccess(null).ok, false);
assert.equal(mcpDocAccess({ email: "free@example.com" }).ok, false);
assert.equal(userShouldSkipMcpPrereg({ email: "free@example.com" }), false);

assert.deepEqual(mcpDocAccess({ mcp_prereg: true, email: "pre@example.com" }), {
  ok: true,
  reason: "prereg",
  skipPrereg: false,
});

assert.equal(
  mcpDocAccess({
    email: "sub@example.com",
    subscriptionStatus: "active",
    subscriptionTier: "lite",
  }).ok,
  true
);
assert.equal(
  userShouldSkipMcpPrereg({
    email: "sub@example.com",
    subscriptionStatus: "active",
    subscriptionTier: "lite",
  }),
  true
);

assert.equal(mcpDocAccess({ email: "life@example.com", lifetimeMember: true }).ok, true);
assert.equal(userShouldSkipMcpPrereg({ email: "life@example.com", lifetimeMember: true }), true);

assert.equal(
  mcpDocAccess({
    email: "ended@example.com",
    subscriptionStatus: "canceled",
    subscriptionTier: "pro",
  }).ok,
  false
);

console.log("mcp-access-unit: ok");
