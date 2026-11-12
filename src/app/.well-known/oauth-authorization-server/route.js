import { mcpOAuthPaths, mcpOrigin } from "@/lib/mcp/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const paths = mcpOAuthPaths();
  return Response.json({
    issuer: mcpOrigin(),
    authorization_endpoint: paths.authorization_endpoint,
    token_endpoint: paths.token_endpoint,
    registration_endpoint: paths.registration_endpoint,
    revocation_endpoint: paths.revocation_endpoint,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["lychee"],
    service_documentation: `${mcpOrigin()}/mcp`,
  });
}
