import { revokeToken } from "@/lib/mcp/auth/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const contentType = request.headers.get("content-type") || "";
  let token = "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    token = body.token || body.access_token || "";
  } else {
    const text = await request.text();
    const params = new URLSearchParams(text);
    token = params.get("token") || "";
  }
  await revokeToken(token);
  return new Response(null, { status: 200 });
}
