import dbConnect from "@/lib/dbConnect";
import McpOAuthClient from "@/models/McpOAuthClient";
import McpOAuthCode from "@/models/McpOAuthCode";
import McpOAuthAccessToken from "@/models/McpOAuthAccessToken";
import {
  OAUTH_ACCESS_TTL_SEC,
  OAUTH_CODE_TTL_SEC,
  OAUTH_REFRESH_TTL_SEC,
  mcpResourceUrl,
} from "@/lib/mcp/config";
import { pkceChallengeS256, randomToken, sha256Hex } from "@/lib/mcp/crypto";

const ALLOWED_REDIRECT_HOSTS = new Set([
  "chatgpt.com",
  "chat.openai.com",
  "claude.ai",
  "www.claude.ai",
  "cursor.com",
  "www.cursor.com",
  "localhost",
  "127.0.0.1",
]);

export function isAllowedRedirectUri(uri) {
  try {
    const url = new URL(String(uri || ""));
    if (url.protocol === "http:" || url.protocol === "https:") {
      if (ALLOWED_REDIRECT_HOSTS.has(url.hostname)) return true;
      if (url.hostname.endsWith(".openai.com")) return true;
      if (url.hostname.endsWith(".claude.ai")) return true;
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
    }
    // Desktop / native clients
    if (url.protocol === "cursor:" || url.protocol === "vscode:" || url.protocol === "claude:") return true;
    return false;
  } catch {
    return false;
  }
}

export async function registerOAuthClient(body = {}) {
  await dbConnect();
  const redirect_uris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.map(String).filter(isAllowedRedirectUri)
    : [];
  if (!redirect_uris.length) {
    const err = new Error("redirect_uris required (https callback)");
    err.status = 400;
    throw err;
  }

  const client_id = body.client_id && String(body.client_id).startsWith("http")
    ? String(body.client_id).slice(0, 500)
    : `lychee_mcp_${randomToken(16)}`;

  const doc = {
    client_id,
    client_name: String(body.client_name || body.client_uri || "MCP client").slice(0, 200),
    redirect_uris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    client_uri: String(body.client_uri || "").slice(0, 500),
    metadata_url: String(body.client_id || "").startsWith("http") ? String(body.client_id).slice(0, 500) : "",
  };

  await McpOAuthClient.findOneAndUpdate(
    { client_id },
    { $set: doc },
    { upsert: true, new: true },
  );

  return {
    client_id,
    client_name: doc.client_name,
    redirect_uris,
    token_endpoint_auth_method: "none",
    grant_types: doc.grant_types,
    response_types: doc.response_types,
  };
}

export async function getOAuthClient(clientId) {
  await dbConnect();
  return McpOAuthClient.findOne({ client_id: String(clientId || "") }).lean();
}

export async function ensureClientAllowsRedirect(clientId, redirectUri) {
  let client = await getOAuthClient(clientId);
  if (!client && String(clientId || "").startsWith("http") && isAllowedRedirectUri(redirectUri)) {
    // Client ID Metadata Document style: accept and remember on first authorize.
    client = await McpOAuthClient.findOneAndUpdate(
      { client_id: String(clientId) },
      {
        $setOnInsert: {
          client_id: String(clientId),
          client_name: "CIMD client",
          redirect_uris: [String(redirectUri)],
          token_endpoint_auth_method: "none",
          metadata_url: String(clientId),
        },
        $addToSet: { redirect_uris: String(redirectUri) },
      },
      { upsert: true, new: true },
    ).lean();
  }
  if (!client) return null;
  if (!client.redirect_uris?.includes(String(redirectUri))) {
    if (!isAllowedRedirectUri(redirectUri)) return null;
    await McpOAuthClient.updateOne({ client_id: client.client_id }, { $addToSet: { redirect_uris: String(redirectUri) } });
  }
  return client;
}

