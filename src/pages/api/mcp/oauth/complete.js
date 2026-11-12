import { getLoginSession } from "@/lib/auth";
import { ensureClientAllowsRedirect, issueAuthorizationCode } from "@/lib/mcp/auth/oauth";
import { mcpResourceUrl } from "@/lib/mcp/config";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  let session;
  try {
    session = await getLoginSession(req);
  } catch {
    session = null;
  }
  if (!session?.userId) return res.status(401).json({ success: false, message: "Sign in first" });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const clientId = String(body.client_id || "").trim();
  const redirectUri = String(body.redirect_uri || "").trim();
  const codeChallenge = String(body.code_challenge || "").trim();
  const state = String(body.state || "");
  const resource = String(body.resource || mcpResourceUrl());
  const scope = String(body.scope || "lychee");

  if (!clientId || !redirectUri || !codeChallenge) {
    return res.status(400).json({ success: false, message: "Missing OAuth parameters" });
  }

  const client = await ensureClientAllowsRedirect(clientId, redirectUri);
  if (!client) return res.status(400).json({ success: false, message: "Unknown client or redirect_uri" });

  try {
    const code = await issueAuthorizationCode({
      clientId,
      userId: session.userId,
      redirectUri,
      codeChallenge,
      resource,
      scope,
    });
    const target = new URL(redirectUri);
    target.searchParams.set("code", code);
    if (state) target.searchParams.set("state", state);
    return res.status(200).json({ success: true, redirect_to: target.toString() });
  } catch (err) {
    return res.status(err?.status || 400).json({ success: false, message: err?.message || "Authorize failed" });
  }
}
