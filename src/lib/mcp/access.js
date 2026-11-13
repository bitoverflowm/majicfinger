import { isDevLoginBypassUser } from "@/lib/devLoginBypass";
import { userHasDashboardAccess } from "@/lib/membershipAccess";
import { isOwnerFullAccessUser } from "@/lib/ownerFullAccess";

function metadata(user) {
  const raw = user?.metadata;
  if (raw && typeof raw === "object") return raw;
  return {};
}

/** One-time $49 MCP / Jarvis preregistration (Stripe mcp_prereg). */
export function userHasMcpPrereg(user) {
  if (!user) return false;
  if (user.mcp_prereg === true) return true;
  const stamp = metadata(user).mcp_prereg_paid_at;
  return Boolean(stamp);
}

/**
 * MCP docs + console: paying subscription / lifetime / owner, or MCP prereg.
 * Free signed-in users are blocked.
 */
export function mcpDocAccess(user) {
  if (!user) return { ok: false, reason: "signed_out", skipPrereg: false };
  if (isOwnerFullAccessUser(user) || isDevLoginBypassUser(user)) {
    return { ok: true, reason: "owner", skipPrereg: true };
  }
  if (userHasDashboardAccess(user)) {
    return { ok: true, reason: "subscription", skipPrereg: true };
  }
  if (userHasMcpPrereg(user)) {
    return { ok: true, reason: "prereg", skipPrereg: false };
  }
  return { ok: false, reason: "none", skipPrereg: false };
}

export function userCanAccessMcpDocs(user) {
  return mcpDocAccess(user).ok;
}

/** Recurring members already get monthly MCP credits — they should not buy prereg. */
export function userShouldSkipMcpPrereg(user) {
  return mcpDocAccess(user).skipPrereg;
}

export const MCP_DOCS_FORBIDDEN = "MCP_DOCS_FORBIDDEN";
export const SUBSCRIBER_SKIP_PREREG = "SUBSCRIBER_SKIP_PREREG";

export const MCP_DOCS_FORBIDDEN_MESSAGE =
  "MCP docs are for paying Lychee subscribers and people who preregistered for MCP.";

export const SUBSCRIBER_SKIP_PREREG_MESSAGE =
  "You're already on a Lychee subscription. Monthly MCP tokens are accruing now, and you'll have Jarvis as soon as it launches. No need to preregister.";
