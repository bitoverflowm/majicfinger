import { exchangeAuthorizationCode, refreshAccessToken } from "@/lib/mcp/auth/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readBody(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return request.json().catch(() => ({}));
  }
  const text = await request.text();
  const params = new URLSearchParams(text);
  const out = {};
  for (const [key, value] of params.entries()) out[key] = value;
  return out;
}

export async function POST(request) {
  try {
    const body = await readBody(request);
    const grant = String(body.grant_type || "");
    if (grant === "authorization_code") {
      const token = await exchangeAuthorizationCode({
        code: body.code,
        clientId: body.client_id,
        redirectUri: body.redirect_uri,
        codeVerifier: body.code_verifier,
        resource: body.resource,
      });
      return Response.json(token);
    }
    if (grant === "refresh_token") {
      const token = await refreshAccessToken({
        refreshToken: body.refresh_token,
        clientId: body.client_id,
      });
      return Response.json(token);
    }
    return Response.json(
      { error: "unsupported_grant_type", error_description: "Use authorization_code or refresh_token" },
      { status: 400 },
    );
  } catch (err) {
    return Response.json(
      { error: "invalid_grant", error_description: err?.message || "Token exchange failed" },
      { status: err?.status || 400 },
    );
  }
}
