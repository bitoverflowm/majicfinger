import { getSiteUrl } from "@/lib/site";

/** MCP resource path on this Next app (stateless Streamable HTTP). */
export const MCP_RESOURCE_PATH = "/api/mcp";

export function mcpOrigin() {
  const override = String(process.env.MCP_PUBLIC_ORIGIN || "").trim().replace(/\/$/, "");
  if (override) return override;
  return getSiteUrl();
}

export function mcpResourceUrl() {
  return `${mcpOrigin()}${MCP_RESOURCE_PATH}`;
}

export function mcpProtectedResourceMetadataUrl() {
  return `${mcpOrigin()}/.well-known/oauth-protected-resource${MCP_RESOURCE_PATH}`;
}

export function mcpAuthorizationServerMetadataUrl() {
  return `${mcpOrigin()}/.well-known/oauth-authorization-server`;
}

export function mcpOAuthPaths() {
  const origin = mcpOrigin();
  return {
    authorization_endpoint: `${origin}/api/mcp/oauth/authorize`,
    token_endpoint: `${origin}/api/mcp/oauth/token`,
    registration_endpoint: `${origin}/api/mcp/oauth/register`,
    revocation_endpoint: `${origin}/api/mcp/oauth/revoke`,
  };
}

/** Placeholder allotments — tune after private testing. */
export const MCP_TIER_MONTHLY_CREDITS = {
  free: 100,
  basic: 1500,
  lite: 2000,
  pro: 8000,
  researcher: 10000,
  elite: 25000,
  quant: 50000,
};

/** Relative costs by action class (research-partner ladder). */
export const MCP_CREDIT_COSTS = {
  orient: 1,
  sample: 8,
  analyze: 15,
  compose: 4,
  publish: 6,
  materialize_base: 80,
  materialize_per_1k_rows: 25,
};

export const MCP_CONFIRM_CREDIT_THRESHOLD = 40;

export const MCP_ACTION_CLASSES = {
  publish: "publish",
  delete: "delete",
  materialize: "materialize",
  export: "export",
};

export const PAT_PREFIX = "lychee_pat_";
export const OAUTH_ACCESS_TTL_SEC = 60 * 60;
export const OAUTH_REFRESH_TTL_SEC = 60 * 60 * 24 * 30;
export const OAUTH_CODE_TTL_SEC = 60 * 10;
