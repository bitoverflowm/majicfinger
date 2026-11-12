import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createLycheeMcpServer } from "@/lib/mcp/createServer";
import { resolveMcpActor } from "@/lib/mcp/auth/resolveActor";
import { mcpProtectedResourceMetadataUrl, mcpResourceUrl } from "@/lib/mcp/config";

function corsHeaders(request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id",
    "Access-Control-Expose-Headers": "Mcp-Session-Id, WWW-Authenticate",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function unauthorizedMcpResponse(request) {
  const metadataUrl = mcpProtectedResourceMetadataUrl();
  return Response.json(
    { error: "unauthorized", message: "Sign in to Lychee MCP via OAuth, or use a personal access token." },
    {
      status: 401,
      headers: {
        ...corsHeaders(request),
        "WWW-Authenticate": `Bearer realm="lychee-mcp", resource_metadata="${metadataUrl}"`,
      },
    },
  );
}

export async function handleMcpHttp(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (!["GET", "POST", "DELETE"].includes(request.method)) {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders(request) });
  }

  const actor = await resolveMcpActor(request);
  if (!actor) return unauthorizedMcpResponse(request);

  const server = createLycheeMcpServer(actor);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  const headers = new Headers(response.headers);
  const extra = corsHeaders(request);
  for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  headers.set("X-Lychee-MCP-Resource", mcpResourceUrl());
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
