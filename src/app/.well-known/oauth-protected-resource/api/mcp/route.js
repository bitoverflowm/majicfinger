import { mcpAuthorizationServerMetadataUrl, mcpOrigin, mcpResourceUrl } from "@/lib/mcp/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    resource: mcpResourceUrl(),
    authorization_servers: [mcpOrigin()],
    bearer_methods_supported: ["header"],
    scopes_supported: ["lychee"],
    resource_documentation: `${mcpOrigin()}/mcp`,
    authorization_server_metadata: mcpAuthorizationServerMetadataUrl(),
  });
}
