import { mcpOrigin, mcpResourceUrl } from "@/lib/mcp/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fallback for clients that probe the site root instead of the nested MCP resource path. */
export async function GET() {
  return Response.json({
    resources: [mcpResourceUrl()],
    authorization_servers: [mcpOrigin()],
    bearer_methods_supported: ["header"],
    scopes_supported: ["lychee"],
  });
}
