import { mcpOrigin, mcpResourceUrl } from "@/lib/mcp/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OAuth authorize entry: bounce to the interactive consent page with the same query string.
 * ChatGPT/Claude open this URL in a browser.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const next = new URL(`${mcpOrigin()}/mcp/authorize`);
  for (const [key, value] of url.searchParams.entries()) {
    next.searchParams.set(key, value);
  }
  if (!next.searchParams.get("resource")) {
    next.searchParams.set("resource", mcpResourceUrl());
  }
  return Response.redirect(next.toString(), 302);
}