export async function issueAuthorizationCode({
  clientId,
  userId,
  redirectUri,
  codeChallenge,
  codeChallengeMethod = "S256",
  resource = "",
  scope = "lychee",
}) {
  if (String(codeChallengeMethod || "S256").toUpperCase() !== "S256") {
    const err = new Error("Only S256 PKCE is supported");
    err.status = 400;
    throw err;
  }
  await dbConnect();
  const code = randomToken(32);
  await McpOAuthCode.create({
    code_hash: sha256Hex(code),
    client_id: String(clientId),
    user_id: String(userId),
    redirect_uri: String(redirectUri),
    code_challenge: String(codeChallenge),
    code_challenge_method: "S256",
    resource: String(resource || mcpResourceUrl()),
    scope: String(scope || "lychee"),
    expires_at: new Date(Date.now() + OAUTH_CODE_TTL_SEC * 1000),
  });
  return code;
}

async function issueTokenPair({ clientId, userId, resource, scope }) {
  const access = randomToken(32);
  const refresh = randomToken(32);
  const now = Date.now();
  await McpOAuthAccessToken.create({
    token_hash: sha256Hex(access),
    refresh_hash: sha256Hex(refresh),
    client_id: String(clientId),
    user_id: String(userId),
    resource: String(resource || mcpResourceUrl()),
    scope: String(scope || "lychee"),
    expires_at: new Date(now + OAUTH_ACCESS_TTL_SEC * 1000),
    refresh_expires_at: new Date(now + OAUTH_REFRESH_TTL_SEC * 1000),
  });
  return {
    access_token: access,
    refresh_token: refresh,
    token_type: "bearer",
    expires_in: OAUTH_ACCESS_TTL_SEC,
    scope: scope || "lychee",
  };
}

export async function exchangeAuthorizationCode({
  code,
  clientId,
  redirectUri,
  codeVerifier,
  resource = "",
}) {
  await dbConnect();
  const row = await McpOAuthCode.findOne({ code_hash: sha256Hex(code) });
  if (!row || row.consumed_at || row.expires_at.getTime() < Date.now()) {
    const err = new Error("Invalid or expired code");
    err.status = 400;
    throw err;
  }
  if (row.client_id !== String(clientId) || row.redirect_uri !== String(redirectUri)) {
    const err = new Error("client_id / redirect_uri mismatch");
    err.status = 400;
    throw err;
  }
  const expected = String(row.code_challenge || "");
  const actual = pkceChallengeS256(codeVerifier);
  if (expected !== actual) {
    const err = new Error("PKCE verification failed");
    err.status = 400;
    throw err;
  }

  row.consumed_at = new Date();
  await row.save();

  return issueTokenPair({
    clientId: row.client_id,
    userId: row.user_id,
    resource: resource || row.resource,
    scope: row.scope,
  });
}

export async function refreshAccessToken({ refreshToken, clientId }) {
  await dbConnect();
  const row = await McpOAuthAccessToken.findOne({
    refresh_hash: sha256Hex(refreshToken),
    revoked_at: null,
  });
  if (!row || !row.refresh_expires_at || row.refresh_expires_at.getTime() < Date.now()) {
    const err = new Error("Invalid refresh token");
    err.status = 400;
    throw err;
  }
  if (clientId && row.client_id !== String(clientId)) {
    const err = new Error("client_id mismatch");
    err.status = 400;
    throw err;
  }
  row.revoked_at = new Date();
  await row.save();
  return issueTokenPair({
    clientId: row.client_id,
    userId: row.user_id,
    resource: row.resource,
    scope: row.scope,
  });
}

export async function resolveOAuthActor(token) {
  if (!token || String(token).startsWith("lychee_pat_")) return null;
  await dbConnect();
  const row = await McpOAuthAccessToken.findOne({
    token_hash: sha256Hex(token),
    revoked_at: null,
  }).lean();
  if (!row || row.expires_at.getTime() < Date.now()) return null;
  await McpOAuthAccessToken.updateOne({ _id: row._id }, { $set: { last_used_at: new Date() } });
  return {
    userId: String(row.user_id),
    authKind: "oauth",
    clientId: String(row.client_id),
  };
}

export async function revokeToken(token) {
  if (!token) return;
  await dbConnect();
  const hash = sha256Hex(token);
  await McpOAuthAccessToken.updateMany(
    { $or: [{ token_hash: hash }, { refresh_hash: hash }] },
    { $set: { revoked_at: new Date() } },
  );
}
